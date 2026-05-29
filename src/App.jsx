import './index.css'
import { useState, useEffect} from 'react'
import { supabase } from './supabase'
import TopBar from './components/TopBar.jsx'
import SideBar from './components/SideBar.jsx'
import Page from './components/Page.jsx'

function App() {
  const [sideBar, setSideBar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notebooks, setNotebooks] = useState([])
  const [activeNotebookId, setActiveNotebookId] = useState(null)
  const [pages, setPages] = useState([])
  const [activePageId, setActivePageId] = useState(null)

  const currentNotebook = notebooks.find(notebook => notebook.id === activeNotebookId)
  const currentPage = pages.find(page => page.id === activePageId)
  // Only the pages that belong to the currently open notebook.
  const notebookPages = pages.filter(page => page.notebook_id === activeNotebookId)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: notebookData, error: notebookError } = await supabase.from('notebooks').select('*');
        if (notebookError) throw notebookError;

        const { data: pageData, error: pageError } = await supabase.from('pages').select('*');
        if (pageError) throw pageError;

        setNotebooks(notebookData)
        setPages(pageData)

        // Default to the first notebook and its first page.
        if (notebookData.length > 0) {
          const firstNotebookId = notebookData[0].id
          setActiveNotebookId(firstNotebookId)

          const firstPage = pageData.find(page => page.notebook_id === firstNotebookId)
          if (firstPage) {
            setActivePageId(firstPage.id)
          }
        }
      } catch (err) {
        console.error("Cloud load error:", err.message || err)
      } finally {
        // Always clear loading, even if a request failed, so we never get stuck.
        setLoading(false)
      }
    }

    loadData()
  }, []);

  useEffect(() => {
    if (!currentPage) return;

    const timerId = setTimeout(async () => {
      const { error } = await supabase
        .from('pages')
        .update({ content: currentPage.content })
        .eq('id', currentPage.id);

        if (error) {
          console.error("Cloud Auto-Save Error:", error.message);
        } else {
          console.log("Saved to cloud!"); // Optional: just to prove it works in your console
        }
    }, 1000);

    return () => {
      clearTimeout(timerId);
    };
  }, [currentPage?.content, currentPage?.id]);

  function handleSideBarToggle() {
    setSideBar(!sideBar)
  }

  function handleChangeNotebook(notebookId) {
    setActiveNotebookId(notebookId)
    // Open the notebook's first page (or none if it's empty).
    const firstPage = pages.find(page => page.notebook_id === notebookId)
    setActivePageId(firstPage ? firstPage.id : null)
  }

  async function handleCreateNotebook() {
    const { data, error } = await supabase
      .from('notebooks')
      .insert([{ title: "Untitled notebook" }])
      .select();

    if (error) {
      console.error("Cloud Error: ", error.message);
      return;
    }

    const newNotebook = data[0];

    setNotebooks([newNotebook, ...notebooks]);
    setActiveNotebookId(newNotebook.id);
    setActivePageId(null);
  }

  async function handleUpdateNotebookTitle(notebookId, newTitle) {
    const { error } = await supabase
      .from('notebooks')
      .update({ title: newTitle })
      .eq('id', notebookId);

    if (error) {
      console.error("Cloud Rename Error:", error.message);
      return;
    }

    setNotebooks(notebooks.map(notebook =>
      notebook.id === notebookId ? { ...notebook, title: newTitle } : notebook
    ))
  }

  async function handleDeleteNotebook(notebookId) {
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', notebookId);

    if (error) {
      console.error("Cloud Delete Error:", error.message);
      return;
    }

    const updatedNotebooks = notebooks.filter(notebook => notebook.id !== notebookId)
    // The DB cascade-deletes this notebook's pages; mirror that locally.
    const updatedPages = pages.filter(page => page.notebook_id !== notebookId)

    setNotebooks(updatedNotebooks)
    setPages(updatedPages)

    // If we deleted the open notebook, fall back to another one.
    if (activeNotebookId === notebookId) {
      const nextNotebook = updatedNotebooks[0]
      setActiveNotebookId(nextNotebook ? nextNotebook.id : null)

      const firstPage = nextNotebook
        ? updatedPages.find(page => page.notebook_id === nextNotebook.id)
        : null
      setActivePageId(firstPage ? firstPage.id : null)
    }
  }

  function handleUpdateCurrentPage(newContent) {
    const updatedPages = pages.map(page => {
      if (page.id === activePageId) {
        return {...page, content: newContent}
      }

      return page
    })

    setPages(updatedPages)
  }

  async function handleUpdateCurrentPageTitle(targetPageId, newTitle) {
    const { error } = await supabase
      .from('pages')
      .update({ title: newTitle })
      .eq('id', targetPageId);

    if (error) {
      console.error("Cloud Rename Error:", error.message);
      return;
    }

    const updatedPages = pages.map(page => {
      if (page.id === targetPageId) {
        return {...page, title: newTitle}
      }
      return page
    })

    setPages(updatedPages)
  }

  async function handleCreatePage() {
    const { data, error } = await supabase
      .from('pages')
      .insert([{ title: "Untitled page", content: "", notebook_id: activeNotebookId }])
      .select();
    
    if (error) {
      console.error("Cloud Error: ", error.message);
      return;
    }

    const newCloudPage = data[0];

    setPages([newCloudPage, ...pages]);
    setActivePageId(newCloudPage.id);
  }

  async function handleDeletePage(pageId) {
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      console.error("Cloud Delete Error:", error.message);
      return;
    }

    const updatedPages = pages.filter(page => page.id !== pageId)

    if (activePageId === pageId) {
      // Fall back to the next page in the same notebook, or none.
      const nextPage = updatedPages.find(page => page.notebook_id === activeNotebookId)
      setActivePageId(nextPage ? nextPage.id : null)
    }

    setPages(updatedPages)
  }

  return (
    <div className="app-container">
      <TopBar switchToggle={handleSideBarToggle} currentPage={currentPage}/>
      <div className="main-container">
        <SideBar
          isOpen={sideBar}
          notebooks={notebooks}
          activeNotebookId={activeNotebookId}
          currentNotebook={currentNotebook}
          changeNotebook={handleChangeNotebook}
          createNotebook={handleCreateNotebook}
          deleteNotebook={handleDeleteNotebook}
          updateNotebookTitle={handleUpdateNotebookTitle}
          pagesList={notebookPages}
          activePageId={activePageId}
          changePage={setActivePageId}
          createPage={handleCreatePage}
          deletePage={handleDeletePage}
          updatePageTitle={handleUpdateCurrentPageTitle}
        />
        {loading ? (
          <div className="loading-screen">Loading notes from cloud...</div>
        ) : notebooks.length === 0 ? (
          <div className="empty-state">
            <p>Create a notebook to get started</p>
            <button onClick={handleCreateNotebook}>New Notebook</button>
          </div>
        ) : notebookPages.length === 0 ? (
          <div className="empty-state">
            <p>Create a page to get started</p>
            <button onClick={handleCreatePage}>New Page</button>
          </div>
        ) : currentPage ? (
          <Page currentPage={currentPage} updatePage={handleUpdateCurrentPage}/>
        ) : null}
      </div>
    </div>
  )
}

export default App
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
        // Most-recently-edited first.
        const { data: notebookData, error: notebookError } = await supabase.from('notebooks').select('*').order('updated_at', { ascending: false });
        if (notebookError) throw notebookError;

        const { data: pageData, error: pageError } = await supabase.from('pages').select('*').order('updated_at', { ascending: false });
        if (pageError) throw pageError;

        setNotebooks(notebookData)
        setPages(pageData)

        // Restore the last-opened notebook + page (saved per-device in
        // localStorage), falling back to the first notebook and its first page.
        if (notebookData.length > 0) {
          const savedNotebookId = localStorage.getItem("activeNotebookId")
          const savedPageId = localStorage.getItem("activePageId")

          const notebookToOpen = notebookData.find(notebook => notebook.id === savedNotebookId) || notebookData[0]
          setActiveNotebookId(notebookToOpen.id)

          const pagesInNotebook = pageData.filter(page => page.notebook_id === notebookToOpen.id)
          const pageToOpen = pagesInNotebook.find(page => String(page.id) === savedPageId) || pagesInNotebook[0]
          if (pageToOpen) {
            setActivePageId(pageToOpen.id)
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

  // Remember the last-opened notebook + page on this device (per-browser).
  // Skip while loading, otherwise this runs on mount with null values and
  // wipes the saved ids before loadData can read them.
  useEffect(() => {
    if (loading) return
    if (activeNotebookId) localStorage.setItem("activeNotebookId", activeNotebookId)
    if (activePageId) localStorage.setItem("activePageId", activePageId)
    else localStorage.removeItem("activePageId")
  }, [activeNotebookId, activePageId, loading])

  // Close the side panel when clicking anywhere outside it (ignoring the
  // toggle button, which handles its own open/close).
  useEffect(() => {
    if (!sideBar) return

    function handleClickOutside(event) {
      if (event.target.closest('.side-bar-panel') || event.target.closest('.panel-toggle')) {
        return
      }
      setSideBar(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sideBar])

  useEffect(() => {
    if (!currentPage) return;

    const timerId = setTimeout(async () => {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('pages')
        .update({ content: currentPage.content, updated_at: now })
        .eq('id', currentPage.id);

      // Bump the page's notebook so it also rises to the top of the list.
      await supabase
        .from('notebooks')
        .update({ updated_at: now })
        .eq('id', currentPage.notebook_id);

      if (error) {
        console.error("Cloud Auto-Save Error:", error.message);
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
    // Update the content AND move this page to the front, so the most
    // recently edited page sits at the top of the list right away.
    const edited = pages.find(page => page.id === activePageId)
    if (!edited) return
    const others = pages.filter(page => page.id !== activePageId)
    setPages([{ ...edited, content: newContent }, ...others])

    // Bump the active notebook to the front too (skip if already first).
    setNotebooks(prev => {
      if (prev[0]?.id === activeNotebookId) return prev
      const active = prev.find(notebook => notebook.id === activeNotebookId)
      if (!active) return prev
      return [active, ...prev.filter(notebook => notebook.id !== activeNotebookId)]
    })
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
      <TopBar switchToggle={handleSideBarToggle} isOpen={sideBar} currentPage={currentPage}/>
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
          <div className="empty-state">
            <p>Loading notes from cloud...</p>
          </div>
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
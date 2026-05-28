import './index.css'
import { useState, useEffect} from 'react'
import { supabase } from './supabase'
import TopBar from './components/TopBar.jsx'
import SideBar from './components/SideBar.jsx'
import Page from './components/PageDemo.jsx'

function App() {
  const [sideBar, setSideBar] = useState(false)
  const [pages, setPages] = useState([])
  const [activePageId, setActivePageId] = useState(null)

  const currentPage = pages.find(page => page.id === activePageId)

  useEffect(() => {
    async function fetchPages() {
      const { data, error } = await supabase.from('pages').select('*');

      if (error) {
        console.error("Cloud Error:", error.message)
      } else {
        setPages(data)
        
        if (data.length > 0) {
          setActivePageId(data[0].id)
        }
      }
    }

    fetchPages()
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
      .insert([{ title: "Untitled page", content: "" }])
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
      if (updatedPages.length === 0) {
        setActivePageId(null);
        setPages([]);
        return;
      }
      setActivePageId(updatedPages[0].id);
    }

    setPages(updatedPages)
  }

  return (
    <div className="app-container">
      <TopBar switchToggle={handleSideBarToggle} currentPage={currentPage}/>
      <div className="main-container">
        {sideBar && <SideBar pagesList={pages} changePage={setActivePageId} createPage={handleCreatePage} deletePage={handleDeletePage} updatePageTitle={handleUpdateCurrentPageTitle}/>}
        {currentPage ? (
          <Page currentPage={currentPage} updatePage={handleUpdateCurrentPage}/>
        ) : (
          <div className="loading-screen">Loading notes from cloud...</div>
        )}
      </div>
      <h1>JotPad is alive.</h1>
    </div>
  )
}

export default App
import { useState, useEffect } from 'react'
import { Ellipsis, ArrowLeft, Notebook, StickyNotePlus } from 'lucide-react'

function SideBar(props) {
    const [view, setView] = useState("pages") // "notebooks" | "pages"
    const [openMenuId, setOpenMenuId] = useState(null)
    const [editId, setEditId] = useState(null)
    const [tempTitle, setTempTitle] = useState("")

    // Close an open three-dot menu when clicking anywhere outside it. Clicks on
    // a three-dot button or inside a dropdown are ignored, so those keep their
    // own toggle / option behavior.
    useEffect(() => {
        if (openMenuId === null) return
        function handleClickOutside(event) {
            if (event.target.closest('.page-dropdown-menu') || event.target.closest('.page-three-dot-menu')) return
            setOpenMenuId(null)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openMenuId])

    function startRename(id, currentTitle) {
        setOpenMenuId(null)
        setEditId(id)
        setTempTitle(currentTitle)
    }

    function commitPageRename(pageId) {
        props.updatePageTitle(pageId, tempTitle)
        setEditId(null)
    }

    function commitNotebookRename(notebookId) {
        props.updateNotebookTitle(notebookId, tempTitle)
        setEditId(null)
    }

    // Reset any open menu/rename when switching views.
    function goToNotebooks() {
        setOpenMenuId(null)
        setEditId(null)
        setView("notebooks")
    }

    function openNotebook(notebookId) {
        setOpenMenuId(null)
        setEditId(null)
        props.changeNotebook(notebookId)
        setView("pages")
    }

    // Split each list into always-visible items and hidden ones. Both keep the
    // list's existing recent-first order since they're carved from one array.
    const visibleNotebooks = props.notebooks.filter(notebook => !notebook.hidden)
    const hiddenNotebooks = props.notebooks.filter(notebook => notebook.hidden)
    const visiblePages = props.pagesList.filter(page => !page.hidden)
    const hiddenPages = props.pagesList.filter(page => page.hidden)

    // One row's markup, reused for both the visible and hidden groups. The
    // three-dot menu's Hide/Show option is driven by the item's own flag.
    function renderNotebookRow(notebook) {
        return (
            <div className="page-button" key={notebook.id}>
                {editId === notebook.id ? (
                    <>
                        <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onFocus={(e) => e.target.select()} autoFocus />
                        <button onClick={() => commitNotebookRename(notebook.id)}>✓</button>
                    </>
                ) : (
                    <>
                        <button
                            className={notebook.id === props.activeNotebookId ? "page-listing active" : "page-listing"}
                            onClick={() => openNotebook(notebook.id)}
                        >
                            {notebook.title}
                        </button>
                        <button className="page-three-dot-menu" onClick={() => setOpenMenuId(openMenuId === notebook.id ? null : notebook.id)}><Ellipsis size={18} /></button>

                        {openMenuId === notebook.id && (
                            <div className="page-dropdown-menu">
                                <button onClick={() => props.deleteNotebook(notebook.id)}>Delete</button>
                                <button onClick={() => startRename(notebook.id, notebook.title)}>Rename</button>
                                <button onClick={() => { setOpenMenuId(null); props.setNotebookHidden(notebook.id, !notebook.hidden) }}>
                                    {notebook.hidden ? "Show Permanently" : "Hide"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }

    function renderPageRow(page) {
        return (
            <div className="page-button" key={page.id}>
                {editId === page.id ? (
                    <>
                        <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onFocus={(e) => e.target.select()} autoFocus />
                        <button onClick={() => commitPageRename(page.id)}>✓</button>
                    </>
                ) : (
                    <>
                        <button className={page.id === props.activePageId ? "page-listing active" : "page-listing"} onClick={() => props.changePage(page.id)}>
                            {page.title}
                        </button>
                        <button className="page-three-dot-menu" onClick={() => setOpenMenuId(openMenuId === page.id ? null : page.id)}><Ellipsis size={18} /></button>

                        {openMenuId === page.id && (
                            <div className="page-dropdown-menu">
                                <button onClick={() => props.deletePage(page.id)}>Delete</button>
                                <button onClick={() => startRename(page.id, page.title)}>Rename</button>
                                <button onClick={() => { setOpenMenuId(null); props.setPageHidden(page.id, !page.hidden) }}>
                                    {page.hidden ? "Show Permanently" : "Hide"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }

    return (
        <div className={props.isOpen ? "side-bar-panel open" : "side-bar-panel"}>
            {view === "notebooks" ? (
                // ---------- NOTEBOOKS VIEW ----------
                <>
                    <button className="create-page" onClick={props.createNotebook}>
                        <Notebook size={16} /> New Notebook
                    </button>
                    {visibleNotebooks.map(renderNotebookRow)}

                    {/* Revealed hidden notebooks: a "Hidden" label + divider, then the rows. */}
                    {props.showHidden && hiddenNotebooks.length > 0 && (
                        <>
                            <div className="hidden-section-label">Hidden</div>
                            <hr className="hidden-divider" />
                            {hiddenNotebooks.map(renderNotebookRow)}
                        </>
                    )}
                </>
            ) : (
                // ---------- PAGES VIEW ----------
                <>
                    <div className="panel-header">
                        <button className="icon-button panel-back" onClick={goToNotebooks}>
                            <ArrowLeft size={20} />
                        </button>
                        <span className="panel-title">{props.currentNotebook?.title}</span>
                    </div>

                    <button className="create-page" onClick={props.createPage}>
                        <StickyNotePlus size={16} /> New Page
                    </button>
                    {visiblePages.map(renderPageRow)}

                    {/* Revealed hidden pages: a "Hidden" label + divider, then the rows. */}
                    {props.showHidden && hiddenPages.length > 0 && (
                        <>
                            <div className="hidden-section-label">Hidden</div>
                            <hr className="hidden-divider" />
                            {hiddenPages.map(renderPageRow)}
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default SideBar

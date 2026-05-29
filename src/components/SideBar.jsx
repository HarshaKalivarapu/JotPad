import { useState } from 'react'
import { Ellipsis, ArrowLeft, Notebook, StickyNotePlus } from 'lucide-react'

function SideBar(props) {
    const [view, setView] = useState("pages") // "notebooks" | "pages"
    const [openMenuId, setOpenMenuId] = useState(null)
    const [editId, setEditId] = useState(null)
    const [tempTitle, setTempTitle] = useState("")

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

    return (
        <div className={props.isOpen ? "side-bar-panel open" : "side-bar-panel"}>
            {view === "notebooks" ? (
                // ---------- NOTEBOOKS VIEW ----------
                <>
                    <button className="create-page" onClick={props.createNotebook}>
                        <Notebook size={16} /> New Notebook
                    </button>
                    {props.notebooks.map((notebook) => (
                        <div className="page-button" key={notebook.id}>

                            {editId === notebook.id ? (
                                <>
                                    <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} autoFocus />
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
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
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
                    {props.pagesList.map((page) => (
                        <div className="page-button" key={page.id}>

                            {editId === page.id ? (
                                <>
                                    <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} autoFocus />
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
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}

export default SideBar

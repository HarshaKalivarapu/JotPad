import { useState } from 'react'
import { MdOutlineStickyNote2 } from 'react-icons/md'
import { Ellipsis, ArrowLeft, BookPlus } from 'lucide-react'

function SideBar(props) {
    const [view, setView] = useState("pages") // "notebooks" | "pages"
    const [openMenuId, setOpenMenuId] = useState(null)
    const [editPageId, setEditPageId] = useState(null)
    const [tempPageTitle, setTempPageTitle] = useState("")

    function handlePageRename(targetPageId) {
        props.updatePageTitle(targetPageId, tempPageTitle);
        setEditPageId(null);
    }

    // Open a notebook and drill into its pages.
    function openNotebook(notebookId) {
        props.changeNotebook(notebookId)
        setView("pages")
    }

    return (
        <div className={props.isOpen ? "side-bar-panel open" : "side-bar-panel"}>
            {view === "notebooks" ? (
                // ---------- NOTEBOOKS VIEW ----------
                <>
                    <button className="create-page" onClick={props.createNotebook}>
                        <BookPlus size={16} /> New Notebook
                    </button>
                    {props.notebooks.map((notebook) => (
                        <div className="page-button" key={notebook.id}>
                            <button
                                className={notebook.id === props.activeNotebookId ? "page-listing active" : "page-listing"}
                                onClick={() => openNotebook(notebook.id)}
                            >
                                {notebook.title}
                            </button>
                        </div>
                    ))}
                </>
            ) : (
                // ---------- PAGES VIEW ----------
                <>
                    <div className="panel-header">
                        <button className="icon-button panel-back" onClick={() => setView("notebooks")}>
                            <ArrowLeft size={20} />
                        </button>
                        <span className="panel-title">{props.currentNotebook?.title}</span>
                    </div>

                    <button className="create-page" onClick={props.createPage}>
                        <MdOutlineStickyNote2 size={16} /> New Page
                    </button>
                    {props.pagesList.map((page) => (
                        <div className="page-button" key={page.id}>

                            {editPageId === page.id ? (
                                <>
                                    <input value={tempPageTitle} onChange={(e) => setTempPageTitle(e.target.value)} autoFocus />
                                    <button onClick={() => handlePageRename(page.id)}>✓</button>
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
                                            <button onClick={() => {
                                                setOpenMenuId(null);
                                                setEditPageId(page.id);
                                                setTempPageTitle(page.title);
                                            }}>Rename</button>
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

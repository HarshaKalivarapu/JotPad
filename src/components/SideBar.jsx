import { useState } from 'react'
import { MdOutlineStickyNote2 } from 'react-icons/md'
import { Ellipsis } from 'lucide-react'

function SideBar(props) {
    const [openMenuId, setOpenMenuId] = useState(null)
    const [editPageId, setEditPageId] = useState(null)
    const [tempPageTitle, setTempPageTitle] = useState("")

    function handlePageRename(targetPageId) {
        props.updatePageTitle(targetPageId, tempPageTitle);
        setEditPageId(null);
    }

    return (
        <div className={props.isOpen ? "side-bar-panel open" : "side-bar-panel"}>
            <button className="create-page" onClick={props.createPage}><MdOutlineStickyNote2 size={16} /> New Page</button>
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
        </div>
    )
}

export default SideBar
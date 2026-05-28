import { useState } from 'react'

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
            <button className="create-page" onClick={props.createPage}>New Page</button>
            {props.pagesList.map((page) => (
                <div className="page-button" key={page.id}>

                    {editPageId === page.id ? (
                        <>
                            <input value={tempPageTitle} onChange={(e) => setTempPageTitle(e.target.value)} autoFocus />
                            <button onClick={() => handlePageRename(page.id)}>✓</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => props.changePage(page.id)}>
                                {page.title}
                            </button>
                            <button className="page-three-dot-menu" onClick={() => setOpenMenuId(openMenuId === page.id ? null : page.id)}>...</button>

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
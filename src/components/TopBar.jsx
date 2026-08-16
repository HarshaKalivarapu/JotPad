import { useState, useEffect } from 'react'
import { PanelRightClose, PanelRightOpen, SlidersHorizontal, RefreshCw } from 'lucide-react'

function TopBar(props) {
    // The settings icon now opens a small dropdown instead of signing out
    // directly. Menu holds Sign Out + a reveal/hide-hidden toggle.
    const [menuOpen, setMenuOpen] = useState(false)

    // Close the dropdown on an outside click. The gear toggles it open/closed;
    // the Show/Hide option leaves it open so you can toggle hidden items back
    // and forth without reopening.
    useEffect(() => {
        if (!menuOpen) return
        function handleClickOutside(event) {
            if (event.target.closest('.settings-menu-wrap')) return
            setMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    return (
        <div className="top-bar-panel">
            <button className="icon-button panel-toggle" onClick={props.switchToggle}>
                {props.isOpen ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
            </button>
            <h2>{props.currentPage?.title || "Loading..."}</h2>
            <div className="top-bar-actions">
                <button className="icon-button" onClick={() => window.location.reload()}><RefreshCw size={20} /></button>
                <div className="settings-menu-wrap">
                    {/* Toggles the dropdown open/closed. */}
                    <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)}><SlidersHorizontal size={20} /></button>
                    {menuOpen && (
                        <div className="page-dropdown-menu">
                            <button onClick={props.onSignOut}>Sign Out</button>
                            {/* Toggles hidden items but leaves the menu open. */}
                            <button onClick={props.onToggleHidden}>
                                {props.showHidden ? "Hide Hidden" : "Show Hidden"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TopBar

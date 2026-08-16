import { useState } from 'react'
import { PanelRightClose, PanelRightOpen, SlidersHorizontal, RefreshCw } from 'lucide-react'

function TopBar(props) {
    // The settings icon now opens a small dropdown instead of signing out
    // directly. Menu holds Sign Out + a reveal/hide-hidden toggle.
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <div className="top-bar-panel">
            <button className="icon-button panel-toggle" onClick={props.switchToggle}>
                {props.isOpen ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
            </button>
            <h2>{props.currentPage?.title || "Loading..."}</h2>
            <div className="top-bar-actions">
                <button className="icon-button" onClick={() => window.location.reload()}><RefreshCw size={20} /></button>
                <div className="settings-menu-wrap">
                    <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)}><SlidersHorizontal size={20} /></button>
                    {menuOpen && (
                        <div className="page-dropdown-menu">
                            <button onClick={() => { setMenuOpen(false); props.onSignOut() }}>Sign Out</button>
                            {/* Label flips based on whether hidden items are currently revealed. */}
                            <button onClick={() => { props.onToggleHidden(); setMenuOpen(false) }}>
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

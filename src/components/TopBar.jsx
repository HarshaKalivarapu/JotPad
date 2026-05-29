import { PanelRightClose, PanelRightOpen, SlidersHorizontal, RefreshCw } from 'lucide-react'

function TopBar(props) {
    return (
        <div className="top-bar-panel">
            <button className="icon-button panel-toggle" onClick={props.switchToggle}>
                {props.isOpen ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
            </button>
            <h2>{props.currentPage?.title || "Loading..."}</h2>
            <div className="top-bar-actions">
                <button className="icon-button" onClick={() => window.location.reload()}><RefreshCw size={20} /></button>
                <button className="icon-button"><SlidersHorizontal size={20} /></button>
            </div>
        </div>
    )
}

export default TopBar
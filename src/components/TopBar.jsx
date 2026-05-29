import { PanelRightClose, SlidersHorizontal } from 'lucide-react'

function TopBar(props) {
    return (
        <div className="top-bar-panel">
            <button className="icon-button panel-toggle" onClick={props.switchToggle}><PanelRightClose size={20} /></button>
            <h2>{props.currentPage?.title || "Loading..."}</h2>
            <button className="icon-button"><SlidersHorizontal size={20} /></button>
        </div>
    )
}

export default TopBar
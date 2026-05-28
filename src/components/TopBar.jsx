import { PanelRightClose } from 'lucide-react'

function TopBar(props) {
    return (
        <div className="top-bar-panel">
            <button className="icon-button" onClick={props.switchToggle}><PanelRightClose size={20} /></button>
            <h2>{props.currentPage?.title || "Loading..."}</h2>
            <button>Settings</button>
        </div>
    )
}

export default TopBar
function TopBar(props) {
    return (
        <div className="top-bar-panel">
            <button onClick={props.switchToggle}>Side Panel</button>
            <h2>Title</h2>
            <button>Settings</button>
        </div>
    )
}

export default TopBar
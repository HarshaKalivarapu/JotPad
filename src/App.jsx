import './index.css'
import { useState } from 'react'
import TopBar from './components/TopBar.jsx'
import SideBar from './components/SideBar.jsx'
import Page from './components/Page.jsx'

function App() {
  const [sideBar, setSideBar] = useState(false)

  function handleSideBarToggle() {
    setSideBar(!sideBar)
  }

  return (
    <div className="app-container">
      <TopBar switchToggle={handleSideBarToggle}/>
      <div className="main-container">
        {sideBar && <SideBar />}
        <Page />
      </div>
      <h1>JotPad is alive.</h1>
    </div>
  )
}

export default App
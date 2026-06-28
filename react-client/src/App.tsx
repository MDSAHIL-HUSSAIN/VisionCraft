import { useEffect, useState } from 'react'
// @ts-ignore
import addOnUISdk from "add-on-ui-sdk"
import Header from './components/Header'
import InboxPage from './pages/InboxPage'
import GeneratePage from './pages/GeneratePage'
import ReviewPage from './pages/ReviewPage'
import FeedPage from './pages/FeedPage'
import { Inbox, Zap, CheckSquare, Activity } from 'lucide-react'

const App = () => {
  const [activeTab, setActiveTab] = useState('requests')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    addOnUISdk.ready.then(() => setIsReady(true))
  }, [])

  const renderPage = () => {
    switch (activeTab) {
      case 'requests': return <InboxPage />
      case 'create': return <GeneratePage />
      case 'deliver': return <ReviewPage />
      case 'history': return <FeedPage />
      default: return <InboxPage />
    }
  }

  const NavItem = ({ id, icon: Icon, label }: any) => {
    const active = activeTab === id

    return (
      <button onClick={() => setActiveTab(id)} className="flex-1 py-2">
        <div
          className={`
            flex flex-col items-center gap-1 text-xs font-medium
            ${active ? 'text-blue-600' : 'text-gray-400'}
          `}
        >
          <Icon size={18} />
          {label}
        </div>
      </button>
    )
  }

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F6F7FB]">

      {/* ===== HEADER (FORCED SOLID) ===== */}
      <div
        className="sticky top-0 z-10"
        style={{
          backgroundColor: '#ffffff',
        }}
      >
        <Header />
      </div>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderPage()}
      </div>

      {/* ===== FOOTER (FORCED TRANSPARENT) ===== */}
      <div
        className="flex"
        style={{
          background: 'transparent',
          backgroundColor: 'transparent',
        }}
      >
        <NavItem id="requests" icon={Inbox} label="Inbox" />
        <NavItem id="create" icon={Zap} label="Generate" />
        <NavItem id="deliver" icon={CheckSquare} label="Review" />
        <NavItem id="history" icon={Activity} label="Activity" />
      </div>

    </div>
  )
}

export default App
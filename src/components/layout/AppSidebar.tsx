import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { loadProfile } from '../../lib/storage'

const NAV_ITEMS = [
  { icon: 'forest', label: 'My Forest', path: '/' },
  { icon: 'auto_graph', label: 'Growth Path', path: '/learning-path' },
  { icon: 'calendar_month', label: 'Study Calendar', path: '/' },
  { icon: 'group', label: 'Community', path: '/community' },
  { icon: 'psychology', label: 'Competency Profile', path: '/profile' },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = loadProfile()
  const level = profile?.grade

  const isActive = (path: string, label: string) => {
    if (label === 'Study Calendar') return false
    if (path === '/') return location.pathname === '/'
    return location.pathname === path
  }

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-72 flex-col rounded-r-[3rem] bg-emerald-50/95 p-6 shadow-2xl shadow-emerald-900/10 lg:flex">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-10 flex items-center gap-3 px-2 text-left"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#064e3b]">
          <span className="material-symbols-outlined fill-icon text-[#b2f746]">eco</span>
        </div>
        <div>
          <h1 className="text-lg font-black tracking-[0] text-emerald-950">Emerald Zenith</h1>
          <p className="text-xs font-medium text-emerald-800/60">
            {level ? `Level ${level} Explorer` : 'New Explorer'}
          </p>
        </div>
      </button>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.path)}
            className={cn(
              'flex w-full items-center gap-4 rounded-full px-5 py-3.5 text-left transition',
              isActive(item.path, item.label)
                ? 'translate-x-1 bg-emerald-400/20 font-bold text-emerald-900'
                : 'text-emerald-800/60 hover:bg-emerald-400/10',
            )}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6" />
    </aside>
  )
}

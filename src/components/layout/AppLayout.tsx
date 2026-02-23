import SidebarNav from './SidebarNav'

interface AppLayoutProps {
  children: React.ReactNode
}

function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen bg-base">
      <SidebarNav />
      <main className="ml-[240px] flex-1 p-6">
        {children}
      </main>
    </div>
  )
}

export default AppLayout

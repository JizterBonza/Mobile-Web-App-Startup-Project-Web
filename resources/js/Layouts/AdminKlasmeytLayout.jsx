import { Menu, PanelLeftClose } from 'lucide-react'
import KlasmeytDashboardLayout from './KlasmeytDashboardLayout'
import { DashboardHeader, ADMIN_HEADER_NAV } from '../Components/Dashboard/DashboardHeader'

export default function AdminKlasmeytLayout({
    children,
    auth,
    title = 'Dashboard',
    notificationCount = 0,
    mainClassName = '',
}) {
    return (
        <KlasmeytDashboardLayout
            auth={auth}
            title={title}
            mainClassName={mainClassName}
            renderHeader={({ toggleSidebar, sidebarOpen, isLarge }) => (
                <DashboardHeader
                    menuToggle={
                        <button
                            type="button"
                            className="rounded-lg border border-[#E5E7EB] p-2 text-[#6B7280] hover:bg-[#F9FAFB]"
                            onClick={toggleSidebar}
                            aria-expanded={sidebarOpen}
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    }
                    sidebarHideToggle={
                        sidebarOpen && isLarge ? (
                            <button
                                type="button"
                                className="rounded-lg border border-[#E5E7EB] p-2 text-[#6B7280] hover:bg-[#F9FAFB]"
                                onClick={toggleSidebar}
                                aria-label="Hide sidebar navigation"
                            >
                                <PanelLeftClose className="h-5 w-5" />
                            </button>
                        ) : null
                    }
                    navigationItems={ADMIN_HEADER_NAV}
                    notificationCount={notificationCount}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                />
            )}
        >
            {children}
        </KlasmeytDashboardLayout>
    )
}

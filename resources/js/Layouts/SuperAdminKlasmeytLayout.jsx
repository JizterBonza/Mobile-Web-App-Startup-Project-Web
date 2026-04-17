import { Menu, PanelLeftClose } from 'lucide-react'
import KlasmeytDashboardLayout from './KlasmeytDashboardLayout'
import { DashboardHeader, SUPER_ADMIN_HEADER_NAV } from '../Components/Dashboard/DashboardHeader'

/**
 * Klasmeyt sidebar + header (same shell as the Super Admin dashboard home page).
 */
export default function SuperAdminKlasmeytLayout({
    children,
    auth,
    title = 'Dashboard',
    notificationCount = 0,
}) {
    return (
        <KlasmeytDashboardLayout
            auth={auth}
            title={title}
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
                    navigationItems={SUPER_ADMIN_HEADER_NAV}
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

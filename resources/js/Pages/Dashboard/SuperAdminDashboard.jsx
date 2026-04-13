import { Menu } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import {
    DashboardHeader,
    SUPER_ADMIN_HEADER_NAV,
} from '../../Components/Dashboard/DashboardHeader'
import { SuperAdminPlatformInsights } from '../../Components/Dashboard/SuperAdminPlatformInsights'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function SuperAdminDashboard({ auth, insights }) {
    const { sessionValid } = useDashboardSession()

    const userStats = insights?.userStats
    const orderMetrics = insights?.orderMetrics
    const topStores = insights?.topStores ?? []
    const topRiders = insights?.topRiders ?? []

    return (
        <KlasmeytDashboardLayout
            auth={auth}
            title="Super Admin Dashboard"
            renderHeader={({ toggleSidebar, sidebarOpen }) => (
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
                    navigationItems={SUPER_ADMIN_HEADER_NAV}
                    notificationCount={insights?.notificationCount ?? 0}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                />
            )}
        >
            {!sessionValid && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <p className="font-semibold">Session expired</p>
                    <p className="mt-1 text-red-700">Refresh the page to sign in again.</p>
                </div>
            )}

            <SuperAdminPlatformInsights
                userStats={userStats}
                orderMetrics={orderMetrics}
                topStores={topStores}
                topRiders={topRiders}
            />
        </KlasmeytDashboardLayout>
    )
}

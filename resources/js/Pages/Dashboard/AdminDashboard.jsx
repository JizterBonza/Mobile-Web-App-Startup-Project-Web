import AdminKlasmeytLayout from '../../Layouts/AdminKlasmeytLayout'
import { SuperAdminPlatformInsights } from '../../Components/Dashboard/SuperAdminPlatformInsights'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function AdminDashboard({ auth, insights }) {
    useDashboardSession()

    const userStats = insights?.userStats
    const orderMetrics = insights?.orderMetrics
    const topStores = insights?.topStores ?? []
    const topRiders = insights?.topRiders ?? []

    return (
        <AdminKlasmeytLayout
            auth={auth}
            title="Admin Dashboard"
            notificationCount={insights?.notificationCount ?? 0}
        >
            <SuperAdminPlatformInsights
                userStats={userStats}
                orderMetrics={orderMetrics}
                topStores={topStores}
                topRiders={topRiders}
            />
        </AdminKlasmeytLayout>
    )
}

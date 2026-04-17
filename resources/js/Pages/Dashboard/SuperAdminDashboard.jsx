import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { SuperAdminPlatformInsights } from '../../Components/Dashboard/SuperAdminPlatformInsights'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function SuperAdminDashboard({ auth, insights }) {
    useDashboardSession()

    const userStats = insights?.userStats
    const orderMetrics = insights?.orderMetrics
    const topStores = insights?.topStores ?? []
    const topRiders = insights?.topRiders ?? []

    return (
        <SuperAdminKlasmeytLayout
            auth={auth}
            title="Super Admin Dashboard"
            notificationCount={insights?.notificationCount ?? 0}
        >
            <SuperAdminPlatformInsights
                userStats={userStats}
                orderMetrics={orderMetrics}
                topStores={topStores}
                topRiders={topRiders}
            />
        </SuperAdminKlasmeytLayout>
    )
}

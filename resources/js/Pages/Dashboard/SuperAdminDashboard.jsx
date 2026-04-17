import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { SuperAdminPlatformInsights } from '../../Components/Dashboard/SuperAdminPlatformInsights'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function SuperAdminDashboard({ auth, insights }) {
    const { sessionValid } = useDashboardSession()

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
        </SuperAdminKlasmeytLayout>
    )
}

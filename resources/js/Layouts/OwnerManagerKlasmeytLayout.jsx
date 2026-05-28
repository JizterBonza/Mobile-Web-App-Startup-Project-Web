import { Head } from '@inertiajs/react'
import { DashboardHeader } from '../Components/Dashboard/DashboardHeader'
import { useDashboardSession } from '../hooks/useDashboardSession'

export const OWNER_MANAGER_NAV = [
    { label: 'Dashboard', id: 'dashboard', href: '/dashboard/owner-manager' },
    { label: 'Stores', id: 'stores', href: '/dashboard/owner-manager/stores' },
    { label: 'Orders', id: 'orders', href: '/dashboard/owner-manager/orders' },
]

export function OwnerManagerNoAgrivetAlert() {
    return (
        <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
            <p className="font-semibold">No Agrivet linked</p>
            <p className="mt-1 text-amber-800">
                Your account is not linked to an Agrivet business. Please contact an administrator.
            </p>
        </div>
    )
}

export default function OwnerManagerKlasmeytLayout({
    auth,
    title,
    children,
    notificationCount = 0,
    mainClassName = 'w-full px-6 py-8',
}) {
    useDashboardSession()

    return (
        <>
            <Head title={title} />
            <div className="klasmeyt-landing min-h-screen bg-[#F8F9FB]">
                <DashboardHeader
                    compactNav
                    navigationItems={OWNER_MANAGER_NAV}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                    notificationCount={notificationCount}
                />
                <main className={`relative w-full min-w-0 ${mainClassName}`.trim()}>{children}</main>
            </div>
        </>
    )
}

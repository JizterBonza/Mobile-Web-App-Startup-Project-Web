import { Head } from '@inertiajs/react'
import { DashboardHeader } from '../Components/Dashboard/DashboardHeader'
import { useDashboardSession } from '../hooks/useDashboardSession'

export default function VendorKlasmeytLayout({
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
                    showNav={false}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                    notificationCount={notificationCount}
                />
                <main className={`relative w-full min-w-0 ${mainClassName}`.trim()}>{children}</main>
            </div>
        </>
    )
}

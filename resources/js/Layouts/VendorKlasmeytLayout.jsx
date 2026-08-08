import { Head } from '@inertiajs/react'
import { ContactSupportFab } from '../Components/Dashboard/ContactSupportFab'
import { DashboardHeader } from '../Components/Dashboard/DashboardHeader'
import { useDashboardSession } from '../hooks/useDashboardSession'

export default function VendorKlasmeytLayout({
    auth,
    title,
    children,
    notificationCount = 0,
    messageCount = 0,
    mainClassName = 'w-full px-6 py-8',
    showContactSupport = true,
}) {
    useDashboardSession()

    return (
        <>
            <Head title={title} />
            <div className="klasmeyt-landing min-h-screen bg-[#F8F9FB]">
                <DashboardHeader
                    showNav={false}
                    showMessaging
                    messagingHref="/dashboard/vendor/messages"
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                    notificationCount={notificationCount}
                    messageCount={messageCount}
                />
                <main className={`relative w-full min-w-0 ${mainClassName}`.trim()}>{children}</main>
                {showContactSupport ? (
                    <ContactSupportFab href="/dashboard/vendor/support" />
                ) : null}
            </div>
        </>
    )
}

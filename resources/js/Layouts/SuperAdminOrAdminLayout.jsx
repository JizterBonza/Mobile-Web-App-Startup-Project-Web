import AdminKlasmeytLayout from './AdminKlasmeytLayout'
import SuperAdminKlasmeytLayout from './SuperAdminKlasmeytLayout'

export default function SuperAdminOrAdminLayout({
    children,
    auth,
    title = 'Dashboard',
    notificationCount = 0,
    mainClassName = '',
}) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout
                auth={auth}
                title={title}
                notificationCount={notificationCount}
                mainClassName={mainClassName}
            >
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return (
        <AdminKlasmeytLayout
            auth={auth}
            title={title}
            notificationCount={notificationCount}
            mainClassName={mainClassName}
        >
            {children}
        </AdminKlasmeytLayout>
    )
}

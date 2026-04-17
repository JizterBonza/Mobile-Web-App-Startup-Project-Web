import AdminLayout from './AdminLayout'
import SuperAdminKlasmeytLayout from './SuperAdminKlasmeytLayout'

/**
 * Super admins get the Klasmeyt dashboard shell; everyone else keeps AdminLTE.
 */
export default function SuperAdminOrAdminLayout({
    children,
    auth,
    title = 'Dashboard',
    notificationCount = 0,
}) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title={title} notificationCount={notificationCount}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return <AdminLayout auth={auth} title={title}>{children}</AdminLayout>
}

import AdminKlasmeytLayout from './AdminKlasmeytLayout'
import OwnerManagerKlasmeytLayout from './OwnerManagerKlasmeytLayout'
import SuperAdminKlasmeytLayout from './SuperAdminKlasmeytLayout'
import VendorKlasmeytLayout from './VendorKlasmeytLayout'

export default function SuperAdminOrAdminLayout({
    children,
    auth,
    title = 'Dashboard',
    notificationCount = 0,
    mainClassName = '',
}) {
    const userType = auth?.user?.user_type
    const layoutProps = { auth, title, notificationCount }
    if (mainClassName) {
        layoutProps.mainClassName = mainClassName
    }

    if (userType === 'super_admin') {
        return <SuperAdminKlasmeytLayout {...layoutProps}>{children}</SuperAdminKlasmeytLayout>
    }
    if (userType === 'owner_manager') {
        return <OwnerManagerKlasmeytLayout {...layoutProps}>{children}</OwnerManagerKlasmeytLayout>
    }
    if (userType === 'vendor') {
        return <VendorKlasmeytLayout {...layoutProps}>{children}</VendorKlasmeytLayout>
    }
    return <AdminKlasmeytLayout {...layoutProps}>{children}</AdminKlasmeytLayout>
}

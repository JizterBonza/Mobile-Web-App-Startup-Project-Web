import OwnerManagerOrdersPanel from '../../Components/Dashboard/OwnerManagerOrdersPanel'
import OwnerManagerKlasmeytLayout, {
    OwnerManagerNoAgrivetAlert,
} from '../../Layouts/OwnerManagerKlasmeytLayout'

export default function OwnerManagerOrders({
    auth,
    agrivet,
    orders = [],
    deliveryMethods = [],
    preparingItemStatusId = null,
    flash,
}) {
    const managesFarm = Boolean(auth?.user?.manages_farm)

    return (
        <OwnerManagerKlasmeytLayout auth={auth} title="Order Management">
            {flash?.success && (
                <div className="mb-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                    {flash.error}
                </div>
            )}
            {!managesFarm && !agrivet && <OwnerManagerNoAgrivetAlert />}
            <OwnerManagerOrdersPanel
                orders={orders}
                deliveryMethods={deliveryMethods}
                preparingItemStatusId={preparingItemStatusId}
                subtitle={
                    managesFarm
                        ? 'Manage and track farm orders'
                        : 'Manage and track all customer orders'
                }
            />
        </OwnerManagerKlasmeytLayout>
    )
}

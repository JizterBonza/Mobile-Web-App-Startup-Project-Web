import OwnerManagerOrdersPanel from '../../Components/Dashboard/OwnerManagerOrdersPanel'
import OwnerManagerKlasmeytLayout, {
    OwnerManagerNoAgrivetAlert,
} from '../../Layouts/OwnerManagerKlasmeytLayout'

export default function OwnerManagerOrders({ auth, agrivet, orders = [] }) {
    return (
        <OwnerManagerKlasmeytLayout auth={auth} title="Order Management">
            {!agrivet && <OwnerManagerNoAgrivetAlert />}
            <OwnerManagerOrdersPanel orders={orders} />
        </OwnerManagerKlasmeytLayout>
    )
}

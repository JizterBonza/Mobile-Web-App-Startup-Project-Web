import { useForm, usePage } from '@inertiajs/react'
import ShippingPartnerKlasmeytLayout from '../../Layouts/ShippingPartnerKlasmeytLayout'
import { KlasmeytStatCard } from '../../Components/Dashboard/KlasmeytStatCard'

const STATUS_LABELS = {
    awaiting_deposit: 'Awaiting deposit',
    preparing: 'Preparing',
    prepared: 'Prepared',
    ready_for_pickup: 'Ready for Pickup',
    ready_for_release: 'Ready for Release',
    release_authorized: 'Ready for Release',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    on_hold: 'On hold',
    cancelled: 'Cancelled',
}

function pesos(value) {
    if (value == null || value === '') {
        return '—'
    }
    const amount = Number(value)
    if (!Number.isFinite(amount)) {
        return '—'
    }
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusLabel(status) {
    return STATUS_LABELS[status] || String(status || 'Unknown').replace(/_/g, ' ')
}

function holdMessage(reason) {
    if (reason === 'balance_deadline_missed') {
        return 'The balance deadline was missed. An administrator has to set a new pickup date.'
    }
    if (reason === 'payment_review') {
        return 'This order is on hold while the payment is reviewed.'
    }
    return 'This order is on hold.'
}

function ScheduleForm({ order }) {
    const { data, setData, post, processing, errors } = useForm({
        pickup_date: order.pickupDate || order.minPickupDate || '',
        per_box_fee: order.perBoxFee || '',
    })

    const submit = (event) => {
        event.preventDefault()
        post(`/dashboard/shipping-partner/orders/${order.id}/schedule`, {
            preserveScroll: true,
        })
    }

    return (
        <form onSubmit={submit} className="mt-5 grid gap-4 border-t border-[#E5E7EB] pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block text-sm">
                <span className="font-medium text-[#374151]">Pickup date</span>
                <input
                    type="date"
                    required
                    min={order.minPickupDate || undefined}
                    value={data.pickup_date}
                    onChange={(event) => setData('pickup_date', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/30"
                />
                {errors.pickup_date && <span className="mt-1 block text-xs text-[#E20E28]">{errors.pickup_date}</span>}
            </label>
            <label className="block text-sm">
                <span className="font-medium text-[#374151]">Shipping fee per box</span>
                <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={data.per_box_fee}
                    onChange={(event) => setData('per_box_fee', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/30"
                    placeholder="0.00"
                />
                {errors.per_box_fee && <span className="mt-1 block text-xs text-[#E20E28]">{errors.per_box_fee}</span>}
            </label>
            <button
                type="submit"
                disabled={processing}
                className="rounded-full bg-[#244693] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b3770] disabled:opacity-60"
            >
                {processing ? 'Saving…' : 'Ready for Pickup'}
            </button>
        </form>
    )
}

function TransitActions({ order }) {
    const pickup = useForm({})
    const deliver = useForm({})

    if (order.canPickUp) {
        return (
            <button
                type="button"
                disabled={pickup.processing}
                onClick={() => pickup.post(`/dashboard/shipping-partner/orders/${order.id}/pickup`, { preserveScroll: true })}
                className="mt-5 w-full rounded-full bg-[#244693] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b3770] disabled:opacity-60 sm:w-auto"
            >
                {pickup.processing ? 'Updating…' : 'Pick up'}
            </button>
        )
    }

    if (order.canDeliver) {
        return (
            <button
                type="button"
                disabled={deliver.processing}
                onClick={() => deliver.post(`/dashboard/shipping-partner/orders/${order.id}/deliver`, { preserveScroll: true })}
                className="mt-5 w-full rounded-full bg-[#00C950] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00B048] disabled:opacity-60 sm:w-auto"
            >
                {deliver.processing ? 'Updating…' : 'Mark delivered'}
            </button>
        )
    }

    return null
}

function OrderCard({ order }) {
    return (
        <article className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">{order.orderCode}</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#102059]">{order.farmName}</h2>
                    {order.farmLocation && <p className="mt-1 text-sm text-[#6B7280]">{order.farmLocation}</p>}
                </div>
                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#244693]">
                    {statusLabel(order.status)}
                </span>
            </div>

            <div className="mt-5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#102059]">Order details</h3>
                <p className="mt-1 text-xs text-[#6B7280]">Items and the farm location are the basis for the shipping fee.</p>
                <ul className="mt-3 space-y-3 text-sm text-[#102059]">
                    {(order.items || []).length === 0 ? (
                        <li>No item details yet.</li>
                    ) : (
                        order.items.map((item, index) => (
                            <li key={`${item.name}-${index}`}>
                                <p className="font-medium">
                                    {item.name} × {item.quantity}
                                    {item.sellingUnit ? ` ${item.sellingUnit}` : ''} ({item.birdCount} birds)
                                </p>
                                {(item.birds || []).length > 0 && (
                                    <ul className="mt-1 space-y-1 pl-4 text-xs text-[#374151]">
                                        {item.birds.map((bird, birdIndex) => (
                                            <li key={`${bird.wingband || 'bird'}-${birdIndex}`}>
                                                {[
                                                    bird.wingband ? `Wingband ${bird.wingband}` : null,
                                                    bird.featherColor ? `feather ${bird.featherColor}` : null,
                                                    bird.feetColor ? `feet ${bird.feetColor}` : null,
                                                ].filter(Boolean).join(' · ') || 'Bird details not recorded'}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))
                    )}
                </ul>
                <p className="mt-3 text-sm text-[#102059]">
                    <span className="text-[#6B7280]">Farm location: </span>
                    {[order.farmName, order.farmLocation].filter(Boolean).join(' — ') || '—'}
                </p>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <dt className="text-[#6B7280]">Delivery address</dt>
                    <dd className="mt-1 font-medium text-[#102059]">{order.deliveryAddress || '—'}</dd>
                </div>
                <div>
                    <dt className="text-[#6B7280]">Birds / boxes</dt>
                    <dd className="mt-1 font-medium text-[#102059]">{order.birdCount} birds · {order.boxCount} boxes</dd>
                </div>
                <div>
                    <dt className="text-[#6B7280]">Shipping estimate</dt>
                    <dd className="mt-1 font-medium text-[#102059]">{pesos(order.estimateMin)} – {pesos(order.estimateMax)}</dd>
                </div>
                <div>
                    <dt className="text-[#6B7280]">Pickup</dt>
                    <dd className="mt-1 font-medium text-[#102059]">
                        {order.pickupDate || 'Not set'}
                        {order.perBoxFee != null && <span className="block text-xs font-normal text-[#6B7280]">{pesos(order.perBoxFee)} per box · {pesos(order.shippingFee)} shipping</span>}
                    </dd>
                </div>
            </dl>

            {order.onHold && (
                <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{holdMessage(order.holdReason)}</p>
            )}
            {order.cancelled && (
                <p className="mt-4 rounded-lg bg-[#F3F4F6] px-4 py-3 text-sm text-[#374151]">This order was cancelled.</p>
            )}
            {!order.prepared && !order.cancelled && !order.canPickUp && !order.canDeliver && (
                <p className="mt-4 rounded-lg bg-[#F8F9FB] px-4 py-3 text-sm text-[#374151]">
                    Waiting for the farm to finish preparing this order. The item list and farm location will be the basis for your shipping fee.
                </p>
            )}
            {order.fullyPaid && order.status === 'ready_for_release' && !order.onHold && (
                <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    The customer paid in full. This order is ready for release. Pick it up on {order.pickupDate || 'the confirmed pickup date'}.
                </p>
            )}
            {order.canSchedule && <ScheduleForm order={order} />}
            <TransitActions order={order} />
        </article>
    )
}

export default function ShippingPartnerDashboard({ auth, orders = [], stats = {} }) {
    const { flash, errors } = usePage().props

    return (
        <ShippingPartnerKlasmeytLayout auth={auth} title="Shipping Partner">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[#102059]">Shipping Partner</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                    Assigned farm deliveries. After the farm marks an order prepared, set the shipping fee and pickup date.
                </p>
            </div>

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
                    {flash.success}
                </div>
            )}
            {errors?.schedule && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
                    {Array.isArray(errors.schedule) ? errors.schedule[0] : errors.schedule}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KlasmeytStatCard label="Assigned" value={String(stats.assigned ?? 0)} iconClass="fas fa-truck" />
                <KlasmeytStatCard label="Needs schedule" value={String(stats.needsSchedule ?? 0)} iconClass="fas fa-calendar-plus" />
                <KlasmeytStatCard label="Scheduled" value={String(stats.scheduled ?? 0)} iconClass="fas fa-calendar-check" />
                <KlasmeytStatCard label="On hold" value={String(stats.onHold ?? 0)} iconClass="fas fa-pause-circle" />
            </div>

            <div className="mt-8 space-y-4">
                {orders.length === 0 ? (
                    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                        <h2 className="text-xl font-semibold text-[#102059]">No assigned deliveries</h2>
                        <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                            Orders appear here after an administrator assigns them to you and the customer’s deposit is paid.
                        </p>
                    </section>
                ) : (
                    orders.map((order) => <OrderCard key={order.id} order={order} />)
                )}
            </div>
        </ShippingPartnerKlasmeytLayout>
    )
}

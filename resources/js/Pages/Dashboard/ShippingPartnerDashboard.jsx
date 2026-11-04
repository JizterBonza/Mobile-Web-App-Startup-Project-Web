import { useForm, usePage } from '@inertiajs/react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import { KlasmeytStatCard } from '../../Components/Dashboard/KlasmeytStatCard'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const STATUS_LABELS = {
    awaiting_deposit: 'Awaiting deposit',
    awaiting_schedule: 'Awaiting schedule',
    scheduled: 'Scheduled',
    on_hold: 'On hold',
    ready_for_pickup: 'Ready for pickup',
    release_authorized: 'Release authorized',
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
                <span className="font-medium text-[#374151]">Price per box</span>
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
                {processing ? 'Saving…' : order.pickupDate ? 'Update schedule' : 'Submit shipping'}
            </button>
        </form>
    )
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
            {!order.confirmed && !order.cancelled && (
                <p className="mt-4 rounded-lg bg-[#F8F9FB] px-4 py-3 text-sm text-[#374151]">
                    Waiting for the farm to confirm this order. You can set the pickup date and box price after confirmation.
                </p>
            )}
            {order.fullyPaid && !order.onHold && (
                <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    The customer has paid in full. Coordinate release on {order.pickupDate || 'the confirmed pickup date'}.
                </p>
            )}
            {order.canSchedule && <ScheduleForm order={order} />}
        </article>
    )
}

export default function ShippingPartnerDashboard({ auth, orders = [], stats = {} }) {
    useDashboardSession()
    const { flash, errors } = usePage().props

    return (
        <KlasmeytDashboardLayout auth={auth} title="Shipping Partner">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[#102059]">Shipping Partner</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                    Assigned farm deliveries. Set the pickup date and price per box after the farm confirms the order.
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
        </KlasmeytDashboardLayout>
    )
}

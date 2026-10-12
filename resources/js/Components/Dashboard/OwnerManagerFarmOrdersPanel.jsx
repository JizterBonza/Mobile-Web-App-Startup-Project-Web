import { useMemo, useState } from 'react'
import {
    Calendar,
    CheckCircle,
    ChevronDown,
    Clock,
    FileText,
    MessageSquare,
    Package,
    Truck,
    User,
} from 'lucide-react'

const SECTIONS = [
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
    { id: 'order-request', label: 'Order Request', icon: FileText },
    { id: 'preparing', label: 'Preparing', icon: Clock },
    { id: 'pickup', label: 'Pick-up', icon: Package },
    { id: 'in-transit', label: 'In Transit', icon: Truck },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
]

const EMPTY_COPY = {
    inquiries: 'No inquiries yet',
    'order-request': 'No order requests yet',
    preparing: 'No orders being prepared',
    pickup: 'No pick-ups yet',
    'in-transit': 'No orders in transit',
    completed: 'No completed orders yet',
}

const controlClass =
    'w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-3 pr-10 text-sm focus:border-[#244693] focus:outline-none'

function startOfDay(dateString) {
    const date = new Date(`${dateString}T00:00:00+08:00`)
    return Number.isNaN(date.getTime()) ? null : date
}

function endOfDay(dateString) {
    const date = new Date(`${dateString}T23:59:59.999+08:00`)
    return Number.isNaN(date.getTime()) ? null : date
}

function formatInputDate(value) {
    const [year, month, day] = String(value || '').split('-')
    if (!year || !month || !day) return ''
    return `${month}/${day}/${year}`
}

function formatOrderStamp(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const datePart = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
    }).format(date)
    const timePart = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    }).format(date)
    return `${datePart} | ${timePart}`
}

function formatAmount(value) {
    const amount = Number(value)
    const safe = Number.isFinite(amount) ? amount : 0
    return `₱ ${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function FieldChevron() {
    return (
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
    )
}

function DateField({ label, value, onChange, min }) {
    return (
        <label className="block min-w-0">
            <span className="mb-2 block text-sm font-medium text-[#111827]">{label}</span>
            <div className="relative">
                <div
                    className={`${controlClass} flex items-center ${value ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}
                >
                    {value ? formatInputDate(value) : 'mm/dd/yyyy'}
                </div>
                <input
                    type="date"
                    value={value}
                    min={min || undefined}
                    onChange={(event) => onChange(event.target.value)}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    aria-label={label}
                />
                <FieldChevron />
            </div>
        </label>
    )
}

export default function OwnerManagerFarmOrdersPanel({ orders = [] }) {
    const [activeSection, setActiveSection] = useState('inquiries')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [customerFilter, setCustomerFilter] = useState('all')

    const customerOptions = useMemo(() => {
        const byId = new Map()
        orders.forEach((order) => {
            const id = order.customerId ?? order.customerName
            if (id == null || id === '') return
            const key = String(id)
            if (!byId.has(key)) {
                byId.set(key, {
                    value: key,
                    label: order.customerName || `Customer #${key}`,
                })
            }
        })
        return Array.from(byId.values()).sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
        )
    }, [orders])

    const matchesSharedFilters = (order) => {
        if (customerFilter !== 'all') {
            const key = String(order.customerId ?? order.customerName ?? '')
            if (key !== customerFilter) return false
        }

        const orderDate = new Date(order.orderedAt || order.dateOfOrder)
        if (Number.isNaN(orderDate.getTime())) {
            return !dateFrom && !dateTo
        }
        if (dateFrom) {
            const from = startOfDay(dateFrom)
            if (from && orderDate < from) return false
        }
        if (dateTo) {
            const to = endOfDay(dateTo)
            if (to && orderDate > to) return false
        }
        return true
    }

    const ordersForSection = (sectionId) =>
        orders.filter((order) => order.status === sectionId && matchesSharedFilters(order))

    const visibleOrders = ordersForSection(activeSection)
    const hasActiveFilters = statusFilter !== 'all' || dateFrom !== '' || dateTo !== '' || customerFilter !== 'all'

    const handleStatusChange = (value) => {
        setStatusFilter(value)
        if (value !== 'all') {
            setActiveSection(value)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Order Management</h1>
                <p className="text-sm text-[#6B7280]">Manage and track all customer orders</p>
            </div>

            <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-[#111827]">Status</span>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(event) => handleStatusChange(event.target.value)}
                                className={`${controlClass} cursor-pointer ${
                                    statusFilter === 'all' ? 'text-[#6B7280]' : 'text-[#111827]'
                                }`}
                            >
                                <option value="all">All Status</option>
                                {SECTIONS.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {section.label}
                                    </option>
                                ))}
                            </select>
                            <FieldChevron />
                        </div>
                    </label>

                    <DateField label="Date from" value={dateFrom} onChange={setDateFrom} />
                    <DateField
                        label="Date to"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(value) => {
                            setDateTo(value)
                            if (dateFrom && value && value < dateFrom) {
                                setDateFrom(value)
                            }
                        }}
                    />

                    <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-[#111827]">Customer</span>
                        <div className="relative">
                            <select
                                value={customerFilter}
                                onChange={(event) => setCustomerFilter(event.target.value)}
                                className={`${controlClass} cursor-pointer ${
                                    customerFilter === 'all' ? 'text-[#6B7280]' : 'text-[#111827]'
                                }`}
                            >
                                <option value="all">All Customers</option>
                                {customerOptions.map((customer) => (
                                    <option key={customer.value} value={customer.value}>
                                        {customer.label}
                                    </option>
                                ))}
                            </select>
                            <FieldChevron />
                        </div>
                    </label>
                </div>
            </section>

            <section className="rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-sm">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {SECTIONS.map((section) => {
                        const Icon = section.icon
                        const isActive = activeSection === section.id
                        const count = ordersForSection(section.id).length

                        return (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => {
                                    setActiveSection(section.id)
                                    setStatusFilter('all')
                                }}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'bg-[#244693] text-white shadow-sm'
                                        : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{section.label}</span>
                                <span
                                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                                        isActive ? 'bg-white text-[#244693]' : 'bg-[#F3F4F6] text-[#6B7280]'
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </section>

            <div className="space-y-3">
                {visibleOrders.length === 0 ? (
                    <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
                        <p className="text-sm text-[#6B7280]">
                            {hasActiveFilters
                                ? 'No orders match the selected filters'
                                : EMPTY_COPY[activeSection]}
                        </p>
                    </div>
                ) : (
                    visibleOrders.map((order) => (
                        <article
                            key={order.id ?? order.reference}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <h2 className="text-base font-bold text-[#111827]">
                                    {order.reference || order.orderNumber}
                                </h2>
                                <div className="flex items-center gap-1 text-base font-bold text-[#111827]">
                                    <span>{formatAmount(order.total)}</span>
                                    <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280]">
                                <span className="inline-flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    {order.customerName || 'Customer'}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatOrderStamp(order.orderedAt || order.dateOfOrder)}
                                </span>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    )
}

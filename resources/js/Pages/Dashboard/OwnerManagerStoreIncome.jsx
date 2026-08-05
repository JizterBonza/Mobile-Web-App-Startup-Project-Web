import { router } from '@inertiajs/react'
import { useState } from 'react'
import { ArrowLeft, ChevronDown, Store } from 'lucide-react'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
]

function formatAmount(amount) {
    return `₱${Number(amount || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

function formatTransferredAt(value) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'

    const datePart = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
    const timePart = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })

    return `${datePart} • ${timePart}`
}

function yearOptions(selectedYear) {
    const current = new Date().getFullYear()
    const years = new Set([current, current - 1, current - 2, selectedYear])
    return Array.from(years)
        .filter((year) => year >= 2000)
        .sort((a, b) => b - a)
}

export default function OwnerManagerStoreIncome({
    auth,
    shop,
    incomes = [],
    filters = {},
}) {
    const [month, setMonth] = useState(filters.month || new Date().getMonth() + 1)
    const [year, setYear] = useState(filters.year || new Date().getFullYear())
    const [expandedId, setExpandedId] = useState(null)

    const handleFilter = () => {
        router.get(
            `/dashboard/owner-manager/stores/${shop.id}/income`,
            { month, year },
            { preserveState: true, preserveScroll: true },
        )
    }

    return (
        <OwnerManagerKlasmeytLayout auth={auth} title="My Income" mainClassName="w-full px-6 py-8">
            <div className="w-full space-y-5">
                <div>
                    <button
                        type="button"
                        onClick={() => router.visit('/dashboard/owner-manager/stores')}
                        className="group mb-4 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB]"
                        title="Back to My Stores"
                        aria-label="Back to My Stores"
                    >
                        <ArrowLeft className="h-5 w-5 text-[#6B7280] transition-colors group-hover:text-[#102059]" />
                    </button>
                    <h1 className="text-2xl font-semibold text-[#102059]">My Income</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                                <Store className="w-5 h-5 text-[#6B7280]" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-[#111827] truncate">
                                    {shop.shop_name}
                                </h2>
                                <p className="text-sm text-[#6B7280] mt-0.5 leading-relaxed">
                                    {shop.shop_address || 'No address on file'}
                                </p>
                            </div>
                        </div>

                        <div className="w-full lg:w-64 shrink-0 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#5B6FA8]/30 focus:border-[#5B6FA8]"
                                >
                                    {MONTHS.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#5B6FA8]/30 focus:border-[#5B6FA8]"
                                >
                                    {yearOptions(year).map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={handleFilter}
                                className="w-full rounded-lg bg-[#5B6FA8] hover:bg-[#4A5E97] text-white text-sm font-semibold py-2.5 transition-colors"
                            >
                                Filter
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5">
                    {incomes.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm font-semibold text-[#374151]">No income records</p>
                            <p className="text-sm text-[#6B7280] mt-1">
                                There are no delivered order earnings for the selected period.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {incomes.map((income) => {
                                const isExpanded = expandedId === income.id

                                return (
                                    <div
                                        key={income.id}
                                        className="rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : income.id)
                                            }
                                            className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[#F1F5F9] transition-colors"
                                        >
                                            <div className="min-w-[140px] sm:min-w-[180px]">
                                                <p className="text-xs text-[#4B5563]">
                                                    {formatTransferredAt(income.transferred_at)}
                                                </p>
                                                <p className="text-lg sm:text-xl font-bold text-[#3F51B5] mt-1">
                                                    {formatAmount(income.amount)}
                                                </p>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[#6B7280] truncate">
                                                    {income.method}
                                                </p>
                                                <p className="text-sm text-[#6B7280] mt-0.5 truncate">
                                                    {income.account_number}
                                                </p>
                                            </div>

                                            <ChevronDown
                                                className={`w-5 h-5 text-[#3F51B5] shrink-0 transition-transform ${
                                                    isExpanded ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>

                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-1 border-t border-[#E5E7EB] bg-white">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                                            Amount
                                                        </p>
                                                        <p className="text-[#102059] mt-1 font-semibold">
                                                            {formatAmount(income.amount)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                                            Destination
                                                        </p>
                                                        <p className="text-[#102059] mt-1">
                                                            {income.method}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                                            Items Delivered
                                                        </p>
                                                        <p className="text-[#102059] mt-1">
                                                            {income.item_count}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </OwnerManagerKlasmeytLayout>
    )
}

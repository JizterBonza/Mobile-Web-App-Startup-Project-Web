import { useEffect, useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function refundsPath(userType) {
  return userType === 'admin' ? '/dashboard/admin/refunds' : '/dashboard/super-admin/refunds'
}

function statusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'refunded':
      return 'bg-[#DCFCE7] text-[#15803D]'
    case 'pending':
      return 'bg-[#FEF3C7] text-[#B45309]'
    default:
      return 'bg-[#F3F4F6] text-[#6B7280]'
  }
}

function formatAmount(amount, currency = 'PHP') {
  const value = Number(amount)
  if (Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(value)
  } catch {
    return `₱${value.toFixed(2)}`
  }
}

function formatDateTime(iso) {
  if (!iso) return { date: '—', time: '' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

function storeLabel(refund) {
  return refund.shop?.shop_name || refund.shop?.agrivet_name || 'Agrivet'
}

export default function Refunds({ auth, refunds, shops = [], summary = {}, filters = {}, flash }) {
  const errors = usePage().props.errors ?? {}
  const [shopId, setShopId] = useState(filters.shop_id ?? '')
  const [status, setStatus] = useState(filters.status ?? '')
  const [search, setSearch] = useState(filters.search ?? '')
  const [fromDate, setFromDate] = useState(filters.from_date ?? '')
  const [toDate, setToDate] = useState(filters.to_date ?? '')
  const [perPage, setPerPage] = useState(filters.per_page ?? 20)
  const [detail, setDetail] = useState(null)
  const [doneTarget, setDoneTarget] = useState(null)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [marking, setMarking] = useState(false)
  const [showSuccess, setShowSuccess] = useState(true)
  const [showError, setShowError] = useState(true)

  const baseRoute = refundsPath(auth?.user?.user_type)

  useEffect(() => {
    if (flash?.success) setShowSuccess(true)
    if (flash?.error) setShowError(true)
  }, [flash])

  const applyFilters = (e) => {
    e?.preventDefault()
    router.get(
      baseRoute,
      {
        shop_id: shopId || undefined,
        status: status || undefined,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        per_page: perPage || undefined,
      },
      { preserveState: true },
    )
  }

  const clearFilters = () => {
    setShopId('')
    setStatus('')
    setSearch('')
    setFromDate('')
    setToDate('')
    router.get(baseRoute, {}, { preserveState: false })
  }

  const openMarkRefunded = (refund) => {
    setDoneTarget(refund)
    setReference('')
    setNotes('')
  }

  const markRefunded = () => {
    if (!doneTarget) return
    setMarking(true)
    router.post(
      `${baseRoute}/${doneTarget.id}/refunded`,
      {
        refund_reference: reference || null,
        admin_notes: notes || null,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setDoneTarget(null)
          setDetail(null)
        },
        onFinish: () => setMarking(false),
      },
    )
  }

  const records = refunds?.data ?? []
  const hasFilters = shopId || status || search || fromDate || toDate
  const links = refunds?.links ?? []
  const prevLink = links[0]
  const nextLink = links[links.length - 1]
  const currentPage = refunds?.current_page ?? 1
  const lastPage = refunds?.last_page ?? 1
  const total = refunds?.total ?? records.length
  const from = refunds?.from ?? (records.length ? 1 : 0)
  const to = refunds?.to ?? records.length
  const pendingCount = summary.pending_count ?? 0
  const pendingAmount = summary.pending_amount ?? 0

  const inputClass =
    'rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
  const labelClass = 'block text-xs font-semibold text-[#6B7280] mb-1'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Refunds">
      <div>
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Refunds</h1>
          <p className="text-sm text-[#6B7280]">
            Paid orders cancelled by an Agrivet. Send the refund manually, then mark it here.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Waiting</div>
            <div className="mt-1 text-2xl font-semibold text-[#102059]">{pendingCount}</div>
            <div className="text-sm text-[#6B7280]">orders that still need a manual refund</div>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Amount waiting</div>
            <div className="mt-1 text-2xl font-semibold text-[#102059]">{formatAmount(pendingAmount)}</div>
            <div className="text-sm text-[#6B7280]">suggested total still marked pending</div>
          </div>
        </div>

        {flash?.success && showSuccess && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
            <span>{flash.success}</span>
            <button type="button" className="shrink-0 font-semibold text-emerald-800" onClick={() => setShowSuccess(false)}>
              Dismiss
            </button>
          </div>
        )}
        {flash?.error && showError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            <span>{flash.error}</span>
            <button type="button" className="shrink-0 font-semibold text-red-800" onClick={() => setShowError(false)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white px-6 py-4">
          <form onSubmit={applyFilters}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#102059]">Filters</span>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#E20E28] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="col-span-2 md:col-span-1 lg:col-span-2">
                <label className={labelClass}>Search</label>
                <input
                  type="search"
                  className={inputClass + ' w-full'}
                  placeholder="Order, customer, or Agrivet"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Agrivet</label>
                <select className={inputClass + ' w-full'} value={shopId} onChange={(e) => setShopId(e.target.value)}>
                  <option value="">All Agrivets</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.shop_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass + ' w-full'} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>From date</label>
                <input type="date" className={inputClass + ' w-full'} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>To date</label>
                <input type="date" className={inputClass + ' w-full'} value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <label className={labelClass}>Per page</label>
                <select className={inputClass} value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#244693] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#102059]"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="divide-y divide-[#E5E7EB]">
            {records.length > 0 ? (
              records.map((record) => {
                const { date, time } = formatDateTime(record.created_at)
                const name = storeLabel(record)
                const pending = (record.status || '').toLowerCase() === 'pending'
                return (
                  <div key={record.id} className={`px-6 py-4 ${pending ? 'border-l-4 border-l-[#D97706]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#102059]">
                        <span className="text-xs font-bold text-white">{name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-2 lg:grid-cols-[1.4fr_1fr_120px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{name}</div>
                          <div className="truncate text-sm text-[#6B7280]">{record.order_code}</div>
                          <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                            {record.customer?.name || 'Customer'}
                          </div>
                          <div className="truncate text-xs font-medium text-[#102059]">
                            {record.customer?.contact_number || 'No contact number'}
                          </div>
                          {record.reason && (
                            <div className="mt-0.5 truncate text-xs text-[#9CA3AF]">{record.reason}</div>
                          )}
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">
                            {date} {time}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#102059]">
                            {formatAmount(record.amount, record.currency)}
                          </div>
                          <div className="text-xs capitalize text-[#9CA3AF]">{record.payment_method || 'Payment method unavailable'}</div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(record.status)}`}>
                            {record.status || '—'}
                          </span>
                        </div>
                        <div className="hidden lg:block">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Cancelled</div>
                          <div className="mt-0.5 text-xs text-[#9CA3AF]">{date}</div>
                          {time && <div className="text-xs text-[#9CA3AF]">{time}</div>}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {pending && (
                            <button
                              type="button"
                              onClick={() => openMarkRefunded(record)}
                              className="whitespace-nowrap rounded-lg bg-[#15803D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534]"
                            >
                              Mark refunded
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetail(record)}
                            className="whitespace-nowrap rounded-lg border border-[#244693] px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">
                  {hasFilters ? 'No refunds match these filters.' : 'No Agrivet cancellations are waiting for a refund.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">{total === 0 ? '0' : `${from}-${to}`}</span> of{' '}
              <span className="font-semibold text-[#102059]">{total}</span> records
            </p>
            {lastPage > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!prevLink?.url}
                  onClick={() => prevLink?.url && router.visit(prevLink.url, { preserveState: true })}
                >
                  Previous
                </button>
                <span className="text-xs text-[#6B7280]">
                  Page {currentPage} of {lastPage}
                </span>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!nextLink?.url}
                  onClick={() => nextLink?.url && router.visit(nextLink.url, { preserveState: true })}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 cursor-default bg-black/40" aria-label="Close refund details" onClick={() => setDetail(null)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <h2 className="text-base font-semibold text-[#102059]">Refund details</h2>
              <button type="button" className="text-sm font-semibold text-[#6B7280]" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[#374151]">
              <DetailRow label="Order" value={detail.order_code} />
              <DetailRow label="Agrivet" value={storeLabel(detail)} />
              {detail.shop?.agrivet_name && detail.shop.agrivet_name !== detail.shop.shop_name && (
                <DetailRow label="Business" value={detail.shop.agrivet_name} />
              )}
              <DetailRow label="Customer" value={detail.customer?.name || '—'} />
              <DetailRow label="Contact number" value={detail.customer?.contact_number || '—'} />
              <DetailRow label="Email" value={detail.customer?.email || '—'} />
              <DetailRow label="Cancelled by" value={detail.cancelled_by || '—'} />
              <DetailRow label="Reason" value={detail.reason || '—'} />
              <DetailRow label="Payment method" value={detail.payment_method || '—'} />
              <DetailRow label="Payment reference" value={detail.payment_reference || '—'} />
              <DetailRow label="Amount paid" value={formatAmount(detail.paid_amount, detail.currency)} />
              <DetailRow label="Suggested refund" value={formatAmount(detail.amount, detail.currency)} />
              <DetailRow label="Item total" value={formatAmount(detail.merchandise_amount, detail.currency)} />
              <p className="text-xs text-[#6B7280]">
                The suggested refund is this Agrivet&apos;s share of what the customer paid. The last cancelled store in an order receives any paid amount still unassigned, including delivery fees.
              </p>
              {detail.items?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Items</div>
                  <ul className="space-y-1">
                    {detail.items.map((item, index) => (
                      <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
                        <span>{item.quantity} × {item.name}</span>
                        <span className="shrink-0">{formatAmount(item.line_total, detail.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <DetailRow label="Status" value={detail.status} />
              {detail.status === 'refunded' && (
                <>
                  <DetailRow label="Refund reference" value={detail.refund_reference || '—'} />
                  <DetailRow label="Notes" value={detail.admin_notes || '—'} />
                  <DetailRow label="Recorded by" value={detail.refunded_by || '—'} />
                  <DetailRow
                    label="Recorded"
                    value={`${formatDateTime(detail.refunded_at).date} ${formatDateTime(detail.refunded_at).time}`.trim()}
                  />
                </>
              )}
            </div>
            {detail.status === 'pending' && (
              <div className="flex justify-end border-t border-[#E5E7EB] px-5 py-3">
                <button
                  type="button"
                  onClick={() => openMarkRefunded(detail)}
                  className="rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
                >
                  Mark refunded
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {doneTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/40"
            aria-label="Cancel refund confirmation"
            onClick={() => !marking && setDoneTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="border-b border-[#E5E7EB] px-5 py-4">
              <h2 className="text-base font-semibold text-[#102059]">Mark refund as sent</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[#374151]">
              <p>
                Record that the manual refund for <span className="font-semibold text-[#102059]">{doneTarget.order_code}</span> was sent.
              </p>
              <p className="font-semibold text-[#102059]">{formatAmount(doneTarget.amount, doneTarget.currency)}</p>
              <p className="text-xs text-[#6B7280]">This does not send money. It records the refund after you send it through the original payment method.</p>
              <div>
                <label className={labelClass} htmlFor="refund-reference">Refund reference</label>
                <input
                  id="refund-reference"
                  className={inputClass + ' w-full'}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Provider reference or receipt number"
                />
                {errors.refund_reference && <p className="mt-1 text-xs text-[#B91C1C]">{errors.refund_reference}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="refund-notes">Notes</label>
                <textarea
                  id="refund-notes"
                  className={inputClass + ' w-full'}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note for the activity log"
                />
                {errors.admin_notes && <p className="mt-1 text-xs text-[#B91C1C]">{errors.admin_notes}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-5 py-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50"
                disabled={marking}
                onClick={() => setDoneTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534] disabled:opacity-50"
                disabled={marking}
                onClick={markRefunded}
              >
                {marking ? 'Saving' : 'Mark refunded'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminOrAdminLayout>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">{label}</span>
      <span className="text-right text-sm text-[#102059]">{value}</span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'
import VendorKlasmeytLayout from '../../Layouts/VendorKlasmeytLayout'

function payoutRecordsPath(userType) {
  switch (userType) {
    case 'admin':
      return '/dashboard/admin/payout-records'
    case 'owner_manager':
      return '/dashboard/owner-manager/payout-records'
    case 'vendor':
      return '/dashboard/vendor/payout-records'
    default:
      return '/dashboard/super-admin/payout-records'
  }
}

function statusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
    case 'paid':
    case 'success':
    case 'delivered':
      return 'bg-[#DCFCE7] text-[#15803D]'
    case 'failed':
    case 'cancelled':
      return 'bg-[#FEE2E2] text-[#B91C1C]'
    case 'pending':
    case 'processing':
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

function maskAccount(number) {
  const value = String(number || '')
  if (!value) return '—'
  if (value.length <= 4) return value
  return `•••• ${value.slice(-4)}`
}

function formatDateTime(iso) {
  if (!iso) return { date: '—', time: '' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

function saleReferences(sale) {
  return [
    sale.order_id ? { label: 'Order ID', value: String(sale.order_id) } : null,
    sale.payment_id ? { label: 'Payment ID', value: sale.payment_id } : null,
    sale.payment_intent_id ? { label: 'Payment intent', value: sale.payment_intent_id } : null,
    sale.checkout_session_id ? { label: 'Checkout session', value: sale.checkout_session_id } : null,
  ].filter(Boolean)
}

function PayoutRecordsLayout({ auth, children }) {
  const type = auth?.user?.user_type
  if (type === 'owner_manager') {
    return (
      <OwnerManagerKlasmeytLayout auth={auth} title="Payout Records">
        {children}
      </OwnerManagerKlasmeytLayout>
    )
  }
  if (type === 'vendor') {
    return (
      <VendorKlasmeytLayout auth={auth} title="Payout Records">
        {children}
      </VendorKlasmeytLayout>
    )
  }
  return (
    <SuperAdminOrAdminLayout auth={auth} title="Payout Records">
      {children}
    </SuperAdminOrAdminLayout>
  )
}

export default function PayoutRecords({
  auth,
  payouts,
  shops = [],
  canFilterShops = false,
  canRunManualPayout = false,
  filters = {},
  flash,
}) {
  const [shopId, setShopId] = useState(filters.shop_id ?? '')
  const [status, setStatus] = useState(filters.status ?? '')
  const [fromDate, setFromDate] = useState(filters.from_date ?? '')
  const [toDate, setToDate] = useState(filters.to_date ?? '')
  const [perPage, setPerPage] = useState(filters.per_page ?? 20)
  const [detail, setDetail] = useState(null)
  const [confirmRun, setConfirmRun] = useState(false)
  const [running, setRunning] = useState(false)
  const [doneTarget, setDoneTarget] = useState(null)
  const [markingDone, setMarkingDone] = useState(false)
  const [showSuccess, setShowSuccess] = useState(true)
  const [showError, setShowError] = useState(true)

  const baseRoute = payoutRecordsPath(auth?.user?.user_type)
  const selectedShop = shops.find((shop) => String(shop.id) === String(shopId))

  useEffect(() => {
    if (flash?.success) setShowSuccess(true)
    if (flash?.error) setShowError(true)
  }, [flash])

  const markPayoutDone = () => {
    if (!doneTarget?.reference_number) return
    setMarkingDone(true)
    router.post(
      `${baseRoute}/done`,
      { reference_number: doneTarget.reference_number },
      {
        preserveScroll: true,
        onFinish: () => {
          setMarkingDone(false)
          setDoneTarget(null)
        },
      },
    )
  }

  const runManualPayout = () => {
    setRunning(true)
    router.post(
      `${baseRoute}/run`,
      { shop_id: shopId || undefined },
      {
        preserveScroll: true,
        onFinish: () => {
          setRunning(false)
          setConfirmRun(false)
        },
      },
    )
  }

  const applyFilters = (e) => {
    e?.preventDefault()
    router.get(
      baseRoute,
      {
        shop_id: shopId || undefined,
        status: status || undefined,
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
    setFromDate('')
    setToDate('')
    router.get(baseRoute, {}, { preserveState: false })
  }

  const goToPage = (url) => {
    if (url) router.visit(url, { preserveState: true })
  }

  const records = payouts?.data ?? []
  const hasFilters = shopId || status || fromDate || toDate

  const links = payouts?.links ?? []
  const prevLink = links[0]
  const nextLink = links[links.length - 1]
  const currentPage = payouts?.current_page ?? 1
  const lastPage = payouts?.last_page ?? 1
  const total = payouts?.total ?? records.length
  const from = payouts?.from ?? (records.length ? 1 : 0)
  const to = payouts?.to ?? records.length

  const inputClass =
    'rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
  const labelClass = 'block text-xs font-semibold text-[#6B7280] mb-1'

  return (
    <PayoutRecordsLayout auth={auth}>
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Payout Records</h1>
            <p className="text-sm text-[#6B7280]">
              Disbursements recorded from shop wallets to vendor bank accounts
            </p>
          </div>
          {canRunManualPayout && (
            <button
              type="button"
              onClick={() => setConfirmRun(true)}
              className="shrink-0 rounded-lg bg-[#102059] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
            >
              Manual Payout
            </button>
          )}
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
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#E20E28] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${canFilterShops ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              {canFilterShops && (
                <div>
                  <label className={labelClass}>Shop</label>
                  <select
                    className={inputClass + ' w-full'}
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                  >
                    <option value="">All shops</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.shop_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass + ' w-full'}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>From date</label>
                <input
                  type="date"
                  className={inputClass + ' w-full'}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>To date</label>
                <input
                  type="date"
                  className={inputClass + ' w-full'}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Per page</label>
                <select
                  className={inputClass + ' w-full'}
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
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
                const shopName = record.shop?.shop_name || 'Unknown shop'
                return (
                  <div key={record.id} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#102059]">
                        <span className="text-xs font-bold text-white">
                          {shopName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>

                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 gap-y-2 lg:grid-cols-[1.4fr_1fr_120px_140px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#102059]">{shopName}</div>
                          <div className="truncate text-sm text-[#6B7280]">{record.reference_number}</div>
                          <div className="mt-0.5 truncate text-xs text-[#9CA3AF]">
                            {record.destination_account_name} · {maskAccount(record.destination_account_number)}
                          </div>
                          <div className="mt-1 text-xs text-[#9CA3AF] lg:hidden">
                            {date} {time}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-semibold text-[#102059]">
                              {formatAmount(record.amount, record.currency)}
                            </div>
                            <div className="text-xs capitalize text-[#9CA3AF]">{record.provider || '—'}</div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(record.status)}`}>
                            {record.status || '—'}
                          </span>
                        </div>

                        <div className="hidden items-center lg:flex">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Date</div>
                            <div className="mt-0.5 text-xs text-[#9CA3AF]">{date}</div>
                            {time && <div className="text-xs text-[#9CA3AF]">{time}</div>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canRunManualPayout && (record.status || '').toLowerCase() === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setDoneTarget(record)}
                              className="whitespace-nowrap rounded-lg bg-[#15803D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534]"
                            >
                              Done Payout
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetail(record)}
                            className="whitespace-nowrap rounded-lg border border-[#244693] px-3 py-1.5 text-xs font-semibold text-[#244693] transition-colors hover:bg-[#F3F4F6]"
                          >
                            Payout Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">No payout records found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B7280]">
              Showing{' '}
              <span className="font-semibold text-[#102059]">
                {total === 0 ? '0' : `${from}-${to}`}
              </span>{' '}
              of <span className="font-semibold text-[#102059]">{total}</span> records
            </p>

            {lastPage > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!prevLink?.url}
                  onClick={() => goToPage(prevLink?.url)}
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
                  onClick={() => goToPage(nextLink?.url)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {doneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/40"
            aria-label="Cancel done payout"
            onClick={() => !markingDone && setDoneTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="border-b border-[#E5E7EB] px-5 py-4">
              <h2 className="text-base font-semibold text-[#102059]">Done payout</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[#374151]">
              <p>
                Mark <span className="font-semibold text-[#102059]">{doneTarget.reference_number}</span> as success?
              </p>
              <p>The pending payout status becomes success.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-5 py-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50"
                disabled={markingDone}
                onClick={() => setDoneTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534] disabled:opacity-50"
                disabled={markingDone}
                onClick={markPayoutDone}
              >
                {markingDone ? 'Saving…' : 'Done Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/40"
            aria-label="Cancel manual payout"
            onClick={() => !running && setConfirmRun(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="border-b border-[#E5E7EB] px-5 py-4">
              <h2 className="text-base font-semibold text-[#102059]">Create manual payout</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[#374151]">
              <p>
                {selectedShop
                  ? `This runs the payout disbursement for ${selectedShop.shop_name}.`
                  : 'This runs the payout disbursement for every shop with a payable wallet balance.'}
              </p>
              <p>
                Eligible balances are recorded as pending payouts and cleared from the shop wallet.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-5 py-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50"
                disabled={running}
                onClick={() => setConfirmRun(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#102059] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244693] disabled:opacity-50"
                disabled={running}
                onClick={runManualPayout}
              >
                {running ? 'Creating…' : 'Create payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/40"
            aria-label="Close payout details"
            onClick={() => setDetail(null)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#102059]">Payout Details</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {detail.shop?.shop_name || 'Shop'} · {detail.reference_number} · {formatAmount(detail.amount, detail.currency)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-lg leading-none text-[#6B7280] hover:bg-[#F3F4F6]"
                onClick={() => setDetail(null)}
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <h3 className="mb-3 text-sm font-semibold text-[#102059]">Sales Covered</h3>
              {(detail.sales ?? []).length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#F9FAFB] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2">Order No.</th>
                        <th className="whitespace-nowrap px-3 py-2">Customer</th>
                        <th className="whitespace-nowrap px-3 py-2">Reference</th>
                        <th className="whitespace-nowrap px-3 py-2">Order Amount (₱)</th>
                        <th className="whitespace-nowrap px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {detail.sales.map((sale) => {
                        const references = saleReferences(sale)
                        return (
                          <tr key={sale.order_id || sale.order_no}>
                            <td className="whitespace-nowrap px-3 py-2 font-medium text-[#102059]">{sale.order_no}</td>
                            <td className="px-3 py-2 text-[#102059]">{sale.customer}</td>
                            <td className="min-w-[11rem] max-w-[16rem] px-3 py-2">
                              {references.length > 0 ? (
                                <div className="space-y-1">
                                  {references.map((reference) => (
                                    <div key={reference.label} className="text-xs leading-4 text-[#102059]">
                                      <div className="text-[#9CA3AF]">{reference.label}</div>
                                      <div className="break-all font-medium">{reference.value}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[#9CA3AF]">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-semibold text-[#102059]">{formatAmount(sale.amount)}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(sale.status)}`}>
                                {sale.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[#E5E7EB] px-4 py-8 text-center text-sm text-[#9CA3AF]">
                  No sales were recorded for this payout.
                </p>
              )}
            </div>
            <div className="border-t border-[#E5E7EB] px-5 py-3 text-right">
              <button
                type="button"
                className="rounded-lg bg-[#244693] px-4 py-2 text-sm font-semibold text-white hover:bg-[#102059]"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PayoutRecordsLayout>
  )
}

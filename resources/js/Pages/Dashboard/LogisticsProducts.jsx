import { useMemo, useState } from 'react'
import { router } from '@inertiajs/react'
import { Package, X } from 'lucide-react'
import LogisticsCoordinationNav, { logisticsBasePath } from '../../Components/Dashboard/LogisticsCoordinationNav'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function peso(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusClass(status) {
  return String(status || '').toLowerCase() === 'active'
    ? 'bg-[#DCFCE7] text-[#15803D]'
    : 'bg-[#F3F4F6] text-[#6B7280]'
}

function ProductImage({ src, name }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#E8EEF9] text-[#102059]">
        <Package className="h-5 w-5" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export default function LogisticsProducts({
  auth,
  products,
  shops = [],
  agrivets = [],
  summary = {},
  filters = {},
}) {
  const base = logisticsBasePath(auth?.user?.user_type)
  const [search, setSearch] = useState(filters.q ?? '')
  const [agrivetId, setAgrivetId] = useState(filters.agrivet_id ?? '')
  const [shopId, setShopId] = useState(filters.shop_id ?? '')
  const [status, setStatus] = useState(filters.status ?? '')
  const [detail, setDetail] = useState(null)

  const storeOptions = useMemo(() => {
    if (!agrivetId) return shops
    return shops.filter((shop) => String(shop.agrivet_id) === String(agrivetId))
  }, [agrivetId, shops])

  const records = products?.data ?? []
  const links = products?.links ?? []
  const prevLink = links[0]
  const nextLink = links[links.length - 1]
  const currentPage = products?.current_page ?? 1
  const lastPage = products?.last_page ?? 1
  const total = products?.total ?? records.length
  const from = products?.from ?? (records.length ? 1 : 0)
  const to = products?.to ?? records.length
  const hasFilters = search || agrivetId || shopId || status

  const inputClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#102059] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
  const labelClass = 'mb-1 block text-xs font-semibold text-[#6B7280]'

  const applyFilters = (event) => {
    event?.preventDefault()
    router.get(
      `${base}/products`,
      {
        q: search || undefined,
        agrivet_id: agrivetId || undefined,
        shop_id: shopId || undefined,
        status: status || undefined,
      },
      { preserveState: true, preserveScroll: true },
    )
  }

  const clearFilters = () => {
    setSearch('')
    setAgrivetId('')
    setShopId('')
    setStatus('')
    router.get(`${base}/products`, {}, { preserveScroll: true })
  }

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Logistics Coordination">
      <LogisticsCoordinationNav userType={auth?.user?.user_type} active="products" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Listings', summary.total ?? 0, 'products across Agrivet stores'],
          ['Active', summary.active ?? 0, 'currently available to customers'],
          ['Inactive', summary.inactive ?? 0, 'hidden from the store'],
          ['Out of stock', summary.out_of_stock ?? 0, 'listings with no remaining quantity'],
        ].map(([label, value, caption]) => (
          <div key={label} className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-[#102059]">{value}</div>
            <div className="text-sm text-[#6B7280]">{caption}</div>
          </div>
        ))}
      </div>

      <form onSubmit={applyFilters} className="mb-6 rounded-lg border border-[#E5E7EB] bg-white px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#102059]">Filters</span>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#E20E28] hover:underline">
              Clear filters
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass} htmlFor="logistics-product-search">Search</label>
            <input
              id="logistics-product-search"
              type="search"
              className={inputClass}
              placeholder="Product, store, or Agrivet"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="logistics-product-agrivet">Agrivet</label>
            <select
              id="logistics-product-agrivet"
              className={inputClass}
              value={agrivetId}
              onChange={(event) => {
                setAgrivetId(event.target.value)
                setShopId('')
              }}
            >
              <option value="">All Agrivets</option>
              {agrivets.map((agrivet) => (
                <option key={agrivet.id} value={String(agrivet.id)}>{agrivet.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="logistics-product-store">Store</label>
            <select
              id="logistics-product-store"
              className={inputClass}
              value={shopId}
              onChange={(event) => setShopId(event.target.value)}
            >
              <option value="">All stores</option>
              {storeOptions.map((shop) => (
                <option key={shop.id} value={String(shop.id)}>
                  {shop.shop_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="logistics-product-status">Status</label>
            <select
              id="logistics-product-status"
              className={inputClass}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-[#102059] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c1844]"
          >
            Apply filters
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Customer price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Sold</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">
                    No Agrivet store products match these filters.
                  </td>
                </tr>
              ) : (
                records.map((product) => (
                  <tr key={product.id} className="border-b border-[#E5E7EB] last:border-b-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => setDetail(product)}
                      >
                        <ProductImage src={product.images?.[0]} name={product.name} />
                        <span>
                          <span className="block font-semibold text-[#102059]">{product.name}</span>
                          <span className="block text-xs text-[#6B7280]">
                            {product.category_name || 'Uncategorized'}
                            {product.is_bundle ? ' · Bundle' : ''}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#102059]">{product.shop?.name}</div>
                      <div className="text-xs text-[#6B7280]">{product.agrivet?.name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-[#102059]">{product.quantity}</td>
                    <td className="px-4 py-3 text-[#102059]">{peso(product.customer_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(product.status)}`}>
                        {product.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#102059]">{product.sold_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] px-4 py-3 text-sm text-[#6B7280]">
          <span>
            {total === 0 ? 'No products' : `${from}–${to} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!prevLink?.url || currentPage <= 1}
              onClick={() => prevLink?.url && router.visit(prevLink.url, { preserveState: true, preserveScroll: true })}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 font-semibold text-[#102059] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs">
              {currentPage} / {lastPage}
            </span>
            <button
              type="button"
              disabled={!nextLink?.url || currentPage >= lastPage}
              onClick={() => nextLink?.url && router.visit(nextLink.url, { preserveState: true, preserveScroll: true })}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 font-semibold text-[#102059] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#102059]/40 p-4 sm:items-center">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close product details" onClick={() => setDetail(null)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="logistics-product-title">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="logistics-product-title" className="text-lg font-semibold text-[#102059]">{detail.name}</h2>
              <button type="button" className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F3F4F6]" onClick={() => setDetail(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {detail.images?.[0] && (
              <img src={detail.images[0]} alt="" className="mb-4 h-48 w-full rounded-lg object-cover" />
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Store</dt>
                <dd className="text-[#102059]">{detail.shop?.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Agrivet</dt>
                <dd className="text-[#102059]">{detail.agrivet?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Customer price</dt>
                <dd className="text-[#102059]">{peso(detail.customer_price)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Store price</dt>
                <dd className="text-[#102059]">{peso(detail.store_price)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Stock</dt>
                <dd className="text-[#102059]">{detail.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Status</dt>
                <dd className="capitalize text-[#102059]">{detail.status || 'unknown'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Sold</dt>
                <dd className="text-[#102059]">{detail.sold_count}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Rating</dt>
                <dd className="text-[#102059]">
                  {Number(detail.average_rating || 0).toFixed(1)} ({detail.total_reviews} reviews)
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Category</dt>
                <dd className="text-[#102059]">{detail.category_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Weight</dt>
                <dd className="text-[#102059]">
                  {detail.weight != null ? `${detail.weight} ${detail.metric || ''}`.trim() : '—'}
                </dd>
              </div>
            </dl>
            {detail.discount_percent > 0 && (
              <p className="mt-4 text-sm text-[#102059]">Active discount: {detail.discount_percent}%</p>
            )}
            {detail.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm text-[#374151]">{detail.description}</p>
            )}
          </div>
        </div>
      )}
    </SuperAdminOrAdminLayout>
  )
}

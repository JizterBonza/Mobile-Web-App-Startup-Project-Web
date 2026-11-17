import { useMemo, useState } from 'react'
import { usePage } from '@inertiajs/react'
import OwnerManagerOrdersPanel from '../../Components/Dashboard/OwnerManagerOrdersPanel'
import LogisticsCoordinationNav, { logisticsBasePath } from '../../Components/Dashboard/LogisticsCoordinationNav'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

export default function LogisticsOrders({
  auth,
  orders = [],
  deliveryMethods = [],
  preparingItemStatusId = null,
  shops = [],
  agrivets = [],
  flash,
}) {
  const errors = usePage().props.errors ?? {}
  const [agrivetId, setAgrivetId] = useState('')
  const [shopId, setShopId] = useState('')
  const base = logisticsBasePath(auth?.user?.user_type)
  const errorMessage = Object.values(errors).flat().find((message) => typeof message === 'string' && message !== '')

  const storeOptions = useMemo(() => {
    if (!agrivetId) return shops
    return shops.filter((shop) => String(shop.agrivet_id) === agrivetId)
  }, [agrivetId, shops])

  const visibleOrders = useMemo(() => {
    const allowedShopIds = new Set(
      (agrivetId ? storeOptions : shopId ? shops.filter((shop) => String(shop.id) === shopId) : shops).map((shop) => shop.id),
    )

    return orders.filter((order) => {
      const orderShopIds = order.shopIds ?? []
      if (shopId && !orderShopIds.map(String).includes(shopId)) return false
      if (agrivetId && !orderShopIds.some((id) => allowedShopIds.has(id))) return false
      return true
    })
  }, [agrivetId, orders, shopId, shops, storeOptions])

  const selectClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#102059] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'

  return (
    <SuperAdminOrAdminLayout auth={auth} title="Logistics Coordination">
      <LogisticsCoordinationNav userType={auth?.user?.user_type} active="orders" />

      {flash?.success && (
        <div className="mb-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]" role="status">
          {flash.success}
        </div>
      )}
      {(flash?.error || errorMessage) && (
        <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]" role="alert">
          {flash?.error || errorMessage}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[#102059]">Store</span>
          {(agrivetId || shopId) && (
            <button
              type="button"
              className="text-xs font-semibold text-[#E20E28] hover:underline"
              onClick={() => {
                setAgrivetId('')
                setShopId('')
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[#6B7280]">
            Agrivet
            <select
              className={`${selectClass} mt-1`}
              value={agrivetId}
              onChange={(event) => {
                setAgrivetId(event.target.value)
                setShopId('')
              }}
            >
              <option value="">All Agrivets</option>
              {agrivets.map((agrivet) => (
                <option key={agrivet.id} value={String(agrivet.id)}>
                  {agrivet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#6B7280]">
            Store
            <select
              className={`${selectClass} mt-1`}
              value={shopId}
              onChange={(event) => setShopId(event.target.value)}
            >
              <option value="">All stores</option>
              {storeOptions.map((shop) => (
                <option key={shop.id} value={String(shop.id)}>
                  {shop.shop_name}
                  {shop.agrivet_name ? ` — ${shop.agrivet_name}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-[#6B7280]">
          Showing {visibleOrders.length} of {orders.length} {orders.length === 1 ? 'order' : 'orders'}.
        </p>
      </div>

      <OwnerManagerOrdersPanel
        orders={visibleOrders}
        deliveryMethods={deliveryMethods}
        preparingItemStatusId={preparingItemStatusId}
        ordersApiBasePath={`${base}/orders`}
        canPerformOrderActions
        subtitle="Monitor and manage paid orders from every Agrivet store."
      />
    </SuperAdminOrAdminLayout>
  )
}

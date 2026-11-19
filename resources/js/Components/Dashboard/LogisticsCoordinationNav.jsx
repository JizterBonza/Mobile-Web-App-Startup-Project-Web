import { Link } from '@inertiajs/react'

export function logisticsBasePath(userType) {
  return userType === 'admin' ? '/dashboard/admin/logistics' : '/dashboard/super-admin/logistics'
}

export default function LogisticsCoordinationNav({ userType, active }) {
  const base = logisticsBasePath(userType)
  const tabs = [
    { id: 'orders', label: 'Order Management', href: base },
    { id: 'products', label: 'Agrivet Store Products', href: `${base}/products` },
  ]

  return (
    <div className="mb-6">
      <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Logistics Coordination</h1>
      <p className="mb-4 text-sm text-[#6B7280]">
        Monitor Agrivet store orders and the products listed in every store.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Logistics Coordination">
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              fontFamily: 'Inter Condensed, sans-serif',
              backgroundColor: selected ? '#102059' : '#ffffff',
              color: selected ? '#ffffff' : '#102059',
              borderColor: selected ? '#102059' : '#E5E7EB',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
      </div>
    </div>
  )
}

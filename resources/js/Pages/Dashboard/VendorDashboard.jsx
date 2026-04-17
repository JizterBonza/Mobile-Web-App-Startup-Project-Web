import { Link } from '@inertiajs/react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import { KlasmeytStatCard } from '../../Components/Dashboard/KlasmeytStatCard'
import { useDashboardSession } from '../../hooks/useDashboardSession'

export default function VendorDashboard({ auth, shop, agrivet, stats = {} }) {
    const { sessionValid } = useDashboardSession()

    return (
        <KlasmeytDashboardLayout auth={auth} title="Vendor Dashboard">
            {!shop && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                >
                    <p className="font-semibold">No shop assigned</p>
                    <p className="mt-1 text-amber-800">
                        Contact an administrator to link your account to a store.
                    </p>
                </div>
            )}

            {shop && (
                <section className="mb-8 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[#102059] sm:text-xl">{shop.shop_name}</h2>
                            {shop.shop_description && (
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
                                    {shop.shop_description}
                                </p>
                            )}
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                                shop.shop_status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                        >
                            {shop.shop_status}
                        </span>
                    </div>
                    <div className="mt-6 grid gap-4 border-t border-[#F3F4F6] pt-6 sm:grid-cols-2">
                        {shop.shop_address && (
                            <p className="text-sm text-[#6B7280]">
                                <i className="fas fa-map-marker-alt mr-2 text-[#102059]/60" />
                                {shop.shop_address}
                            </p>
                        )}
                        {agrivet && (
                            <p className="text-sm text-[#6B7280]">
                                <i className="fas fa-building mr-2 text-[#102059]/60" />
                                <span className="font-medium text-[#102059]">Agrivet:</span> {agrivet.name}
                            </p>
                        )}
                        <p className="text-sm text-[#6B7280] sm:col-span-2">
                            <i className="fas fa-star mr-2 text-amber-500" />
                            <span className="font-medium text-[#102059]">Rating:</span>{' '}
                            {parseFloat(shop.average_rating || 0).toFixed(1)} ({shop.total_reviews || 0}{' '}
                            reviews)
                        </p>
                    </div>
                </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KlasmeytStatCard
                    label="New orders"
                    value={String(stats.new_orders || 0)}
                    iconClass="fas fa-shopping-bag"
                    href="/dashboard/vendor/orders"
                />
                <KlasmeytStatCard
                    label="Products"
                    value={String(stats.products || 0)}
                    iconClass="fas fa-box"
                    href="/dashboard/vendor/products"
                />
                <KlasmeytStatCard
                    label="Pending reviews"
                    value={String(stats.pending_reviews || 0)}
                    iconClass="fas fa-star"
                />
                <KlasmeytStatCard
                    label="Total revenue"
                    value={`$${parseFloat(stats.total_revenue || 0).toFixed(2)}`}
                    iconClass="fas fa-dollar-sign"
                    href="/dashboard/vendor/payouts"
                />
            </div>

            <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#102059]">Welcome, {auth.user.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                    You are signed in as <span className="font-semibold text-[#102059]">Vendor</span>. Manage
                    listings, orders, and payouts from the sidebar.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/dashboard/vendor/products"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a2d6e]"
                    >
                        <i className="fas fa-box text-xs" />
                        Products
                    </Link>
                    <Link
                        href="/dashboard/vendor/orders"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-[#102059] transition-colors hover:bg-[#F9FAFB]"
                    >
                        <i className="fas fa-shopping-bag text-xs" />
                        Orders
                    </Link>
                </div>
                {sessionValid && (
                    <p className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                        <i className="fas fa-check-circle" />
                        Session active
                    </p>
                )}
            </section>
        </KlasmeytDashboardLayout>
    )
}

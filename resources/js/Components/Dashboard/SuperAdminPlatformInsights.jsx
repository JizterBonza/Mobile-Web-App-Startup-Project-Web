import {
    Award,
    Bike,
    Building2,
    Package,
    ShoppingCart,
    Star,
    Store,
    Stethoscope,
    TrendingUp,
    UserCog,
    Users,
} from 'lucide-react'

const defaultUserStats = {
    admins: { total: 0, active: 0, inactive: 0 },
    agrivets: { total: 0, active: 0, inactive: 0 },
    vendors: { total: 0, active: 0, inactive: 0 },
    veterinarians: { total: 0, active: 0, inactive: 0 },
    riders: { total: 0, active: 0, inactive: 0 },
}

const defaultOrderMetrics = {
    storesTotal: 0,
    storesActive: 0,
    storesTrend: '+12%',
    ordersTotal: '8,247',
    ordersMonth: '1,853',
    ordersTrend: '+24%',
    itemsSold: '42,589',
    itemsTrend: '+18%',
    avgItemsPerOrder: '5.2',
}

function StatDot({ active }) {
    return (
        <div
            className={`h-2 w-2 rounded-full ${active ? 'bg-[#00C950]' : 'bg-[#E5E7EB]'}`}
        />
    )
}

function UserRoleCard({ title, total, active, inactive, icon: Icon, iconBg }) {
    return (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="mb-3 flex items-center gap-2">
                <div className={`rounded p-2 ${iconBg}`}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[#102059]">{title}</h3>
            </div>
            <p className="mb-2 text-2xl font-bold text-[#102059]">{total}</p>
            <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                    <StatDot active />
                    <span className="text-[#6B7280]">{active} Active</span>
                </div>
                <div className="flex items-center gap-1">
                    <StatDot active={false} />
                    <span className="text-[#6B7280]">{inactive} Inactive</span>
                </div>
            </div>
        </div>
    )
}

function normalizeRoleStats(partial, defaults) {
    const s = { ...defaults, ...partial }
    return {
        total: s.total ?? 0,
        active: s.active ?? 0,
        inactive: s.inactive ?? Math.max(0, (s.total ?? 0) - (s.active ?? 0)),
    }
}

export function SuperAdminPlatformInsights({
    userStats: userStatsProp,
    orderMetrics: orderMetricsProp,
    topStores = [],
    topRiders = [],
}) {
    const userStats = {
        admins: normalizeRoleStats(userStatsProp?.admins, defaultUserStats.admins),
        agrivets: normalizeRoleStats(userStatsProp?.agrivets, defaultUserStats.agrivets),
        vendors: normalizeRoleStats(userStatsProp?.vendors, defaultUserStats.vendors),
        veterinarians: normalizeRoleStats(userStatsProp?.veterinarians, defaultUserStats.veterinarians),
        riders: normalizeRoleStats(userStatsProp?.riders, defaultUserStats.riders),
    }
    const orderMetrics = { ...defaultOrderMetrics, ...orderMetricsProp }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="mb-2 text-2xl font-semibold text-[#102059]">Platform Insights</h2>
                <p className="text-sm text-[#6B7280]">
                    Comprehensive analytics and performance metrics for Klasmeyt
                </p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-lg bg-[#EEF2FF] p-3">
                        <Users className="h-6 w-6 text-[#244693]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#102059]">User Statistics</h3>
                        <p className="text-sm text-[#6B7280]">Overview of all user accounts by role</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <UserRoleCard
                        title="Admins"
                        total={userStats.admins.total}
                        active={userStats.admins.active}
                        inactive={userStats.admins.inactive}
                        icon={UserCog}
                        iconBg="bg-[#244693]"
                    />
                    <UserRoleCard
                        title="Agrivet"
                        total={userStats.agrivets.total}
                        active={userStats.agrivets.active}
                        inactive={userStats.agrivets.inactive}
                        icon={Building2}
                        iconBg="bg-[#E20E28]"
                    />
                    <UserRoleCard
                        title="Vendors"
                        total={userStats.vendors.total}
                        active={userStats.vendors.active}
                        inactive={userStats.vendors.inactive}
                        icon={Store}
                        iconBg="bg-[#D3A218]"
                    />
                    <UserRoleCard
                        title="Veterinarians"
                        total={userStats.veterinarians.total}
                        active={userStats.veterinarians.active}
                        inactive={userStats.veterinarians.inactive}
                        icon={Stethoscope}
                        iconBg="bg-[#102059]"
                    />
                    <UserRoleCard
                        title="Rider"
                        total={userStats.riders.total}
                        active={userStats.riders.active}
                        inactive={userStats.riders.inactive}
                        icon={Bike}
                        iconBg="bg-[#244693]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-4 flex items-start justify-between">
                        <div className="rounded-lg bg-[#FFEBEE] p-3">
                            <Store className="h-6 w-6 text-[#E20E28]" />
                        </div>
                        <div className="flex items-center gap-1 text-[#00C950]">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-semibold">{orderMetrics.storesTrend}</span>
                        </div>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-[#6B7280]">Total Stores</h3>
                    <p className="mb-2 text-3xl font-bold text-[#102059]">{orderMetrics.storesTotal}</p>
                    <p className="text-xs text-[#9CA3AF]">{orderMetrics.storesActive} active stores</p>
                </div>

                <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-4 flex items-start justify-between">
                        <div className="rounded-lg bg-[#FFF4E6] p-3">
                            <ShoppingCart className="h-6 w-6 text-[#D3A218]" />
                        </div>
                        <div className="flex items-center gap-1 text-[#00C950]">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-semibold">{orderMetrics.ordersTrend}</span>
                        </div>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-[#6B7280]">Total Orders</h3>
                    <p className="mb-2 text-3xl font-bold text-[#102059]">{orderMetrics.ordersTotal}</p>
                    <p className="text-xs text-[#9CA3AF]">This month: {orderMetrics.ordersMonth} orders</p>
                </div>

                <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-4 flex items-start justify-between">
                        <div className="rounded-lg bg-[#EEF2FF] p-3">
                            <Package className="h-6 w-6 text-[#244693]" />
                        </div>
                        <div className="flex items-center gap-1 text-[#00C950]">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-semibold">{orderMetrics.itemsTrend}</span>
                        </div>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-[#6B7280]">Total Items Sold</h3>
                    <p className="mb-2 text-3xl font-bold text-[#102059]">{orderMetrics.itemsSold}</p>
                    <p className="text-xs text-[#9CA3AF]">
                        Average: {orderMetrics.avgItemsPerOrder} items per order
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-lg bg-[#E8F5E9] p-3">
                            <Award className="h-6 w-6 text-[#00C950]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#102059]">Top Performing Stores</h3>
                            <p className="text-sm text-[#6B7280]">Based on order volume and revenue</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {topStores.length > 0 ? (
                            topStores.map((store, index) => (
                                <div
                                    key={store.id ?? index}
                                    className="flex items-center gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D3A218] to-[#B8890D]">
                                        <span className="text-sm font-bold text-white">#{index + 1}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="mb-1 truncate text-sm font-bold text-[#102059]">
                                            {store.name}
                                        </p>
                                        <p className="mb-1 text-xs text-[#6B7280]">{store.agrivetName}</p>
                                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                            <span>{store.orders} orders</span>
                                            <span>•</span>
                                            <span>{store.products} products</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#00C950]">{store.revenue}</p>
                                        <p className="text-xs text-[#6B7280]">revenue</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <Store className="mx-auto mb-3 h-12 w-12 text-[#E5E7EB]" />
                                <p className="text-sm text-[#6B7280]">No store performance data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-lg bg-[#EEF2FF] p-3">
                            <Bike className="h-6 w-6 text-[#244693]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#102059]">Top Riders by Deliveries</h3>
                            <p className="text-sm text-[#6B7280]">Most active delivery riders</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {topRiders.length > 0 ? (
                            topRiders.map((rider, index) => (
                                <div
                                    key={rider.id ?? index}
                                    className="flex items-center gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#244693] to-[#102059]">
                                        <span className="text-sm font-bold text-white">#{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="mb-1 text-sm font-bold text-[#102059]">{rider.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-[#D3A218] text-[#D3A218]" />
                                                <span>{rider.rating}</span>
                                            </div>
                                            <span>•</span>
                                            <span>{rider.successRate}% success</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-[#244693]">{rider.deliveries}</p>
                                        <p className="text-xs text-[#6B7280]">deliveries</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <Bike className="mx-auto mb-3 h-12 w-12 text-[#E5E7EB]" />
                                <p className="text-sm text-[#6B7280]">No riders registered yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

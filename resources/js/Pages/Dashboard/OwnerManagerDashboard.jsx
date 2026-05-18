import { useState } from 'react'
import { Head } from '@inertiajs/react'
import {
    Activity,
    ArrowUpRight,
    Award,
    BarChart3,
    DollarSign,
    Package,
    ShoppingCart,
    Star,
    Store,
    TrendingUp,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react'
import { DashboardHeader } from '../../Components/Dashboard/DashboardHeader'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const NAV_ITEMS = [
    { label: 'Dashboard', id: 'dashboard', href: '/dashboard/owner-manager' },
    { label: 'Stores', id: 'stores', href: '/dashboard/owner-manager/stores' },
    { label: 'Orders', id: 'orders', href: '/dashboard/owner-manager/orders' },
]

export default function OwnerManagerDashboard({ auth, agrivet, shops = [], stats = {} }) {
    useDashboardSession()

    const [timePeriod, setTimePeriod] = useState('month')

    const totalOrders = stats.total_orders ?? 0
    const itemsSold = stats.items_sold ?? 0
    const totalRevenue = stats.total_revenue ?? 0
    const averageRating = stats.average_rating ?? 0
    const storeStats = stats.store_stats ?? []
    const topProducts = stats.top_products ?? []
    const newCustomers = stats.new_customers ?? 0
    const returningCustomers = stats.returning_customers ?? 0
    const totalCustomers = stats.total_customers ?? 0
    const retentionRate =
        totalCustomers > 0 ? ((returningCustomers / totalCustomers) * 100).toFixed(1) : '0'
    const topBuyers = stats.top_buyers ?? []
    const revenueByCategory = stats.revenue_by_category ?? []

    return (
        <>
            <Head title="Owner Manager Dashboard" />
            <div className="klasmeyt-landing min-h-screen bg-[#F8F9FB]">
                <DashboardHeader
                    navigationItems={NAV_ITEMS}
                    userName={auth.user.name}
                    userEmail={auth.user.email}
                    notificationCount={0}
                />

                <main className="w-full px-6 py-8">
                    {!agrivet && (
                        <div
                            role="alert"
                            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                        >
                            <p className="font-semibold">No Agrivet linked</p>
                            <p className="mt-1 text-amber-800">
                                Your account is not linked to an Agrivet business. Please contact an
                                administrator.
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Page Header with Time Period Filter */}
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-semibold text-[#102059] mb-2">
                                    Business Insights
                                </h1>
                                <p className="text-sm text-[#6B7280]">
                                    Comprehensive analytics and performance metrics across all{' '}
                                    {shops.length} {shops.length === 1 ? 'store' : 'stores'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E5E7EB] p-1">
                                {[
                                    { value: 'day', label: 'Today' },
                                    { value: 'week', label: 'This Week' },
                                    { value: 'month', label: 'This Month' },
                                    { value: 'year', label: 'This Year' },
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setTimePeriod(value)}
                                        className={`px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                                            timePeriod === value
                                                ? 'bg-[#102059] text-white'
                                                : 'bg-transparent text-[#6B7280] hover:bg-[#F9FAFB]'
                                        }`}
                                        style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Multi-Store Performance Overview */}
                        {shops.length > 0 && (
                            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-[#EEF2FF] rounded-lg">
                                        <Store className="w-6 h-6 text-[#244693]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#102059]">
                                            Store Performance Overview
                                        </h2>
                                        <p className="text-sm text-[#6B7280]">
                                            Compare performance across all store locations
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {shops.map((shop, index) => {
                                        const storeStat =
                                            storeStats.find((s) => s.id === shop.id) ?? {}
                                        const storeRevenue = storeStat.revenue ?? 0
                                        const storeOrders = storeStat.orders ?? 0
                                        const growthRates = ['+12%', '+8%', '+15%']
                                        const growthRate = growthRates[index] ?? '+10%'

                                        return (
                                            <div
                                                key={shop.id}
                                                className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#102059] transition-all"
                                            >
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-8 h-8 bg-[#102059] rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-white">
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-bold text-[#102059] truncate">
                                                            {shop.shop_name}
                                                        </h3>
                                                        <div className="flex items-center gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`w-2.5 h-2.5 ${
                                                                        i <
                                                                        Math.floor(
                                                                            parseFloat(
                                                                                shop.average_rating,
                                                                            ) || 0,
                                                                        )
                                                                            ? 'fill-[#D3A218] text-[#D3A218]'
                                                                            : 'fill-[#E5E7EB] text-[#E5E7EB]'
                                                                    }`}
                                                                />
                                                            ))}
                                                            <span className="text-xs text-[#6B7280] ml-1">
                                                                {parseFloat(
                                                                    shop.average_rating || 0,
                                                                ).toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-[#6B7280] mb-1">
                                                            Revenue
                                                        </p>
                                                        <p className="text-base font-bold text-[#102059]">
                                                            ₱{Number(storeRevenue).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[#6B7280] mb-1">
                                                            Orders
                                                        </p>
                                                        <p className="text-base font-bold text-[#102059]">
                                                            {storeOrders}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-[#6B7280]">
                                                            Growth
                                                        </span>
                                                        <div className="flex items-center gap-1 text-xs font-semibold text-[#00C950]">
                                                            <ArrowUpRight className="w-3 h-3" />
                                                            <span>{growthRate}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Key Metrics */}
                        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-[#EEF2FF] rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-[#244693]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#102059]">Key Metrics</h2>
                                    <p className="text-sm text-[#6B7280]">
                                        Overview of your business performance
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#E20E28] rounded">
                                            <ShoppingCart className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Total Orders
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {totalOrders}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-[#00C950]">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>+12% from last week</span>
                                    </div>
                                </div>

                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#244693] rounded">
                                            <Package className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Items Sold
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {itemsSold}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-[#00C950]">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>+8% from last week</span>
                                    </div>
                                </div>

                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#D3A218] rounded">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Total Revenue
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        ₱{Number(totalRevenue).toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-[#00C950]">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>+15% from last week</span>
                                    </div>
                                </div>

                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#102059] rounded">
                                            <Star className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Avg. Rating
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {Number(averageRating).toFixed(1)} / 5.0
                                    </p>
                                    <div className="flex items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-3 h-3 ${
                                                    i < Math.floor(averageRating)
                                                        ? 'fill-[#D3A218] text-[#D3A218]'
                                                        : 'text-[#E5E7EB]'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Statistics */}
                        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-[#EEF2FF] rounded-lg">
                                    <Users className="w-6 h-6 text-[#244693]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#102059]">
                                        Customer Statistics
                                    </h2>
                                    <p className="text-sm text-[#6B7280]">
                                        Overview of your customer base
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#00C950] rounded">
                                            <UserPlus className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            New Customers
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {newCustomers}
                                    </p>
                                    <p className="text-xs text-[#6B7280]">First-time buyers</p>
                                </div>

                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#244693] rounded">
                                            <UserCheck className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Returning
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {returningCustomers}
                                    </p>
                                    <p className="text-xs text-[#6B7280]">Repeat buyers</p>
                                </div>

                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#E20E28] rounded">
                                            <Users className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Total Customers
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {totalCustomers}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-[#00C950]">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>+{newCustomers} new</span>
                                    </div>
                                </div>

                                <div className="bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-[#D3A218] rounded">
                                            <Activity className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#102059]">
                                            Retention Rate
                                        </h3>
                                    </div>
                                    <p className="text-2xl font-bold text-[#102059] mb-2">
                                        {retentionRate}%
                                    </p>
                                    <p className="text-xs text-[#6B7280]">Customer loyalty</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Products + Revenue by Category */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-[#EEF2FF] rounded-lg">
                                        <Award className="w-6 h-6 text-[#D3A218]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#102059]">
                                            Top Selling Products
                                        </h2>
                                        <p className="text-sm text-[#6B7280]">
                                            Best performing items
                                        </p>
                                    </div>
                                </div>

                                {topProducts.length > 0 ? (
                                    <div className="space-y-3">
                                        {topProducts.map((product, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]"
                                            >
                                                <div className="flex-shrink-0 w-8 h-8 bg-[#102059] rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-bold text-white">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#102059] truncate">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280]">
                                                        {product.quantity} sold
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-[#00C950]">
                                                        ₱{Number(product.revenue).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-32 text-sm text-[#6B7280]">
                                        No product data available yet.
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-[#EEF2FF] rounded-lg">
                                        <BarChart3 className="w-6 h-6 text-[#244693]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#102059]">
                                            Revenue by Category
                                        </h2>
                                        <p className="text-sm text-[#6B7280]">
                                            Sales breakdown by product category
                                        </p>
                                    </div>
                                </div>

                                {revenueByCategory.length > 0 ? (
                                    <div className="space-y-4">
                                        {revenueByCategory.map((item, index) => {
                                            const maxRevenue = revenueByCategory[0].revenue
                                            const percentage =
                                                maxRevenue > 0
                                                    ? (item.revenue / maxRevenue) * 100
                                                    : 0
                                            const colors = [
                                                '#E20E28',
                                                '#244693',
                                                '#D3A218',
                                                '#102059',
                                                '#00C950',
                                            ]
                                            const color = colors[index % colors.length]

                                            return (
                                                <div key={index}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-semibold text-[#102059]">
                                                            {item.category}
                                                        </span>
                                                        <span className="text-sm font-bold text-[#102059]">
                                                            ₱{Number(item.revenue).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-[#F9FAFB] rounded-full h-3 border border-[#E5E7EB]">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                backgroundColor: color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-32 text-sm text-[#6B7280]">
                                        No category data available yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Buyers */}
                        {topBuyers.length > 0 && (
                            <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-[#EEF2FF] rounded-lg">
                                        <Users className="w-6 h-6 text-[#E20E28]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-[#102059]">
                                            Top Buyers
                                        </h2>
                                        <p className="text-sm text-[#6B7280]">
                                            Your most valuable customers
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {topBuyers.map((buyer, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]"
                                        >
                                            <div className="flex-shrink-0 w-10 h-10 bg-[#102059] rounded-full flex items-center justify-center">
                                                <span className="text-sm font-bold text-white">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#102059]">
                                                    {buyer.name}
                                                </p>
                                                <p className="text-xs text-[#6B7280]">
                                                    {buyer.total_orders}{' '}
                                                    {buyer.total_orders === 1 ? 'order' : 'orders'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-[#00C950]">
                                                    ₱{Number(buyer.total_spent).toLocaleString()}
                                                </p>
                                                <p className="text-xs text-[#6B7280]">Total spent</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}

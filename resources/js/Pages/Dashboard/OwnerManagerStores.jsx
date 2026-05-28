import { Link, router } from '@inertiajs/react'
import { Plus, Star, Trash2 } from 'lucide-react'
import OwnerManagerKlasmeytLayout, {
    OwnerManagerNoAgrivetAlert,
} from '../../Layouts/OwnerManagerKlasmeytLayout'

const DEFAULT_COVER =
    'https://images.unsplash.com/photo-1730081793378-9ddc1e2b182f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'

function formatShopStatus(status) {
    return status === 'active' ? 'Active' : 'Inactive'
}

function shopCover(shop) {
    return shop.logo_url || DEFAULT_COVER
}

export default function OwnerManagerStores({ auth, agrivet, shops = [] }) {
    const ownerDisplayName = agrivet?.owner_name || auth.user.name

    return (
        <OwnerManagerKlasmeytLayout auth={auth} title="My Stores">
            {!agrivet && <OwnerManagerNoAgrivetAlert />}

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[#102059] mb-2">My Stores</h1>
                    <p className="text-sm text-[#6B7280]">Manage all your store branches</p>
                </div>

                {agrivet && (
                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                        <h2 className="text-lg font-semibold text-[#102059] mb-4">
                            Agrivet Business Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                    Business Name
                                </label>
                                <p className="text-sm text-[#102059] mt-1">
                                    {agrivet.registered_business_name || agrivet.name}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                    Owner Name
                                </label>
                                <p className="text-sm text-[#102059] mt-1">{ownerDisplayName}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                    Email Address
                                </label>
                                <p className="text-sm text-[#102059] mt-1">{agrivet.email || '—'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                    Phone Number
                                </label>
                                <p className="text-sm text-[#102059] mt-1">
                                    {agrivet.contact_number || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-lg font-semibold text-[#102059] mb-4">List of Stores</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shops.map((shop) => {
                            const statusLabel = formatShopStatus(shop.shop_status)
                            const rating = parseFloat(shop.average_rating) || 0

                            const storeInfoUrl = agrivet
                                ? `/dashboard/owner-manager/stores/${shop.id}/store-information`
                                : null

                            return (
                                <div
                                    key={shop.id}
                                    role={storeInfoUrl ? 'button' : undefined}
                                    tabIndex={storeInfoUrl ? 0 : undefined}
                                    onClick={
                                        storeInfoUrl
                                            ? () => router.visit(storeInfoUrl)
                                            : undefined
                                    }
                                    onKeyDown={
                                        storeInfoUrl
                                            ? (e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault()
                                                      router.visit(storeInfoUrl)
                                                  }
                                              }
                                            : undefined
                                    }
                                    className={`bg-white rounded-lg border border-[#E5E7EB] overflow-hidden hover:border-[#102059] transition-all hover:shadow-md text-left ${
                                        storeInfoUrl ? 'cursor-pointer' : ''
                                    }`}
                                >
                                    <div className="relative h-40 w-full overflow-hidden bg-[#F8F9FB]">
                                        <img
                                            src={shopCover(shop)}
                                            alt={shop.shop_name}
                                            className="w-full h-full object-cover"
                                        />
                                        <span
                                            className={`absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                                                statusLabel === 'Active'
                                                    ? 'bg-[#E8F5E9]/90 text-[#2E7D32]'
                                                    : 'bg-[#FFEBEE]/90 text-[#C62828]'
                                            }`}
                                        >
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <div className="p-5">
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <h3 className="text-sm font-bold text-[#102059] flex-1">
                                                {shop.shop_name}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 text-[#E20E28] hover:bg-[#FEE2E2] rounded-lg transition-colors flex-shrink-0"
                                                title="Remove store"
                                                aria-label="Remove store"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-3">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-3.5 h-3.5 ${
                                                            star <= Math.floor(rating)
                                                                ? 'fill-[#D3A218] text-[#D3A218]'
                                                                : star - 0.5 <= rating
                                                                  ? 'fill-[#D3A218] text-[#D3A218]'
                                                                  : 'fill-[#E5E7EB] text-[#E5E7EB]'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs font-semibold text-[#102059]">
                                                {rating.toFixed(1)}
                                            </span>
                                        </div>

                                        <div className="text-xs text-[#6B7280] space-y-0.5 mb-3">
                                            {shop.shop_address && <p>{shop.shop_address}</p>}
                                            <p>
                                                {[shop.shop_city, shop.shop_province]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                            {shop.shop_postal_code && <p>{shop.shop_postal_code}</p>}
                                        </div>

                                        <div className="border-t border-[#E5E7EB] my-3" />

                                        <div className="text-xs text-[#6B7280] space-y-1">
                                            <div>
                                                <span className="font-semibold text-[#102059]">
                                                    Days:
                                                </span>{' '}
                                                {shop.operating_days || '—'}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-[#102059]">
                                                    Hours:
                                                </span>{' '}
                                                {shop.operating_hours || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        <Link
                            href="/register"
                            className="bg-white rounded-lg border-2 border-dashed border-[#E5E7EB] p-5 hover:border-[#102059] hover:bg-[#F8F9FB] transition-all group flex flex-col items-center justify-center min-h-[280px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#F8F9FB] group-hover:bg-[#102059] flex items-center justify-center mb-3 transition-colors">
                                <Plus className="w-6 h-6 text-[#6B7280] group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-sm font-bold text-[#102059] mb-1">
                                {shops.length === 0 ? 'Add First Store' : 'Add New Store'}
                            </h3>
                            <p className="text-xs text-[#6B7280] text-center">
                                {shops.length === 0 ? (
                                    <>
                                        You have no stores yet.
                                        <br />
                                        Click to add your first store.
                                    </>
                                ) : (
                                    'Click to add a new branch or store location'
                                )}
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </OwnerManagerKlasmeytLayout>
    )
}

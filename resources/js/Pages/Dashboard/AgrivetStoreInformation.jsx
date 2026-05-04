import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@inertiajs/react'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Filter,
  Heart,
  Info,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

const tabOrder = ['about', 'vendors', 'products', 'insights']

function vendorDisplayName(v) {
  const mid = v.middle_name ? `${v.middle_name} ` : ''
  return `${v.first_name} ${mid}${v.last_name}`.trim() || '—'
}

function vendorInitials(v) {
  const name = vendorDisplayName(v)
  const parts = name.split(' ').filter(Boolean)
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
}

function asTitleStatus(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AgrivetStoreInformation({ auth, agrivet, shop, vendors = [] }) {
  const getBaseRoute = () =>
    auth?.user?.user_type === 'admin' ? '/dashboard/admin/agrivets' : '/dashboard/super-admin/agrivets'

  const backRoute = `${getBaseRoute()}/${agrivet.id}/shops`
  const vendorsRoute = `${getBaseRoute()}/${agrivet.id}/shops/${shop.id}/vendors`

  // Build a "store" object that matches the template fields/shape as closely as possible.
  const store = useMemo(() => {
    const lat = shop.shop_lat != null ? Number(shop.shop_lat) : null
    const lng = shop.shop_long != null ? Number(shop.shop_long) : null
    return {
      id: shop.id,
      storeName: shop.shop_name,
      status: shop.shop_status === 'active' ? 'Active' : 'Inactive',
      street: shop.shop_address || '',
      barangay: '',
      city: shop.shop_city || '',
      province: shop.shop_province || '',
      zipCode: shop.shop_postal_code || '',
      latitude: Number.isFinite(lat) ? lat : 13.7565,
      longitude: Number.isFinite(lng) ? lng : 121.0583,
      operatingDays: '—',
      operatingHours: '—',
      coverPhoto:
        'https://images.unsplash.com/photo-1516382799247-87df95d790b7?auto=format&fit=crop&w=1600&q=60',
      permitPhoto:
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=60',
    }
  }, [shop])

  const [activeTab, setActiveTab] = useState('about')
  const [direction, setDirection] = useState(1)

  // Ratings mock (template parity)
  const [starFilter, setStarFilter] = useState(null)
  const mockReviews = useMemo(
    () => [
      {
        id: 1,
        customerName: 'Juan Dela Cruz',
        rating: 5,
        date: 'March 10, 2026',
        comment:
          'Excellent service! Very knowledgeable staff and high-quality products. Will definitely come back.',
        avatar:
          'https://images.unsplash.com/photo-1668701065350-c7514f7c8166?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      },
      {
        id: 2,
        customerName: 'Maria Santos',
        rating: 5,
        date: 'March 8, 2026',
        comment: 'Great selection of gamefowl supplies. The staff is very helpful and accommodating.',
        avatar:
          'https://images.unsplash.com/photo-1609126385558-bc3fc5082b0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      },
      {
        id: 3,
        customerName: 'Pedro Reyes',
        rating: 4,
        date: 'March 5, 2026',
        comment: 'Good products and reasonable prices. The location is easy to find.',
        avatar:
          'https://images.unsplash.com/photo-1633177188754-980c2a6b6266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      },
    ],
    []
  )

  const averageRating = useMemo(() => {
    if (mockReviews.length === 0) return 0
    const sum = mockReviews.reduce((acc, r) => acc + r.rating, 0)
    return sum / mockReviews.length
  }, [mockReviews])

  const filteredReviews = useMemo(() => {
    if (!starFilter) return mockReviews
    return mockReviews.filter((r) => r.rating === starFilter)
  }, [mockReviews, starFilter])

  // Left / right column height sync (template behavior)
  const leftColumnRef = useRef(null)
  const [leftColumnHeight, setLeftColumnHeight] = useState(0)
  useEffect(() => {
    if (leftColumnRef.current) setLeftColumnHeight(leftColumnRef.current.offsetHeight)
  }, [store, activeTab])

  // Success banner (template parity)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessageType, setSuccessMessageType] = useState('storeEdit')
  const [successVendorName, setSuccessVendorName] = useState('')

  const showSuccess = (type, name) => {
    setSuccessMessageType(type)
    setSuccessVendorName(name)
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 5000)
  }

  // Vendors UI state (view-only here; full CRUD stays in `AgrivetVendors`)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showVendorStatusConfirmModal, setShowVendorStatusConfirmModal] = useState(false)
  const [vendorToToggle, setVendorToToggle] = useState(null)
  const [showRemoveVendorConfirmModal, setShowRemoveVendorConfirmModal] = useState(false)
  const [vendorToRemove, setVendorToRemove] = useState(null)

  const handleTabChange = (newTab) => {
    const currentIndex = tabOrder.indexOf(activeTab)
    const newIndex = tabOrder.indexOf(newTab)
    setDirection(newIndex > currentIndex ? 1 : -1)
    setActiveTab(newTab)
  }

  const openRemoveVendor = (v) => {
    setVendorToRemove(v)
    setShowRemoveVendorConfirmModal(true)
  }

  const confirmRemoveVendor = () => {
    // This page is reference parity; actual removal is implemented on `AgrivetVendors`.
    setShowRemoveVendorConfirmModal(false)
    if (vendorToRemove) showSuccess('edit', vendorDisplayName(vendorToRemove))
    setVendorToRemove(null)
  }

  const openStatusConfirm = (v) => {
    setVendorToToggle(v)
    setShowVendorStatusConfirmModal(true)
  }

  const confirmStatusChange = () => {
    // Reference parity only (no persistence here).
    setShowVendorStatusConfirmModal(false)
    if (vendorToToggle) showSuccess('vendorStatus', vendorDisplayName(vendorToToggle))
    setVendorToToggle(null)
  }

  const cancelStatusChange = () => {
    setShowVendorStatusConfirmModal(false)
    setVendorToToggle(null)
  }

  // Products UI (template-like sample)
  const canAddListings = false
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [productStatusFilter, setProductStatusFilter] = useState('All')
  const [productSortBy, setProductSortBy] = useState('name')

  const productListings = useMemo(
    () => [
      {
        id: 1001,
        productId: 1001,
        productName: 'Premium Gamefowl Feed Pro',
        brand: 'Champion Nutrition',
        category: 'Feeds',
        unit: '50kg',
        price: 1250,
        stock: 42,
        reorderLevel: 10,
        popularity: 245,
        photos: ['https://images.unsplash.com/photo-1524594157360-4c8c2f0b0d5a?auto=format&fit=crop&w=800&q=60'],
        primaryPhotoIndex: 0,
        manualStatus: 'Active',
      },
      {
        id: 1002,
        productId: 1002,
        productName: 'Electrolyte Power Plus',
        brand: 'VitaBoost',
        category: 'Supplements',
        unit: '500g',
        price: 320,
        stock: 0,
        reorderLevel: 12,
        popularity: 189,
        photos: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=60'],
        primaryPhotoIndex: 0,
        manualStatus: 'Active',
      },
    ],
    []
  )

  const getProductStatus = (listing) => {
    if ((listing.manualStatus || 'Active') === 'Inactive') return 'Inactive'
    if (listing.stock === 0) return 'Out'
    if (listing.stock <= listing.reorderLevel) return 'Low'
    return 'Active'
  }

  const categories = useMemo(() => ['All', ...new Set(productListings.map((l) => l.category))], [productListings])

  const filteredListings = useMemo(() => {
    const searchLower = productSearchQuery.toLowerCase()
    return productListings
      .filter((l) => {
        const matchesSearch =
          l.productName.toLowerCase().includes(searchLower) ||
          l.brand.toLowerCase().includes(searchLower) ||
          String(l.id).includes(searchLower)
        const matchesCategory = categoryFilter === 'All' || l.category === categoryFilter
        const matchesStatus = productStatusFilter === 'All' || getProductStatus(l) === productStatusFilter
        return matchesSearch && matchesCategory && matchesStatus
      })
      .sort((a, b) => {
        if (productSortBy === 'name') return a.productName.localeCompare(b.productName)
        if (productSortBy === 'popularity') return (b.popularity ?? 0) - (a.popularity ?? 0)
        return 0
      })
  }, [productListings, productSearchQuery, categoryFilter, productStatusFilter, productSortBy])

  // Insights (template parity with recharts)
  const [insightsPeriod, setInsightsPeriod] = useState('monthly')

  return (
    <SuperAdminOrAdminLayout auth={auth} title={`${shop.shop_name} — Store Information`} mainClassName="p-0">
      <div className="min-h-screen bg-[#F0F2F5]">
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[500px] max-w-[90%]"
            >
              <div className="bg-[#00C950] text-white rounded-lg shadow-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">
                    {successMessageType === 'reassign'
                      ? 'Vendor Reassigned Successfully'
                      : successMessageType === 'edit'
                        ? 'Vendor Updated Successfully'
                        : successMessageType === 'status'
                          ? 'Store Status Updated'
                          : successMessageType === 'storeEdit'
                            ? 'Store Information Updated'
                            : 'Vendor Status Updated'}
                  </h3>
                  <p className="text-xs text-white/90 mt-0.5">
                    {successMessageType === 'reassign'
                      ? `${successVendorName} has been reassigned to ${store.storeName}`
                      : successMessageType === 'edit'
                        ? `${successVendorName}'s information has been updated`
                        : successMessageType === 'status'
                          ? `${successVendorName} is now ${store.status}`
                          : successMessageType === 'storeEdit'
                            ? `${successVendorName}'s information has been successfully updated`
                            : `${successVendorName}'s status has been updated`}
                  </p>
                </div>
                <button onClick={() => setShowSuccessMessage(false)} className="p-1.5 hover:bg-white/20 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Return Button (template positioning) */}
        <Link
          href={backRoute}
          className="absolute top-6 left-6 z-10 p-3 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-all group"
          title={`Back to ${agrivet.name}`}
        >
          <ArrowLeft className="w-5 h-5 text-[#6B7280] group-hover:text-[#102059]" />
        </Link>

        {/* Cover Photo */}
        <div className="bg-white">
          <div className="max-w-[1110px] mx-auto">
            <div className="relative">
              <div className="aspect-[4/1] bg-[#E5E7EB] overflow-hidden">
                <img src={store.coverPhoto} alt={store.storeName} className="w-full h-full object-cover" />
              </div>
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                onClick={() => showSuccess('storeEdit', store.storeName)}
                title="Edit cover photo (reference UI)"
              >
                <Pencil className="w-5 h-5 text-[#244693]" />
              </button>
            </div>

            {/* Page Info */}
            <div className="px-0 pt-6 pb-4 border-b border-[#E5E7EB]">
              <div>
                <h1 className="text-[32px] font-bold text-[#102059] leading-tight mb-1">{store.storeName}</h1>
                <p className="text-sm text-[#65676B] mb-3">
                  {agrivet.name} {agrivet.status ? `(${asTitleStatus(agrivet.status)})` : ''}
                </p>

                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      disabled
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                        store.status === 'Active' ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                      } opacity-60 cursor-not-allowed`}
                      title="Status toggle shown for reference (read-only here)"
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                          store.status === 'Active' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-semibold ${store.status === 'Active' ? 'text-[#00C950]' : 'text-[#65676B]'}`}>
                      {store.status}
                    </span>
                  </div>

                  {activeTab === 'about' && (
                    <button
                      className="px-4 py-2 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors flex items-center gap-2"
                      onClick={() => showSuccess('storeEdit', store.storeName)}
                      title="Edit Info (reference UI)"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Info
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-0">
              <div className="flex gap-2 pt-1 justify-between items-center">
                <div className="flex gap-2">
                  {tabOrder.map((t) => (
                    <div
                      key={t}
                      className={`px-4 py-3 text-sm font-semibold ${
                        activeTab === t
                          ? 'text-[#244693] border-b-[3px] border-[#244693]'
                          : 'text-[#65676B] hover:bg-[#F0F2F5] rounded-t-lg cursor-pointer'
                      }`}
                      onClick={() => handleTabChange(t)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleTabChange(t)
                      }}
                    >
                      {t === 'about' ? 'About' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1110px] mx-auto px-0 py-4 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              initial={{ x: direction > 0 ? 1000 : -1000, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -1000 : 1000, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {activeTab === 'about' && (
                <div className="grid grid-cols-10 gap-4 items-start">
                  {/* Left Column */}
                  <div className="col-span-4 space-y-4" ref={leftColumnRef}>
                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                      <h2 className="text-xl font-bold text-[#102059] mb-4">Address</h2>
                      <div className="mb-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-[#244693] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-[#102059]">{store.street || '—'}</p>
                            <p className="text-sm text-[#102059]">
                              {[store.barangay, store.city].filter(Boolean).join(', ') || '—'}
                            </p>
                            <p className="text-sm text-[#102059]">
                              {[store.province, store.zipCode].filter(Boolean).join(' ') || '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg overflow-hidden border border-[#E5E7EB] h-[300px] mt-4">
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${store.longitude - 0.01},${
                            store.latitude - 0.01
                          },${store.longitude + 0.01},${store.latitude + 0.01}&layer=mapnik&marker=${store.latitude},${
                            store.longitude
                          }`}
                          style={{ border: 0 }}
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                      <h2 className="text-xl font-bold text-[#102059] mb-4">Operating Schedule</h2>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-[#244693] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-[#65676B] mb-1">Operating Hours</p>
                            <p className="text-sm font-semibold text-[#102059]">{store.operatingHours}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-[#244693] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-[#65676B] mb-1">Operating Days</p>
                            <p className="text-sm font-semibold text-[#102059]">{store.operatingDays}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                      <h2 className="text-xl font-bold text-[#102059] mb-4">Business Permit</h2>
                      <div className="rounded-lg overflow-hidden border border-[#E5E7EB] relative">
                        <img src={store.permitPhoto} alt="Business Permit" className="w-full h-auto object-cover" />
                        <button
                          className="absolute top-3 right-3 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                          onClick={() => showSuccess('storeEdit', store.storeName)}
                          title="Edit permit photo (reference UI)"
                        >
                          <Pencil className="w-5 h-5 text-[#244693]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="col-span-6">
                    <div
                      className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex flex-col"
                      style={{ height: leftColumnHeight > 0 ? `${leftColumnHeight}px` : 'auto' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-[#102059]">Ratings & Feedback</h2>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= Math.floor(averageRating)
                                    ? 'fill-[#D3A218] text-[#D3A218]'
                                    : 'fill-[#E5E7EB] text-[#E5E7EB]'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-bold text-[#102059]">{averageRating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E5E7EB]">
                        <Filter className="w-4 h-4 text-[#65676B]" />
                        <span className="text-xs text-[#65676B] mr-2">Filter by:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStarFilter(null)}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                              starFilter === null
                                ? 'bg-[#244693] text-white border-[#244693]'
                                : 'bg-white text-[#65676B] border-[#E5E7EB] hover:border-[#244693]'
                            }`}
                          >
                            All
                          </button>
                          {[5, 4, 3, 2, 1].map((star) => (
                            <button
                              key={star}
                              onClick={() => setStarFilter(star)}
                              className={`px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1 ${
                                starFilter === star
                                  ? 'bg-[#244693] text-white border-[#244693]'
                                  : 'bg-white text-[#65676B] border-[#E5E7EB] hover:border-[#244693]'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${starFilter === star ? 'fill-white' : 'fill-[#D3A218]'}`} />
                              {star}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 overflow-y-auto flex-1">
                        {filteredReviews.length > 0 ? (
                          filteredReviews.map((review) => (
                            <div
                              key={review.id}
                              className="border border-[#E5E7EB] rounded-lg p-4 hover:bg-[#F9FAFB] transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-[#E5E7EB] flex-shrink-0">
                                    <img src={review.avatar} alt={review.customerName} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[#050505]">{review.customerName}</p>
                                    <p className="text-xs text-[#65676B]">{review.date}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating
                                          ? 'fill-[#D3A218] text-[#D3A218]'
                                          : 'fill-[#E5E7EB] text-[#E5E7EB]'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-[#050505] leading-relaxed">{review.comment}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Star className="w-12 h-12 text-[#E5E7EB] mx-auto mb-2" />
                            <p className="text-sm text-[#65676B]">No reviews found for this rating</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vendors' && (
                <div className="bg-white rounded-lg border border-[#E5E7EB] min-h-[600px]">
                  <div className="border-b border-[#E5E7EB] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-[#102059] mb-1">Store Vendors</h2>
                        <p className="text-sm text-[#65676B]">Manage vendor access to this store</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowReassignModal(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#244693] border border-[#244693] text-sm font-semibold rounded-lg hover:bg-[#EEF2FF] transition-colors"
                        >
                          <UserCog className="w-4 h-4" />
                          Reassign Vendor
                        </button>
                        <Link
                          href={vendorsRoute}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Vendor
                        </Link>
                      </div>
                    </div>
                  </div>

                  {vendors.length > 0 ? (
                    <div className="p-6">
                      <div className="space-y-3">
                        {vendors.map((v) => (
                          <div
                            key={v.id}
                            className="border border-[#E5E7EB] rounded-lg p-4 hover:bg-[#F9FAFB] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#102059] rounded-full flex items-center justify-center border border-[#E5E7EB] flex-shrink-0">
                                  <span className="text-sm font-bold text-white">{vendorInitials(v).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-bold text-[#102059] truncate">{vendorDisplayName(v)}</h3>
                                  <p className="text-xs text-[#65676B] truncate">{v.email}</p>
                                  <p className="text-xs text-[#65676B]">{v.mobile_number || '—'}</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-15 sm:pl-0">
                                <div className="text-left sm:text-right hidden sm:block">
                                  <p className="text-xs text-[#65676B]">Added on</p>
                                  <p className="text-sm font-semibold text-[#102059]">
                                    {v.created_at ? new Date(v.created_at.replace(' ', 'T')).toLocaleDateString() : '—'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => openStatusConfirm(v)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 flex-shrink-0 ${
                                    (v.pivot?.status || v.status) === 'active' ? 'bg-[#00C950]' : 'bg-[#D1D5DB]'
                                  }`}
                                  title="Toggle status (reference UI)"
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ${
                                      (v.pivot?.status || v.status) === 'active' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                    }`}
                                  />
                                </button>
                                <Link
                                  href={vendorsRoute}
                                  className="p-2 text-[#244693] hover:bg-[#EEF2FF] rounded-lg transition-colors flex-shrink-0"
                                  title="Edit vendor"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Link>
                                <button
                                  className="p-2 text-[#E20E28] hover:bg-[#FEE2E2] rounded-lg transition-colors flex-shrink-0"
                                  title="Remove vendor (reference UI)"
                                  onClick={() => openRemoveVendor(v)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="w-20 h-20 bg-[#F0F2F5] rounded-full flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-[#65676B]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#102059] mb-2">No Vendors Added</h3>
                      <p className="text-sm text-[#65676B] text-center max-w-md mb-6">
                        Add vendors to grant them access to manage this store's operations.
                      </p>
                      <Link
                        href={vendorsRoute}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Your First Vendor
                      </Link>
                    </div>
                  )}

                  <div className="mx-6 mb-6 bg-[#EEF2FF] border border-[#244693]/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-[#244693] rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#102059] mb-1">About Store Vendors</p>
                        <p className="text-xs text-[#65676B] leading-relaxed mb-2">
                          Vendors can help manage daily store operations including inventory, orders, and customer feedback.
                        </p>
                        <p className="text-xs text-[#65676B] leading-relaxed">
                          Note: Admin permission rules depend on your backend roles. This page is UI-parity reference.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div className="bg-white rounded-lg border border-[#E5E7EB] p-8 min-h-[600px]">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#102059] mb-1">Product Listings</h2>
                      <p className="text-sm text-[#6B7280]">
                        {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'}
                      </p>
                    </div>
                    {canAddListings && (
                      <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#102059] text-white text-sm font-semibold rounded-lg hover:bg-[#244693] transition-colors">
                          <Plus className="w-4 h-4" />
                          Add Product
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat === 'All' ? 'All Categories' : cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={productStatusFilter}
                            onChange={(e) => setProductStatusFilter(e.target.value)}
                            className="w-full text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Low">Low</option>
                            <option value="Out">Out</option>
                          </select>
                        </div>
                        <div>
                          <select
                            value={productSortBy}
                            onChange={(e) => setProductSortBy(e.target.value)}
                            className="w-full text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent px-[20px] py-[8px] bg-[#ffffff]"
                          >
                            <option value="name">Sort by Name</option>
                            <option value="popularity">Popularity</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {filteredListings.length === 0 ? (
                    <div className="flex items-center justify-center h-[500px]">
                      <div className="text-center">
                        <Package className="w-16 h-16 text-[#E5E7EB] mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-[#102059] mb-2">No Matching Products</h2>
                        <p className="text-sm text-[#6B7280]">Try adjusting your filters or search query.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {filteredListings.map((listing) => (
                        <div
                          key={listing.id}
                          className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden hover:shadow-sm transition-all cursor-pointer"
                          title="Reference UI (no detail modal here)"
                          onClick={() => showSuccess('storeEdit', listing.productName)}
                        >
                          <div className="aspect-square bg-[#F9FAFB] overflow-hidden relative">
                            <img src={listing.photos[listing.primaryPhotoIndex]} alt={listing.productName} className="w-full h-full object-contain p-12" />
                            <div className="absolute top-2 left-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                                  getProductStatus(listing) === 'Active'
                                    ? 'bg-[#10B981] text-white'
                                    : getProductStatus(listing) === 'Inactive'
                                      ? 'bg-[#6B7280] text-white'
                                      : getProductStatus(listing) === 'Low'
                                        ? 'bg-[#F59E0B] text-white'
                                        : 'bg-[#E20E28] text-white'
                                }`}
                              >
                                {getProductStatus(listing)}
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="text-[#102059] mb-0.5 line-clamp-1 text-[12px]">{listing.productName}</h3>
                            <p className="text-xs text-[#6B7280] mb-2">{listing.brand}</p>
                            <div className="flex items-baseline gap-1 mb-2">
                              <span className="font-bold text-[#102059] text-[12px]">₱{listing.price.toFixed(2)}</span>
                              <span className="text-xs text-[#6B7280]">/{listing.unit}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-[#6B7280]">Stock:</span>
                              <span className="font-semibold text-[#102059]">{listing.stock}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#6B7280]">Popularity:</span>
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3 text-[#102059]" />
                                <span className="font-semibold text-[#102059]">{listing.popularity}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#102059]">Store Insights</h2>
                    <div className="flex items-center gap-1 bg-[#F0F2F5] rounded-full p-1">
                      {['weekly', 'monthly', 'yearly'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setInsightsPeriod(p)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                            insightsPeriod === p ? 'bg-white text-[#244693] shadow-sm' : 'text-[#65676B] hover:text-[#102059]'
                          }`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#E3F2FD] rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#244693]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#102059]">Customer Metrics</h3>
                    </div>

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                      <div className="flex items-center gap-2 mb-6 group relative">
                        <h3 className="text-lg font-bold text-[#102059]">Customer Analysis</h3>
                        <Info className="w-4 h-4 text-[#244693] cursor-help" />
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          key={`customer-chart-${insightsPeriod}`}
                          data={
                            insightsPeriod === 'weekly'
                              ? [
                                  { name: 'Mon', new: 1, returning: 3 },
                                  { name: 'Tue', new: 1, returning: 4 },
                                  { name: 'Wed', new: 0, returning: 3 },
                                  { name: 'Thu', new: 1, returning: 2 },
                                  { name: 'Fri', new: 2, returning: 3 },
                                  { name: 'Sat', new: 1, returning: 2 },
                                  { name: 'Sun', new: 0, returning: 1 },
                                ]
                              : insightsPeriod === 'monthly'
                                ? [
                                    { name: 'Week 1', new: 5, returning: 15 },
                                    { name: 'Week 2', new: 6, returning: 18 },
                                    { name: 'Week 3', new: 7, returning: 20 },
                                    { name: 'Week 4', new: 8, returning: 19 },
                                    { name: 'Week 5', new: 2, returning: 3 },
                                  ]
                                : [
                                    { name: 'Jan', new: 24, returning: 38 },
                                    { name: 'Feb', new: 27, returning: 41 },
                                    { name: 'Mar', new: 29, returning: 44 },
                                    { name: 'Apr', new: 31, returning: 47 },
                                    { name: 'May', new: 28, returning: 43 },
                                    { name: 'Jun', new: 30, returning: 45 },
                                    { name: 'Jul', new: 32, returning: 48 },
                                    { name: 'Aug', new: 26, returning: 39 },
                                    { name: 'Sep', new: 28, returning: 42 },
                                    { name: 'Oct', new: 30, returning: 44 },
                                    { name: 'Nov', new: 29, returning: 43 },
                                    { name: 'Dec', new: 28, returning: 34 },
                                  ]
                          }
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="name" stroke="#65676B" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#65676B" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                          <Bar dataKey="new" fill="#244693" name="New Customers" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="returning" fill="#D3A218" name="Returning Customers" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FFF3E0] rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-[#D3A218]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#102059]">Sales Performance</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#FFF3E0] rounded-full flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-[#D3A218]" />
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold text-[#00C950]">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {insightsPeriod === 'weekly' ? '15%' : insightsPeriod === 'monthly' ? '28%' : '52%'}
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {insightsPeriod === 'weekly' ? '32' : insightsPeriod === 'monthly' ? '138' : '1,456'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Number of Orders</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#E3F2FD] rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#244693]" />
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold text-[#00C950]">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {insightsPeriod === 'weekly' ? '18%' : insightsPeriod === 'monthly' ? '31%' : '58%'}
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {insightsPeriod === 'weekly' ? '124' : insightsPeriod === 'monthly' ? '538' : '5,847'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Products Sold</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FFEBEE] rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-[#E20E28]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#102059]">Financial Performance</h3>
                    </div>

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                      <div className="flex items-center gap-2 mb-6 group relative">
                        <h3 className="text-lg font-bold text-[#102059]">Revenue Trend</h3>
                        <Info className="w-4 h-4 text-[#244693] cursor-help" />
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart
                          key={`revenue-chart-${insightsPeriod}`}
                          data={
                            insightsPeriod === 'weekly'
                              ? [
                                  { name: 'Mon', revenue: 4800, orders: 4 },
                                  { name: 'Tue', revenue: 6200, orders: 5 },
                                  { name: 'Wed', revenue: 3900, orders: 3 },
                                  { name: 'Thu', revenue: 5100, orders: 4 },
                                  { name: 'Fri', revenue: 7500, orders: 6 },
                                  { name: 'Sat', revenue: 6800, orders: 5 },
                                  { name: 'Sun', revenue: 4100, orders: 5 },
                                ]
                              : insightsPeriod === 'monthly'
                                ? [
                                    { name: 'Week 1', revenue: 28500, orders: 27 },
                                    { name: 'Week 2', revenue: 32400, orders: 33 },
                                    { name: 'Week 3', revenue: 36800, orders: 37 },
                                    { name: 'Week 4', revenue: 41200, orders: 35 },
                                    { name: 'Week 5', revenue: 26300, orders: 6 },
                                  ]
                                : [
                                    { name: 'Jan', revenue: 128000, orders: 118 },
                                    { name: 'Feb', revenue: 135000, orders: 125 },
                                    { name: 'Mar', revenue: 142000, orders: 132 },
                                    { name: 'Apr', revenue: 148000, orders: 138 },
                                    { name: 'May', revenue: 138000, orders: 128 },
                                    { name: 'Jun', revenue: 145000, orders: 135 },
                                    { name: 'Jul', revenue: 152000, orders: 142 },
                                    { name: 'Aug', revenue: 132000, orders: 122 },
                                    { name: 'Sep', revenue: 139000, orders: 129 },
                                    { name: 'Oct', revenue: 147000, orders: 137 },
                                    { name: 'Nov', revenue: 143000, orders: 133 },
                                    { name: 'Dec', revenue: 126000, orders: 117 },
                                  ]
                          }
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="name" stroke="#65676B" style={{ fontSize: '12px' }} />
                          <YAxis
                            yAxisId="left"
                            stroke="#244693"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => (value >= 1000 ? `₱${value / 1000}K` : `₱${value}`)}
                          />
                          <YAxis yAxisId="right" orientation="right" stroke="#D3A218" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#244693"
                            strokeWidth={3}
                            dot={{ fill: '#244693', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Revenue"
                            yAxisId="left"
                          />
                          <Line
                            type="monotone"
                            dataKey="orders"
                            stroke="#D3A218"
                            strokeWidth={3}
                            dot={{ fill: '#D3A218', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Orders"
                            yAxisId="right"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Reassign Vendor Modal (reference UI) */}
        {showReassignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-[520px] max-w-[90%]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#102059]">Reassign Vendor</h2>
                <button className="p-2 text-[#65676B] hover:text-[#102059] transition-colors" onClick={() => setShowReassignModal(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#65676B]">
                This modal is shown for UI parity. Use the vendor management page to reassign vendors.
              </p>
              <div className="flex items-center justify-end mt-6 gap-2">
                <button
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB]"
                  onClick={() => setShowReassignModal(false)}
                >
                  Close
                </button>
                <Link
                  href={vendorsRoute}
                  className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570]"
                >
                  Open vendor management
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Status Confirmation Modal */}
        {showVendorStatusConfirmModal && vendorToToggle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-[400px] max-w-[90%]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#102059]">Confirm Status Change</h2>
                <button className="p-2 text-[#65676B] hover:text-[#102059] transition-colors" onClick={cancelStatusChange}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#65676B] leading-relaxed">
                Change status for <span className="font-semibold text-[#102059]">{vendorDisplayName(vendorToToggle)}</span>?
              </p>
              <div className="flex items-center justify-end mt-6 gap-2">
                <button
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB]"
                  onClick={cancelStatusChange}
                >
                  Cancel
                </button>
                <button className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570]" onClick={confirmStatusChange}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Vendor Confirmation Modal */}
        {showRemoveVendorConfirmModal && vendorToRemove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-[420px] max-w-[90%]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#102059]">Remove Vendor</h2>
                <button
                  className="p-2 text-[#65676B] hover:text-[#102059] transition-colors"
                  onClick={() => {
                    setShowRemoveVendorConfirmModal(false)
                    setVendorToRemove(null)
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#65676B] leading-relaxed">
                This is shown for UI parity. To actually remove vendors, use the vendor management page.
              </p>
              <div className="flex items-center justify-end mt-6 gap-2">
                <button
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB]"
                  onClick={() => {
                    setShowRemoveVendorConfirmModal(false)
                    setVendorToRemove(null)
                  }}
                >
                  Cancel
                </button>
                <button className="px-4 py-2.5 bg-[#E20E28] text-white text-sm font-semibold rounded-lg hover:bg-[#C00D24]" onClick={confirmRemoveVendor}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminOrAdminLayout>
  )
}


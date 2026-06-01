import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, router } from '@inertiajs/react'
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
import { AnimatePresence, motion } from 'motion/react'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'
import VendorKlasmeytLayout from '../../Layouts/VendorKlasmeytLayout'
import OwnerManagerOrdersPanel from '../../Components/Dashboard/OwnerManagerOrdersPanel'

const tabOrder = ['about', 'vendors', 'products', 'insights']
const vendorTabOrder = ['about', 'products', 'orders']

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatOperatingDays(days) {
  if (!days || days.length === 0) return ''
  const sorted = [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
  const indices = sorted.map((d) => DAY_ORDER.indexOf(d))
  const consecutive = indices.length > 1 && indices.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1)
  return consecutive ? `${sorted[0]} - ${sorted[sorted.length - 1]}` : sorted.join(', ')
}

function formatOperatingHours(opening, closing) {
  if (!opening || !closing) return ''
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${display}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${fmt(opening)} - ${fmt(closing)}`
}

function parseOperatingDays(str) {
  if (!str) return []
  const rangeMatch = str.trim().match(/^(\w+)\s*-\s*(\w+)$/)
  if (rangeMatch) {
    const start = DAY_ORDER.indexOf(rangeMatch[1])
    const end = DAY_ORDER.indexOf(rangeMatch[2])
    if (start !== -1 && end !== -1 && start <= end) return DAY_ORDER.slice(start, end + 1)
  }
  return str.split(',').map((d) => d.trim()).filter((d) => DAY_ORDER.includes(d))
}

function parseTimeToInput(timeStr) {
  if (!timeStr) return ''
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

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

function reviewCustomerName(review) {
  return review.customer_name || review.customerName || 'Customer'
}

function reviewInitials(review) {
  const name = reviewCustomerName(review)
  const parts = name.split(' ').filter(Boolean)
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
}

function formatReviewDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const EMPTY_PERIOD_INSIGHTS = {
  newCustomers: 0,
  returningCustomers: 0,
  totalCustomers: 0,
  retentionRate: null,
  orderCount: 0,
  productsSold: 0,
  revenue: 0,
  trends: {},
  customerChart: [],
  revenueChart: [],
}

function getPeriodInsights(storeInsights, period) {
  return storeInsights?.[period] ?? EMPTY_PERIOD_INSIGHTS
}

function formatInsightNumber(value) {
  if (value == null) return '0'
  return Number(value).toLocaleString()
}

function formatInsightCurrency(amount) {
  if (amount == null || amount === 0) return '₱0'
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`
  return `₱${Number(amount).toLocaleString()}`
}

function formatRetentionRate(value) {
  if (value == null) return '—'
  return `${value}%`
}

function InsightTrendBadge({ trend }) {
  if (trend == null || trend === '') return null
  return (
    <div className="flex items-center gap-1 text-xs font-semibold text-[#00C950]">
      <TrendingUp className="w-3.5 h-3.5" />
      {`${Math.abs(Number(trend))}%`}
    </div>
  )
}

function InsightChartEmpty({ message = 'No data available for this period' }) {
  return (
    <div className="flex items-center justify-center h-[350px] text-sm text-[#65676B]">
      {message}
    </div>
  )
}

const PLACEHOLDER_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1516382799247-87df95d790b7?auto=format&fit=crop&w=400&q=60'

const LISTING_IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23F3F4F6'/%3E%3Cg transform='translate(200,200)'%3E%3Crect x='-60' y='-70' width='120' height='120' rx='8' fill='%23D1D5DB' stroke='%239CA3AF' stroke-width='3'/%3E%3Cpath d='M -40,-50 L -40,-30 M 0,-50 L 0,-30 M 40,-50 L 40,-30' stroke='%239CA3AF' stroke-width='3' stroke-linecap='round'/%3E%3Crect x='-60' y='-70' width='120' height='25' rx='8' fill='%239CA3AF'/%3E%3C/g%3E%3C/svg%3E"

function resolveCatalogImageUrl(image) {
  if (!image || typeof image !== 'string') return PLACEHOLDER_PRODUCT_IMAGE
  if (image.startsWith('http://') || image.startsWith('https://')) return image
  if (image.startsWith('/storage/')) return image
  return `/storage/${image.replace(/^\//, '')}`
}

function mapCatalogToRegisteredProduct(entry) {
  const images = Array.isArray(entry.images) ? entry.images : []
  const primaryIdx = entry.primary_image_index ?? 0
  const photos = images.length > 0 ? images.map(resolveCatalogImageUrl) : [PLACEHOLDER_PRODUCT_IMAGE]
  const image = photos[primaryIdx] || photos[0] || PLACEHOLDER_PRODUCT_IMAGE
  const unit = [entry.weight, entry.unit].filter((v) => v != null && v !== '').join(' ') || 'unit'

  return {
    id: entry.id,
    productId: entry.id,
    productName: entry.product_name || '',
    brand: entry.brand || '',
    category: entry.category_name || 'Uncategorized',
    unit,
    description: entry.description || '',
    image,
    photos,
    primaryPhotoIndex: primaryIdx,
  }
}

function catalogProductMatchesSearch(product, query) {
  const q = query.toLowerCase()
  return (
    product.productName.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q) ||
    product.brand.toLowerCase().includes(q)
  )
}

function getListingImageSrc(listing) {
  const idx = listing.primaryPhotoIndex || 0
  const photo = listing.photos?.[idx] || listing.photos?.[0]
  return photo ? resolveCatalogImageUrl(photo) : LISTING_IMAGE_FALLBACK
}

function getEffectiveDiscount(listing) {
  if (!listing.discountPercent) return 0
  if (listing.discountType === 'timed' && listing.discountExpiration) {
    if (Date.now() > listing.discountExpiration) return 0
  }
  return listing.discountPercent
}

function getDiscountedPrice(listing) {
  const discount = getEffectiveDiscount(listing)
  if (discount === 0) return listing.price
  return listing.price * (1 - discount / 100)
}

function getProductStatus(listing) {
  if ((listing.manualStatus || 'Active') === 'Inactive') return 'Inactive'
  if (listing.stock === 0) return 'Out'
  if (listing.stock <= listing.reorderLevel) return 'Low'
  return 'Active'
}

export default function AgrivetStoreInformation({
  auth,
  agrivet,
  shop,
  vendors = [],
  reassignableVendors = [],
  reviews = [],
  products = [],
  product_catalog = [],
  orders = [],
  deliveryMethods = [],
  preparingItemStatusId = null,
  storeInsights = null,
  flash,
}) {
  const isOwnerManager = auth?.user?.user_type === 'owner_manager'
  const isVendor = auth?.user?.user_type === 'vendor'
  const visibleTabs = isVendor ? vendorTabOrder : tabOrder
  const vendorOrdersApiBasePath = shop?.id ? `/dashboard/vendor/stores/${shop.id}/orders` : ''

  const getBaseRoute = () => {
    if (isOwnerManager) return '/dashboard/owner-manager'
    if (isVendor) return '/dashboard/vendor'
    return auth?.user?.user_type === 'admin' ? '/dashboard/admin/agrivets' : '/dashboard/super-admin/agrivets'
  }

  const PageLayout = isVendor
    ? VendorKlasmeytLayout
    : isOwnerManager
      ? OwnerManagerKlasmeytLayout
      : SuperAdminOrAdminLayout

  const shopBasePath = shop
    ? isOwnerManager
      ? `${getBaseRoute()}/stores/${shop.id}`
      : `${getBaseRoute()}/${agrivet?.id}/shops/${shop.id}`
    : ''

  const backRoute = isOwnerManager
    ? `${getBaseRoute()}/stores`
    : `${getBaseRoute()}/${agrivet?.id}/shops`
  const vendorsRoute = isOwnerManager
    ? shopBasePath
    : `${getBaseRoute()}/${agrivet?.id}/shops/${shop?.id}/vendors`
  const usersPrefix =
    auth?.user?.user_type === 'admin' ? '/dashboard/admin' : '/dashboard/super-admin'
  const vendorRegistrationRoute = isOwnerManager
    ? `/dashboard/owner-manager/vendor-registration?agrivet_id=${agrivet?.id}&shop_id=${shop?.id}`
    : `${usersPrefix}/users/vendor-registration?agrivet_id=${agrivet?.id}&shop_id=${shop?.id}`

  const reassignVendorRoute = (vendorId) => (
    isOwnerManager
      ? `${getBaseRoute()}/stores/${shop?.id}/vendors/${vendorId}/reassign`
      : `${getBaseRoute()}/${agrivet?.id}/shops/${shop?.id}/vendors/${vendorId}/reassign`
  )

  // Build a "store" object that matches the template fields/shape as closely as possible.
  const store = useMemo(() => {
    if (!shop) return null
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
      operatingDays: shop.operating_days || '—',
      operatingHours: shop.operating_hours || '—',
      coverPhoto: shop.logo_url
        ? `/storage/${shop.logo_url}`
        : 'https://images.unsplash.com/photo-1516382799247-87df95d790b7?auto=format&fit=crop&w=1600&q=60',
      permitPhoto:
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=60',
    }
  }, [shop])

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (tab && visibleTabs.includes(tab)) return tab
    }
    return 'about'
  })
  const [direction, setDirection] = useState(1)
  const [insightsPeriod, setInsightsPeriod] = useState('weekly')

  const periodInsights = useMemo(
    () => getPeriodInsights(storeInsights, insightsPeriod),
    [storeInsights, insightsPeriod],
  )

  const [starFilter, setStarFilter] = useState(null)
  const averageRating = parseFloat(shop?.average_rating || 0)

  const filteredReviews = useMemo(() => {
    if (!starFilter) return reviews
    return reviews.filter((r) => r.rating === starFilter)
  }, [reviews, starFilter])

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

  useEffect(() => {
    if (flash?.success || flash?.error) {
      const message = (flash.success || flash.error || '').toLowerCase()
      if (isVendor && visibleTabs.includes('orders') && message.includes('order')) {
        setActiveTab('orders')
      } else if (visibleTabs.includes('vendors') && flash?.success) {
        setActiveTab('vendors')
      }
    }
    if (flash?.success) {
      if (flash.success.toLowerCase().includes('reassigned')) {
        const vendorName = flash.success.split(' has been reassigned')[0]?.trim() || flash.success
        showSuccess('reassign', vendorName)
      } else {
        showSuccess('add', flash.success)
      }
    }
  }, [flash?.success])

  // Edit Store Information modal state
  const [showEditStoreModal, setShowEditStoreModal] = useState(false)
  const [showEditStoreConfirmModal, setShowEditStoreConfirmModal] = useState(false)
  const [editStoreData, setEditStoreData] = useState(() => {
    if (!shop) {
      return {
        storeName: '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        zipCode: '',
        operatingDays: [],
        openingTime: '',
        closingTime: '',
      }
    }
    const hoursParts = shop.operating_hours ? shop.operating_hours.split(' - ') : []
    return {
      storeName: shop.shop_name || '',
      street: shop.shop_address || '',
      barangay: '',
      city: shop.shop_city || '',
      province: shop.shop_province || '',
      zipCode: shop.shop_postal_code || '',
      operatingDays: parseOperatingDays(shop.operating_days),
      openingTime: hoursParts[0] ? parseTimeToInput(hoursParts[0]) : '',
      closingTime: hoursParts[1] ? parseTimeToInput(hoursParts[1]) : '',
    }
  })

  // Cover photo modal state
  const [showEditCoverPhotoModal, setShowEditCoverPhotoModal] = useState(false)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(null)
  const [coverPhotoFile, setCoverPhotoFile] = useState(null)
  const [showCoverPhotoConfirmModal, setShowCoverPhotoConfirmModal] = useState(false)

  // Vendors UI state
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [reassignSearchQuery, setReassignSearchQuery] = useState('')
  const [reassigningVendorId, setReassigningVendorId] = useState(null)
  const [showVendorStatusConfirmModal, setShowVendorStatusConfirmModal] = useState(false)
  const [vendorToToggle, setVendorToToggle] = useState(null)
  const [showRemoveVendorConfirmModal, setShowRemoveVendorConfirmModal] = useState(false)
  const [vendorToRemove, setVendorToRemove] = useState(null)

  const handleTabChange = (newTab) => {
    const currentIndex = visibleTabs.indexOf(activeTab)
    const newIndex = visibleTabs.indexOf(newTab)
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

  const closeReassignModal = () => {
    setShowReassignModal(false)
    setReassignSearchQuery('')
    setReassigningVendorId(null)
  }

  const filteredReassignableVendors = useMemo(() => {
    const query = reassignSearchQuery.trim().toLowerCase()
    if (!query) return reassignableVendors

    return reassignableVendors.filter((v) => {
      const name = vendorDisplayName(v).toLowerCase()
      const email = (v.email || '').toLowerCase()
      const shopName = (v.shop_name || '').toLowerCase()
      return name.includes(query) || email.includes(query) || shopName.includes(query)
    })
  }, [reassignableVendors, reassignSearchQuery])

  const handleReassignVendor = (vendor) => {
    setReassigningVendorId(vendor.id)
    router.post(
      reassignVendorRoute(vendor.id),
      { from_shop_id: vendor.shop_id },
      {
        preserveScroll: true,
        onSuccess: () => closeReassignModal(),
        onFinish: () => setReassigningVendorId(null),
      },
    )
  }

  const handleSaveStoreInfo = () => {
    setShowEditStoreConfirmModal(true)
  }

  const handleConfirmSaveStoreInfo = () => {
    const updateUrl = shopBasePath
    router.put(updateUrl, {
      shop_name: editStoreData.storeName,
      shop_address: editStoreData.street,
      shop_city: editStoreData.city,
      shop_province: editStoreData.province,
      shop_postal_code: editStoreData.zipCode,
      operating_days: formatOperatingDays(editStoreData.operatingDays),
      operating_hours: formatOperatingHours(editStoreData.openingTime, editStoreData.closingTime),
    }, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setShowEditStoreConfirmModal(false)
        setShowEditStoreModal(false)
        showSuccess('storeEdit', editStoreData.storeName)
      },
      onError: () => {
        setShowEditStoreConfirmModal(false)
      },
    })
  }

  const handleCoverPhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setCoverPhotoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveCoverPhoto = () => {
    if (!coverPhotoFile) return
    setShowCoverPhotoConfirmModal(true)
  }

  const handleConfirmSaveCoverPhoto = () => {
    const coverPhotoUrl = `${shopBasePath}/cover-photo`
    router.post(coverPhotoUrl, { cover_photo: coverPhotoFile }, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setShowCoverPhotoConfirmModal(false)
        setShowEditCoverPhotoModal(false)
        setCoverPhotoPreview(null)
        setCoverPhotoFile(null)
        showSuccess('storeEdit', store.storeName)
      },
      onError: () => {
        setShowCoverPhotoConfirmModal(false)
      },
    })
  }

  const isAdmin = auth?.user?.user_type === 'admin'
  const isSuperAdmin = auth?.user?.user_type === 'super_admin'
  const canAddListings = !isAdmin && !isSuperAdmin

  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showCreateBundleModal, setShowCreateBundleModal] = useState(false)
  const [showBundleSuccessModal, setShowBundleSuccessModal] = useState(false)
  const [showProductDetailModal, setShowProductDetailModal] = useState(false)
  const [selectedListingDetail, setSelectedListingDetail] = useState(null)
  const [isEditingListing, setIsEditingListing] = useState(false)
  const [editListingFormData, setEditListingFormData] = useState({
    price: '',
    stock: '',
    reorderLevel: '',
  })
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountFormData, setDiscountFormData] = useState({
    discountPercent: '',
    discountType: 'manual',
    expirationHours: '',
  })
  const [listingDiscounts, setListingDiscounts] = useState({})
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null)
  const [listingFormData, setListingFormData] = useState({
    price: '',
    stock: '',
    discount: '',
    reorderLevel: '',
  })
  const [bundleFormData, setBundleFormData] = useState({
    bundleName: '',
    bundlePrice: '',
    bundleStock: '',
    bundleReorderLevel: '',
    selectedProducts: [],
    bundleDescription: '',
  })
  const [productAddSearchQuery, setProductAddSearchQuery] = useState('')
  const [showProductAddSuggestions, setShowProductAddSuggestions] = useState(false)

  const registeredProducts = useMemo(
    () => product_catalog.map(mapCatalogToRegisteredProduct),
    [product_catalog]
  )

  const filteredCatalogProducts = useMemo(() => {
    if (!productAddSearchQuery.trim()) return registeredProducts
    return registeredProducts.filter((p) => catalogProductMatchesSearch(p, productAddSearchQuery))
  }, [registeredProducts, productAddSearchQuery])

  const storeListingUrl = useMemo(() => {
    if (!shop?.id) return null
    if (isOwnerManager) return `${getBaseRoute()}/stores/${shop.id}/listings`
    if (isVendor) return '/dashboard/vendor/shop-listings'
    return null
  }, [shop?.id, isOwnerManager, isVendor])

  const storeBundleUrl = useMemo(() => {
    if (!shop?.id) return null
    if (isOwnerManager) return `${getBaseRoute()}/stores/${shop.id}/bundles`
    if (isVendor) return '/dashboard/vendor/shop-bundles'
    return null
  }, [shop?.id, isOwnerManager, isVendor])

  const getListingItemUpdateUrl = (itemId) => {
    if (!shop?.id || !itemId) return null
    if (isOwnerManager) return `${getBaseRoute()}/stores/${shop.id}/listings/${itemId}`
    if (isVendor) return `/dashboard/vendor/shop-listings/${itemId}`
    return null
  }

  const listingDiscountsKey = shop?.id ? `agrivetListingDiscounts_${shop.id}` : null

  useEffect(() => {
    if (!listingDiscountsKey) return
    try {
      const raw = sessionStorage.getItem(listingDiscountsKey)
      setListingDiscounts(raw ? JSON.parse(raw) : {})
    } catch {
      setListingDiscounts({})
    }
  }, [listingDiscountsKey])

  const persistListingDiscounts = (next) => {
    setListingDiscounts(next)
    if (listingDiscountsKey) {
      sessionStorage.setItem(listingDiscountsKey, JSON.stringify(next))
    }
  }

  const closeAddProductModal = () => {
    setShowAddProductModal(false)
    setSelectedCatalogProduct(null)
    setListingFormData({ price: '', stock: '', discount: '', reorderLevel: '' })
    setProductAddSearchQuery('')
    setShowProductAddSuggestions(false)
  }

  const handleSaveListing = () => {
    if (
      !selectedCatalogProduct ||
      !listingFormData.price ||
      !listingFormData.stock ||
      !listingFormData.reorderLevel ||
      !storeListingUrl
    ) {
      return
    }

    router.post(
      storeListingUrl,
      {
        product_catalog_id: selectedCatalogProduct.id,
        item_price: listingFormData.price,
        item_quantity: listingFormData.stock,
        reorder_level: listingFormData.reorderLevel,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          closeAddProductModal()
          showSuccess('storeEdit', selectedCatalogProduct.productName)
        },
      }
    )
  }

  const updateListingItem = (listingId, payload, onSuccess) => {
    const url = getListingItemUpdateUrl(listingId)
    if (!url) return
    router.put(url, payload, {
      preserveScroll: true,
      onSuccess,
    })
  }

  const handleProductStatusToggle = (listing) => {
    const currentManualStatus = listing.manualStatus || 'Active'
    const nextStatus = currentManualStatus === 'Active' ? 'Inactive' : 'Active'
    updateListingItem(listing.id, {
      item_status: nextStatus === 'Active' ? 'active' : 'inactive',
    })
  }

  const handleOpenProductDetail = (listing) => {
    setSelectedListingDetail(listing)
    setEditListingFormData({
      price: listing.price.toString(),
      stock: listing.stock.toString(),
      reorderLevel: listing.reorderLevel.toString(),
    })
    setIsEditingListing(false)
    setShowProductDetailModal(true)
  }

  const handleSaveListingEdit = () => {
    if (!selectedListingDetail) return
    updateListingItem(
      selectedListingDetail.id,
      {
        item_price: editListingFormData.price,
        item_quantity: editListingFormData.stock,
      },
      () => {
        setIsEditingListing(false)
        setShowProductDetailModal(false)
        setSelectedListingDetail(null)
      }
    )
  }

  const handleApplyDiscount = () => {
    if (!selectedListingDetail) return

    const discountPercent = discountFormData.discountPercent
      ? parseFloat(discountFormData.discountPercent)
      : 0
    const expirationTime =
      discountFormData.discountType === 'timed' && discountFormData.expirationHours
        ? Date.now() + parseInt(discountFormData.expirationHours, 10) * 60 * 60 * 1000
        : null

    const discountPayload =
      discountPercent > 0
        ? {
            discountPercent,
            discountType: discountFormData.discountType,
            discountExpiration: expirationTime,
          }
        : null

    const next = { ...listingDiscounts }
    if (discountPayload) {
      next[selectedListingDetail.id] = discountPayload
    } else {
      delete next[selectedListingDetail.id]
    }
    persistListingDiscounts(next)

    setSelectedListingDetail({
      ...selectedListingDetail,
      ...(discountPayload || {
        discountPercent: undefined,
        discountType: undefined,
        discountExpiration: undefined,
      }),
    })
    setShowDiscountModal(false)
    setDiscountFormData({
      discountPercent: '',
      discountType: 'manual',
      expirationHours: '',
    })
  }

  const handleRegisterProduct = () => {
    if (isVendor) {
      router.visit('/dashboard/vendor/products/create')
      return
    }
    if (isOwnerManager && shop?.id) {
      router.visit(`/dashboard/owner-manager/stores/${shop.id}/products/create`)
      return
    }
    showSuccess('storeEdit', 'Register Product')
  }

  const closeCreateBundleModal = () => {
    setShowCreateBundleModal(false)
    setBundleFormData({
      bundleName: '',
      bundlePrice: '',
      bundleStock: '',
      bundleReorderLevel: '',
      selectedProducts: [],
      bundleDescription: '',
    })
  }

  const toggleBundleProduct = (productId) => {
    setBundleFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId],
    }))
  }

  const handleCreateBundle = () => {
    if (
      !bundleFormData.bundleName ||
      !bundleFormData.bundlePrice ||
      !bundleFormData.bundleStock ||
      !bundleFormData.bundleReorderLevel ||
      bundleFormData.selectedProducts.length === 0
    ) {
      alert('Please fill in all required fields and select at least one product.')
      return
    }

    if (!storeBundleUrl) return

    router.post(
      storeBundleUrl,
      {
        bundle_name: bundleFormData.bundleName,
        item_price: bundleFormData.bundlePrice,
        item_quantity: bundleFormData.bundleStock,
        reorder_level: bundleFormData.bundleReorderLevel,
        description: bundleFormData.bundleDescription || undefined,
        product_catalog_ids: bundleFormData.selectedProducts,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setBundleFormData({
            bundleName: '',
            bundlePrice: '',
            bundleStock: '',
            bundleReorderLevel: '',
            selectedProducts: [],
            bundleDescription: '',
          })
          setShowCreateBundleModal(false)
          setShowBundleSuccessModal(true)
        },
      }
    )
  }

  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [productStatusFilter, setProductStatusFilter] = useState('All')
  const [productSortBy, setProductSortBy] = useState('name')

  const productListings = useMemo(
    () =>
      products.map((product) => {
        const images = Array.isArray(product.item_images) ? product.item_images : []
        const photos = images.length > 0 ? images.map(resolveCatalogImageUrl) : []
        const unit = [product.weight, product.metric].filter(Boolean).join(' ') || 'unit'
        const isActive = (product.item_status || 'active').toLowerCase() === 'active'

        return {
          id: product.id,
          productId: product.id,
          productName: product.item_name || '',
          brand: product.sub_category_name || product.category_name || '',
          category: product.metric === 'Bundle' ? 'Product Bundle' : (product.category_name || 'Uncategorized'),
          unit,
          price: parseFloat(product.item_price) || 0,
          stock: product.item_quantity ?? 0,
          reorderLevel: 5,
          popularity: product.sold_count ?? 0,
          photos,
          primaryPhotoIndex: 0,
          manualStatus: isActive ? 'Active' : 'Inactive',
          isBundle: product.metric === 'Bundle',
          dateAdded: product.created_at || product.updated_at || new Date().toISOString(),
        }
      }),
    [products]
  )

  const mergedListings = useMemo(
    () =>
      productListings.map((listing) => ({
        ...listing,
        ...(listingDiscounts[listing.id] || {}),
      })),
    [productListings, listingDiscounts]
  )

  const isCatalogProductListed = (catalogProduct) =>
    mergedListings.some(
      (listing) => listing.productName.toLowerCase() === catalogProduct.productName.toLowerCase()
    )

  const categories = useMemo(() => ['All', ...new Set(mergedListings.map((l) => l.category))], [mergedListings])

  const filteredListings = useMemo(() => {
    const searchLower = productSearchQuery.toLowerCase()
    return mergedListings
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
        if (productSortBy === 'date') {
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        }
        if (productSortBy === 'popularity') return (b.popularity ?? 0) - (a.popularity ?? 0)
        return 0
      })
  }, [mergedListings, productSearchQuery, categoryFilter, productStatusFilter, productSortBy])

  if (!shop || !store) {
    return (
      <PageLayout auth={auth} title="My Store">
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-semibold">No shop assigned</p>
          <p className="mt-1 text-amber-800">
            Your vendor account is not linked to a store yet. Please contact an administrator.
          </p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout auth={auth} title={`${shop.shop_name} — Store Information`} mainClassName="p-0">
      <div className="relative min-h-screen bg-[#F0F2F5]">
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
                    {successMessageType === 'add'
                      ? 'Vendor Added Successfully'
                      : successMessageType === 'reassign'
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
                    {successMessageType === 'add'
                      ? successVendorName
                      : successMessageType === 'reassign'
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
        {!isVendor && (
          <Link
            href={backRoute}
            className="absolute top-6 left-6 z-40 p-3 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-all group"
            title={isOwnerManager ? 'Back to My Stores' : `Back to ${agrivet.name}`}
          >
            <ArrowLeft className="w-5 h-5 text-[#6B7280] group-hover:text-[#102059]" />
          </Link>
        )}

        {/* Cover Photo */}
        <div className="bg-white">
          <div className="max-w-[1110px] mx-auto">
            <div className="relative">
              <div className="aspect-[4/1] bg-[#E5E7EB] overflow-hidden">
                <img src={store.coverPhoto} alt={store.storeName} className="w-full h-full object-cover" />
              </div>
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                onClick={() => setShowEditCoverPhotoModal(true)}
                title="Update cover photo"
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
                      style={{ borderRadius: '0.7rem' }}
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
                      onClick={() => setShowEditStoreModal(true)}
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
                  {visibleTabs.map((t) => (
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

                      {reviews.length > 0 && (
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
                      )}

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
                                    {review.avatar ? (
                                      <img
                                        src={review.avatar}
                                        alt={reviewCustomerName(review)}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-[#244693] flex items-center justify-center">
                                        <span className="text-white text-sm font-semibold">
                                          {reviewInitials(review)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[#050505]">{reviewCustomerName(review)}</p>
                                    <p className="text-xs text-[#65676B]">
                                      {formatReviewDate(review.created_at || review.date)}
                                    </p>
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
                              <p className="text-sm text-[#050505] leading-relaxed">
                                {review.comment || review.review_text}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Star className="w-12 h-12 text-[#E5E7EB] mx-auto mb-2" />
                            <p className="text-sm text-[#65676B]">
                              {starFilter ? 'No reviews found for this rating' : 'No reviews yet'}
                            </p>
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
                          href={vendorRegistrationRoute}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#244693] text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors"
                          style={{ border:'1px solid #dee2e6', color: '#1f2d3d'}}
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
                                  style={{ borderRadius: '0.7rem' }}
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
                        href={vendorRegistrationRoute}
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
                        {filteredListings.length}{' '}
                        {filteredListings.length === 1 ? 'listing' : 'listings'}
                        {productListings.length !== filteredListings.length &&
                          ` of ${productListings.length} total`}
                      </p>
                    </div>
                    {canAddListings && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowAddProductModal(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#102059] text-white text-sm font-semibold rounded-lg hover:bg-[#244693] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Product
                        </button>
                        <button
                          type="button"
                          onClick={handleRegisterProduct}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#102059] text-[#102059] text-sm font-semibold rounded-lg hover:bg-[#F8F9FB] transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          Register Product
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateBundleModal(true)}
                          className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#D3A218] text-[#D3A218] text-sm font-semibold rounded-lg hover:bg-[#FFFBF0] transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          Create Bundle
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
                            <option value="date">Date Added</option>
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
                        <h2 className="text-xl font-bold text-[#102059] mb-2">
                          {productListings.length === 0 ? 'No Product Listings Yet' : 'No Matching Products'}
                        </h2>
                        <p className="text-sm text-[#6B7280] mb-4">
                          {productListings.length === 0
                            ? canAddListings
                              ? 'Start adding products from the registered catalog to this store.'
                              : "This store hasn't added any product listings yet."
                            : 'Try adjusting your filters or search query.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {filteredListings.map((listing) => (
                        <div
                          key={listing.id}
                          onClick={() => handleOpenProductDetail(listing)}
                          className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="aspect-square bg-[#F9FAFB] overflow-hidden relative">
                            <img
                              src={getListingImageSrc(listing)}
                              alt={listing.productName}
                              className="w-full h-full object-contain p-12"
                              onError={(e) => {
                                if (!e.currentTarget.dataset.fallback) {
                                  e.currentTarget.dataset.fallback = 'true'
                                  e.currentTarget.src = LISTING_IMAGE_FALLBACK
                                }
                              }}
                            />
                            <div className="absolute top-2 left-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                                  getProductStatus(listing) === 'Active'
                                    ? 'bg-[#10B981] text-white'
                                    : getProductStatus(listing) === 'Inactive'
                                      ? 'bg-[#6B7280] text-white'
                                      : getProductStatus(listing) === 'Low'
                                        ? 'bg-[#F59E0B] text-white'
                                        : getProductStatus(listing) === 'Out'
                                          ? 'bg-[#E20E28] text-white'
                                          : 'bg-[#E5E7EB] text-[#102059]'
                                }`}
                              >
                                {getProductStatus(listing)}
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="text-[#102059] mb-0.5 line-clamp-1 text-[12px]">
                              {listing.productName}
                            </h3>
                            <p className="text-xs text-[#6B7280] mb-2">{listing.brand}</p>
                            <div className="flex flex-col gap-0.5 mb-2">
                              {getEffectiveDiscount(listing) > 0 ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#E20E28] text-[12px]">
                                      ₱{getDiscountedPrice(listing).toFixed(2)}
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[#E20E28] text-white px-1.5 py-0.5 rounded">
                                      -{getEffectiveDiscount(listing)}%
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-[10px] text-[#6B7280] line-through">
                                      ₱{listing.price.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-[#6B7280]">/{listing.unit}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-baseline gap-1">
                                  <span className="font-bold text-[#102059] text-[12px]">
                                    ₱{listing.price.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-[#6B7280]">/{listing.unit}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-[#6B7280]">Stock:</span>
                              <span className="font-semibold text-[#102059]">{listing.stock}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-3">
                              <span className="text-[#6B7280]">Popularity:</span>
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3 text-[#102059]" />
                                <span className="font-semibold text-[#102059]">{listing.popularity}</span>
                              </div>
                            </div>
                            {canAddListings && getListingItemUpdateUrl(listing.id) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleProductStatusToggle(listing)
                                }}
                                className={`w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                                  (listing.manualStatus || 'Active') === 'Active'
                                    ? 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
                                    : 'bg-[#102059] text-white hover:bg-[#244693]'
                                }`}
                              >
                                {(listing.manualStatus || 'Active') === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && isVendor && (
                <div className="space-y-4">
                  {flash?.success && (
                    <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
                      {flash.success}
                    </div>
                  )}
                  {flash?.error && (
                    <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                      {flash.error}
                    </div>
                  )}
                  <OwnerManagerOrdersPanel
                    orders={orders}
                    deliveryMethods={deliveryMethods}
                    preparingItemStatusId={preparingItemStatusId}
                    ordersApiBasePath={vendorOrdersApiBasePath}
                  />
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
                          type="button"
                          onClick={() => setInsightsPeriod(p)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                            insightsPeriod === p
                              ? 'bg-white text-[#244693] shadow-sm'
                              : 'text-[#65676B] hover:text-[#102059]'
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

                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#E3F2FD] rounded-full flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[#244693]" />
                          </div>
                          <InsightTrendBadge trend={periodInsights.trends?.newCustomers} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {formatInsightNumber(periodInsights.newCustomers)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">New Customers</p>
                          <div className="relative">
                            <Info className="w-3.5 h-3.5 text-[#244693] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                              <p className="font-semibold mb-1">Customer Acquisition</p>
                              <p>
                                Tracks first-time customers. Shows marketing effectiveness and brand reach. Growth
                                indicates successful customer acquisition strategies.
                              </p>
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#FFF3E0] rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#D3A218]" />
                          </div>
                          <InsightTrendBadge trend={periodInsights.trends?.returningCustomers} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {formatInsightNumber(periodInsights.returningCustomers)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Returning Customers</p>
                          <div className="relative">
                            <Info className="w-3.5 h-3.5 text-[#D3A218] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                              <p className="font-semibold mb-1">Customer Loyalty</p>
                              <p>
                                Measures repeat business. Indicates product quality and customer satisfaction. High
                                numbers mean lower acquisition costs and sustainable revenue.
                              </p>
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#F3E5F5] rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#9C27B0]" />
                          </div>
                          <InsightTrendBadge trend={periodInsights.trends?.totalCustomers} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {formatInsightNumber(periodInsights.totalCustomers)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Total Customers</p>
                          <div className="relative">
                            <Info className="w-3.5 h-3.5 text-[#9C27B0] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                              <p className="font-semibold mb-1">Market Reach</p>
                              <p>
                                Shows overall customer base size. Reflects brand presence and market penetration.
                                Growth indicates expanding market share and business scale.
                              </p>
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#E8F5E9] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-[#00C950]" />
                          </div>
                          <InsightTrendBadge trend={periodInsights.trends?.retentionRate} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {formatRetentionRate(periodInsights.retentionRate)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Retention Rate</p>
                          <div className="relative">
                            <Info className="w-3.5 h-3.5 text-[#00C950] cursor-help" />
                            <div className="absolute right-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                              <p className="font-semibold mb-1">Business Sustainability</p>
                              <p>
                                Percentage of customers who return. Critical for long-term success. Higher rates mean
                                stable revenue, reduced marketing costs, and strong customer relationships.
                              </p>
                              <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                      <div className="flex items-center gap-2 mb-6 group relative">
                        <h3 className="text-lg font-bold text-[#102059]">Customer Analysis</h3>
                        <Info className="w-4 h-4 text-[#244693] cursor-help" />
                        <div className="absolute left-0 top-full mt-2 w-80 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                          <p className="font-semibold mb-1">Customer Acquisition vs Retention Insights</p>
                          <p>
                            This chart compares new and returning customers over time. Use it to balance marketing
                            spend between acquiring new customers and retaining existing ones.
                          </p>
                          <div className="absolute left-4 -top-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#102059]" />
                        </div>
                      </div>
                      {periodInsights.customerChart.length === 0 ? (
                        <InsightChartEmpty />
                      ) : (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            key={`customer-chart-${insightsPeriod}`}
                            data={periodInsights.customerChart}
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
                      )}
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
                          <InsightTrendBadge trend={periodInsights.trends?.orderCount} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {formatInsightNumber(periodInsights.orderCount)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Number of Orders</p>
                          <div className="relative">
                            <Info className="w-3.5 h-3.5 text-[#D3A218] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                              <p className="font-semibold mb-1">Transaction Volume</p>
                              <p>
                                Total purchase transactions. Indicates business activity and customer engagement.
                                Track trends to optimize inventory, staffing, and operations.
                              </p>
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#E3F2FD] rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#244693]" />
                          </div>
                          <InsightTrendBadge trend={periodInsights.trends?.productsSold} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#102059] mb-1">
                          {formatInsightNumber(periodInsights.productsSold)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#65676B]">Products Sold</p>
                          <div className="relative">
                            <Info className="w-3.5 h-3.5 text-[#244693] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                              <p className="font-semibold mb-1">Inventory Performance</p>
                              <p>
                                Total items moved. Shows product demand and inventory turnover. Use to identify
                                best-sellers, plan restocking, and optimize product mix.
                              </p>
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                            </div>
                          </div>
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

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 max-w-sm relative group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-[#FFEBEE] rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-[#E20E28]" />
                        </div>
                        <InsightTrendBadge trend={periodInsights.trends?.revenue} />
                      </div>
                      <h3 className="text-2xl font-bold text-[#102059] mb-1">
                        {formatInsightCurrency(periodInsights.revenue)}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#65676B]">Revenue Growth</p>
                        <div className="relative">
                          <Info className="w-3.5 h-3.5 text-[#E20E28] cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                            <p className="font-semibold mb-1">Financial Health</p>
                            <p>
                              Total income growth vs previous period. Key profitability indicator. Use to assess
                              business viability, plan expansion, and make investment decisions.
                            </p>
                            <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#102059]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
                      <div className="flex items-center gap-2 mb-6 group relative">
                        <h3 className="text-lg font-bold text-[#102059]">Revenue Trend</h3>
                        <Info className="w-4 h-4 text-[#244693] cursor-help" />
                        <div className="absolute left-0 top-full mt-2 w-80 bg-[#102059] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                          <p className="font-semibold mb-1">Financial & Order Performance Tracking</p>
                          <p>
                            This dual-axis chart shows revenue (blue, left axis) and order volume (gold, right axis)
                            trends. Use it to identify peak sales periods, seasonal patterns, and growth opportunities.
                          </p>
                          <div className="absolute left-4 -top-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#102059]" />
                        </div>
                      </div>
                      {periodInsights.revenueChart.length === 0 ? (
                        <InsightChartEmpty />
                      ) : (
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart
                            key={`revenue-chart-${insightsPeriod}`}
                            data={periodInsights.revenueChart}
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
                              formatter={(value, name) => {
                                if (name === 'Revenue') {
                                  return [`₱${Number(value).toLocaleString()}`, 'Revenue']
                                }
                                return [value, 'Orders']
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
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Edit Store Information Modal */}
        {showEditStoreModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#102059]">Edit Store Information</h3>
                <button
                  className="w-8 h-8 bg-[#F0F2F5] hover:bg-[#E5E7EB] rounded-full flex items-center justify-center text-[#65676B] transition-colors"
                  onClick={() => setShowEditStoreModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[#102059] mb-2">Store Name</label>
                  <input
                    type="text"
                    value={editStoreData.storeName}
                    onChange={(e) => setEditStoreData({ ...editStoreData, storeName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                    placeholder="Enter store name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#102059] mb-2">Street</label>
                    <input
                      type="text"
                      value={editStoreData.street}
                      onChange={(e) => setEditStoreData({ ...editStoreData, street: e.target.value })}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#102059] mb-2">Barangay</label>
                    <input
                      type="text"
                      value={editStoreData.barangay}
                      onChange={(e) => setEditStoreData({ ...editStoreData, barangay: e.target.value })}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                      placeholder="Barangay"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#102059] mb-2">City/Municipality</label>
                    <input
                      type="text"
                      value={editStoreData.city}
                      onChange={(e) => setEditStoreData({ ...editStoreData, city: e.target.value })}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                      placeholder="City/Municipality"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#102059] mb-2">Province</label>
                    <input
                      type="text"
                      value={editStoreData.province}
                      onChange={(e) => setEditStoreData({ ...editStoreData, province: e.target.value })}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                      placeholder="Province"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#102059] mb-2">
                    Operating Days <span className="text-[#E20E28]">*</span>
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                      const fullDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index]
                      const isSelected = editStoreData.operatingDays.includes(fullDay)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setEditStoreData({
                              ...editStoreData,
                              operatingDays: isSelected
                                ? editStoreData.operatingDays.filter((d) => d !== fullDay)
                                : [...editStoreData.operatingDays, fullDay],
                            })
                          }}
                          className={`py-3 px-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'bg-[#102059] border-[#102059] text-white'
                              : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#102059]'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  {editStoreData.operatingDays.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                      <p className="text-xs text-[#102059]">
                        <span className="font-semibold">Selected:</span>{' '}
                        {editStoreData.operatingDays
                          .slice()
                          .sort((a, b) => {
                            const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                            return order.indexOf(a) - order.indexOf(b)
                          })
                          .join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#102059] mb-2">
                    Operating Hours <span className="text-[#E20E28]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#65676B] mb-2">Opening Time <span className="text-[#E20E28]">*</span></label>
                      <input
                        type="time"
                        value={editStoreData.openingTime}
                        onChange={(e) => setEditStoreData({ ...editStoreData, openingTime: e.target.value })}
                        className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#65676B] mb-2">Closing Time <span className="text-[#E20E28]">*</span></label>
                      <input
                        type="time"
                        value={editStoreData.closingTime}
                        onChange={(e) => setEditStoreData({ ...editStoreData, closingTime: e.target.value })}
                        className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2.5 bg-white text-[#65676B] border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  onClick={() => setShowEditStoreModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors"
                  onClick={handleSaveStoreInfo}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Store Information Confirm Modal */}
        {showEditStoreConfirmModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#102059]">Save Changes</h3>
                <button
                  className="w-8 h-8 bg-[#F0F2F5] hover:bg-[#E5E7EB] rounded-full flex items-center justify-center text-[#65676B] transition-colors"
                  onClick={() => setShowEditStoreConfirmModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#65676B] leading-relaxed">
                Are you sure you want to save changes to <span className="font-semibold text-[#102059]">{editStoreData.storeName}</span>?
              </p>
              <div className="flex items-center justify-end mt-6 gap-2">
                <button
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  onClick={() => setShowEditStoreConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors"
                  onClick={handleConfirmSaveStoreInfo}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Cover Photo Modal */}
        {showEditCoverPhotoModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#102059]">Update Cover Photo</h3>
                <button
                  className="w-8 h-8 bg-[#F0F2F5] hover:bg-[#E5E7EB] rounded-full flex items-center justify-center text-[#65676B] transition-colors"
                  onClick={() => { setShowEditCoverPhotoModal(false); setCoverPhotoPreview(null) }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[#102059] mb-3">Upload New Cover Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoUpload}
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#244693] file:text-white hover:file:bg-[#1a3570] file:cursor-pointer"
                  />
                </div>
                {coverPhotoPreview && (
                  <div>
                    <label className="block text-sm font-semibold text-[#102059] mb-3">Preview</label>
                    <div className="aspect-[4/1] rounded-lg overflow-hidden border border-[#E5E7EB]">
                      <img src={coverPhotoPreview} alt="Cover Photo Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2.5 bg-white text-[#65676B] border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  onClick={() => { setShowEditCoverPhotoModal(false); setCoverPhotoPreview(null) }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSaveCoverPhoto}
                  disabled={!coverPhotoPreview}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cover Photo Confirm Modal */}
        {showCoverPhotoConfirmModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#102059]">Update Cover Photo</h3>
                <button
                  className="w-8 h-8 bg-[#F0F2F5] hover:bg-[#E5E7EB] rounded-full flex items-center justify-center text-[#65676B] transition-colors"
                  onClick={() => setShowCoverPhotoConfirmModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#65676B] leading-relaxed">
                Are you sure you want to update the cover photo for <span className="font-semibold text-[#102059]">{store.storeName}</span>?
              </p>
              <div className="flex items-center justify-end mt-6 gap-2">
                <button
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  onClick={() => setShowCoverPhotoConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors"
                  onClick={handleConfirmSaveCoverPhoto}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reassign Vendor Modal */}
        {showReassignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeReassignModal}>
            <div
              className="bg-white rounded-lg w-[560px] max-w-[90%] max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-[#102059]">Reassign Vendor</h2>
                  <button
                    className="p-2 text-[#65676B] hover:text-[#102059] transition-colors"
                    onClick={closeReassignModal}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#65676B]">
                  Move a vendor from another store under <span className="font-semibold text-[#102059]">{agrivet.name}</span> to{' '}
                  <span className="font-semibold text-[#102059]">{store.storeName}</span>.
                </p>
              </div>

              {reassignableVendors.length > 0 && (
                <div className="px-6 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B]" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or store..."
                      value={reassignSearchQuery}
                      onChange={(e) => setReassignSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] placeholder:text-[#65676B] focus:outline-none focus:ring-2 focus:ring-[#244693]/20 focus:border-[#244693]"
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {reassignableVendors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-16 h-16 bg-[#F0F2F5] rounded-full flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-[#65676B]" />
                    </div>
                    <h3 className="text-base font-bold text-[#102059] mb-1">No Vendors Available</h3>
                    <p className="text-sm text-[#65676B] max-w-sm">
                      All vendors under this Agrivet are already assigned to this store, or no other stores have vendors yet.
                    </p>
                  </div>
                ) : filteredReassignableVendors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Search className="w-8 h-8 text-[#65676B] mb-3" />
                    <p className="text-sm text-[#65676B]">No vendors match your search.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReassignableVendors.map((v) => (
                      <div
                        key={`${v.id}-${v.shop_id}`}
                        className="border border-[#E5E7EB] rounded-lg p-4 hover:bg-[#F9FAFB] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-[#102059] rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">{vendorInitials(v).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-bold text-[#102059] truncate">{vendorDisplayName(v)}</h3>
                              <p className="text-xs text-[#65676B] truncate">{v.email}</p>
                              <p className="text-xs text-[#244693] font-medium mt-0.5 truncate">
                                Currently at: {v.shop_name}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReassignVendor(v)}
                            disabled={reassigningVendorId === v.id}
                            className="flex-shrink-0 px-4 py-2 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {reassigningVendorId === v.id ? 'Reassigning...' : 'Reassign'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB]"
                  onClick={closeReassignModal}
                >
                  Close
                </button>
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

        {/* Add Product Modal */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
                <div>
                  <h2 className="text-xl font-bold text-[#102059]">Add Product to Store</h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Choose from registered products and set listing details
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAddProductModal}
                  className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#6B7280]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!selectedCatalogProduct ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[#102059] mb-4">Select a Product</h3>

                    <div className="relative mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                        <input
                          type="text"
                          value={productAddSearchQuery}
                          onChange={(e) => setProductAddSearchQuery(e.target.value)}
                          onFocus={() => setShowProductAddSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowProductAddSuggestions(false), 200)}
                          placeholder="Search products by name or category..."
                          className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                        />
                        {productAddSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductAddSearchQuery('')
                              setShowProductAddSuggestions(false)
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#102059]"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {showProductAddSuggestions && productAddSearchQuery.trim() && (
                        <div className="absolute z-20 mt-2 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {filteredCatalogProducts.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <p className="text-sm text-[#6B7280]">No products found</p>
                            </div>
                          ) : (
                            filteredCatalogProducts.map((product) => {
                              const listed = isCatalogProductListed(product)
                              return (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    if (listed) return
                                    setSelectedCatalogProduct(product)
                                    setProductAddSearchQuery('')
                                    setShowProductAddSuggestions(false)
                                  }}
                                  className={`px-4 py-3 border-b border-[#E5E7EB] last:border-b-0 transition-colors ${
                                    listed
                                      ? 'opacity-50 cursor-not-allowed bg-[#F9FAFB]'
                                      : 'cursor-pointer hover:bg-[#F9FAFB]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#F9FAFB] rounded-lg overflow-hidden flex-shrink-0">
                                      <img
                                        src={product.image}
                                        alt={product.productName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-semibold text-[#102059] truncate">
                                        {product.productName}
                                      </h4>
                                      <p className="text-xs text-[#6B7280] truncate">
                                        {product.brand ? `${product.brand} • ` : ''}
                                        {product.category}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {registeredProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-[#E5E7EB] mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-[#102059] mb-2">No Registered Products</h3>
                        <p className="text-sm text-[#6B7280]">
                          Please register products in the catalog first before creating listings.
                        </p>
                      </div>
                    ) : filteredCatalogProducts.length === 0 ? (
                      <div className="col-span-3 text-center py-12">
                        <p className="text-sm text-[#6B7280]">No products found matching your search</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {filteredCatalogProducts.map((product) => {
                          const listed = isCatalogProductListed(product)
                          return (
                            <div
                              key={product.id}
                              onClick={() => !listed && setSelectedCatalogProduct(product)}
                              className={`border rounded-lg p-4 transition-all ${
                                listed
                                  ? 'border-[#E5E7EB] bg-[#F9FAFB] opacity-50 cursor-not-allowed'
                                  : 'border-[#E5E7EB] cursor-pointer hover:border-[#102059] hover:shadow-md'
                              }`}
                            >
                              <div className="aspect-square bg-[#F9FAFB] rounded-lg mb-3 overflow-hidden">
                                <img
                                  src={product.image}
                                  alt={product.productName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <h4 className="text-sm font-semibold text-[#102059] mb-1">{product.productName}</h4>
                              <p className="text-xs text-[#6B7280]">{product.category}</p>
                              {listed && (
                                <p className="text-xs text-[#9CA3AF] mt-2">Already listed</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedCatalogProduct(null)}
                      className="flex items-center gap-2 text-sm text-[#244693] hover:text-[#102059] mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to products
                    </button>

                    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 mb-6">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={selectedCatalogProduct.image}
                            alt={selectedCatalogProduct.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#102059]">{selectedCatalogProduct.productName}</h4>
                          <p className="text-xs text-[#6B7280] mt-1">
                            {selectedCatalogProduct.brand
                              ? `${selectedCatalogProduct.brand} • `
                              : ''}
                            {selectedCatalogProduct.category}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                            Price (₱) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={listingFormData.price}
                            onChange={(e) =>
                              setListingFormData({ ...listingFormData, price: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                            Stock Quantity *
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={listingFormData.stock}
                            onChange={(e) =>
                              setListingFormData({ ...listingFormData, stock: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                            Reorder Level *
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={listingFormData.reorderLevel}
                            onChange={(e) =>
                              setListingFormData({ ...listingFormData, reorderLevel: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedCatalogProduct && (
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={closeAddProductModal}
                    className="px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveListing}
                    disabled={
                      !listingFormData.price ||
                      !listingFormData.stock ||
                      !listingFormData.reorderLevel ||
                      !storeListingUrl
                    }
                    className="px-6 py-2.5 bg-[#102059] text-white rounded-lg hover:bg-[#244693] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Product
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Bundle Modal */}
        {showCreateBundleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
                <div>
                  <h2 className="text-xl font-bold text-[#102059]">Create Product Bundle</h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Combine multiple products into a promotional bundle
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateBundleModal}
                  className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#6B7280]" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <h3 className="text-sm font-semibold text-[#102059] mb-4">Bundle Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                          Bundle Name *
                        </label>
                        <input
                          type="text"
                          value={bundleFormData.bundleName}
                          onChange={(e) =>
                            setBundleFormData({ ...bundleFormData, bundleName: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                          placeholder="e.g., Starter Kit, Ultimate Care Package"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                            Bundle Price (₱) *
                          </label>
                          <input
                            type="number"
                            value={bundleFormData.bundlePrice}
                            onChange={(e) =>
                              setBundleFormData({ ...bundleFormData, bundlePrice: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                            Stock Quantity *
                          </label>
                          <input
                            type="number"
                            value={bundleFormData.bundleStock}
                            onChange={(e) =>
                              setBundleFormData({ ...bundleFormData, bundleStock: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                            Reorder Level *
                          </label>
                          <input
                            type="number"
                            value={bundleFormData.bundleReorderLevel}
                            onChange={(e) =>
                              setBundleFormData({
                                ...bundleFormData,
                                bundleReorderLevel: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#102059] mb-4">
                      Select Products for Bundle *
                    </h3>
                    {registeredProducts.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-[#E5E7EB] rounded-lg">
                        <Package className="w-12 h-12 text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-sm text-[#6B7280]">
                          No registered products available. Register products first to create a bundle.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {registeredProducts.map((product) => (
                          <label
                            key={product.id}
                            className="border border-[#E5E7EB] rounded-lg p-4 cursor-pointer hover:border-[#D3A218] hover:bg-[#FFFBF0] transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={bundleFormData.selectedProducts.includes(product.id)}
                              onChange={() => toggleBundleProduct(product.id)}
                              className="mb-3"
                            />
                            <div className="aspect-square bg-[#F9FAFB] rounded-lg mb-3 overflow-hidden">
                              <img
                                src={product.image}
                                alt={product.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <h4 className="text-sm font-semibold text-[#102059] mb-1">
                              {product.productName}
                            </h4>
                            <p className="text-xs text-[#6B7280]">{product.category}</p>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                      Bundle Description
                    </label>
                    <textarea
                      value={bundleFormData.bundleDescription}
                      onChange={(e) =>
                        setBundleFormData({ ...bundleFormData, bundleDescription: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm resize-none"
                      placeholder="Describe what's included in this bundle and its benefits..."
                    />
                  </div>
                </form>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={closeCreateBundleModal}
                  className="px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateBundle}
                  disabled={!storeBundleUrl}
                  className="px-6 py-2.5 bg-[#D3A218] text-white rounded-lg hover:bg-[#B8900F] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Bundle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bundle Success Modal */}
        {showBundleSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#FFFBF0] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-[#D3A218]" />
                </div>
                <h3 className="text-xl font-bold text-[#102059] mb-2">Bundle Created Successfully</h3>
                <p className="text-sm text-[#6B7280] mb-6">
                  Your product bundle has been created and is now available in your store listings.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBundleSuccessModal(false)}
                  className="w-full px-6 py-2.5 bg-[#D3A218] text-white rounded-lg hover:bg-[#B8900F] transition-colors text-sm font-medium"
                >
                  Back to Product Listing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Detail Modal */}
        {showProductDetailModal && selectedListingDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-2xl">
              <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
                <div>
                  <h2 className="text-xl font-bold text-[#102059]">
                    {selectedListingDetail.isBundle ? 'Bundle Details' : 'Product Details'}
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">View and manage listing information</p>
                </div>
                <div className="flex items-center gap-2">
                  {canAddListings && !isEditingListing && getListingItemUpdateUrl(selectedListingDetail.id) && (
                    <button
                      type="button"
                      onClick={() => setIsEditingListing(true)}
                      className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-5 h-5 text-[#102059]" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductDetailModal(false)
                      setIsEditingListing(false)
                      setSelectedListingDetail(null)
                    }}
                    className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#6B7280]" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                    {selectedListingDetail.isBundle ? 'Bundle Name' : 'Product Name'}
                  </label>
                  <input
                    type="text"
                    value={selectedListingDetail.productName}
                    disabled
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-sm text-[#6B7280] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={selectedListingDetail.category}
                    disabled
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] text-sm text-[#6B7280] cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                      {selectedListingDetail.isBundle ? 'Bundle Price (₱)' : 'Price (₱)'}
                    </label>
                    <input
                      type="number"
                      value={isEditingListing ? editListingFormData.price : selectedListingDetail.price}
                      onChange={(e) =>
                        setEditListingFormData({ ...editListingFormData, price: e.target.value })
                      }
                      disabled={!isEditingListing}
                      className={`w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm ${
                        isEditingListing
                          ? 'focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent'
                          : 'bg-[#F9FAFB] text-[#6B7280] cursor-not-allowed'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={isEditingListing ? editListingFormData.stock : selectedListingDetail.stock}
                      onChange={(e) =>
                        setEditListingFormData({ ...editListingFormData, stock: e.target.value })
                      }
                      disabled={!isEditingListing}
                      className={`w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm ${
                        isEditingListing
                          ? 'focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent'
                          : 'bg-[#F9FAFB] text-[#6B7280] cursor-not-allowed'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      value={
                        isEditingListing
                          ? editListingFormData.reorderLevel
                          : selectedListingDetail.reorderLevel
                      }
                      onChange={(e) =>
                        setEditListingFormData({ ...editListingFormData, reorderLevel: e.target.value })
                      }
                      disabled={!isEditingListing}
                      className={`w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm ${
                        isEditingListing
                          ? 'focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent'
                          : 'bg-[#F9FAFB] text-[#6B7280] cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {getEffectiveDiscount(selectedListingDetail) > 0 && (
                  <div className="bg-[#FFF5F5] border border-[#E20E28] rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[#E20E28] mb-1">Active Discount</h4>
                        <p className="text-xs text-[#6B7280]">
                          {getEffectiveDiscount(selectedListingDetail)}% off •{' '}
                          {selectedListingDetail.discountType === 'manual'
                            ? 'Manual deactivation'
                            : `Expires ${new Date(selectedListingDetail.discountExpiration).toLocaleString()}`}
                        </p>
                        <p className="text-sm font-semibold text-[#102059] mt-2">
                          Discounted Price: ₱{getDiscountedPrice(selectedListingDetail).toFixed(2)}
                        </p>
                      </div>
                      {canAddListings && selectedListingDetail.discountType === 'manual' && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...listingDiscounts }
                            delete next[selectedListingDetail.id]
                            persistListingDiscounts(next)
                            setSelectedListingDetail({
                              ...selectedListingDetail,
                              discountPercent: undefined,
                              discountType: undefined,
                              discountExpiration: undefined,
                            })
                          }}
                          className="text-xs font-semibold text-[#E20E28] hover:text-[#B8000F] transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-6 border-t border-[#E5E7EB]">
                <div>
                  {canAddListings && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiscountModal(true)
                        setDiscountFormData({
                          discountPercent: selectedListingDetail.discountPercent?.toString() || '',
                          discountType: selectedListingDetail.discountType || 'manual',
                          expirationHours: '',
                        })
                      }}
                      className="px-4 py-2.5 bg-[#E20E28] text-white rounded-lg hover:bg-[#B8000F] transition-colors text-sm font-medium"
                    >
                      {getEffectiveDiscount(selectedListingDetail) > 0 ? 'Edit Discount' : 'Add Discount'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isEditingListing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingListing(false)
                          setEditListingFormData({
                            price: selectedListingDetail.price.toString(),
                            stock: selectedListingDetail.stock.toString(),
                            reorderLevel: selectedListingDetail.reorderLevel.toString(),
                          })
                        }}
                        className="px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveListingEdit}
                        className="px-6 py-2.5 bg-[#102059] text-white rounded-lg hover:bg-[#244693] transition-colors text-sm font-medium"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductDetailModal(false)
                        setIsEditingListing(false)
                        setSelectedListingDetail(null)
                      }}
                      className="px-6 py-2.5 bg-[#102059] text-white rounded-lg hover:bg-[#244693] transition-colors text-sm font-medium"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Discount Modal */}
        {showDiscountModal && selectedListingDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg border border-[#E5E7EB] w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
                <div>
                  <h2 className="text-xl font-bold text-[#102059]">Manage Discount</h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Set pricing discount for {selectedListingDetail.productName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#6B7280]" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountFormData.discountPercent}
                    onChange={(e) =>
                      setDiscountFormData({ ...discountFormData, discountPercent: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                    placeholder="e.g., 20"
                  />
                  {discountFormData.discountPercent && (
                    <p className="text-xs text-[#6B7280] mt-2">
                      New Price: ₱
                      {(
                        selectedListingDetail.price *
                        (1 - parseFloat(discountFormData.discountPercent || '0') / 100)
                      ).toFixed(2)}
                      <span className="text-[#E20E28] ml-2">
                        (Save ₱
                        {(
                          (selectedListingDetail.price *
                            parseFloat(discountFormData.discountPercent || '0')) /
                          100
                        ).toFixed(2)}
                        )
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-3">
                    Discount Duration
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors">
                      <input
                        type="radio"
                        name="discountType"
                        value="manual"
                        checked={discountFormData.discountType === 'manual'}
                        onChange={(e) =>
                          setDiscountFormData({ ...discountFormData, discountType: e.target.value })
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#102059]">Manual Deactivation</div>
                        <div className="text-xs text-[#6B7280] mt-1">
                          Discount remains active until you manually remove it
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border border-[#E5E7EB] rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors">
                      <input
                        type="radio"
                        name="discountType"
                        value="timed"
                        checked={discountFormData.discountType === 'timed'}
                        onChange={(e) =>
                          setDiscountFormData({ ...discountFormData, discountType: e.target.value })
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#102059]">Time-Based</div>
                        <div className="text-xs text-[#6B7280] mt-1">
                          Automatically expires after specified duration
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {discountFormData.discountType === 'timed' && (
                  <div>
                    <label className="text-xs font-semibold text-[#102059] uppercase tracking-wider block mb-2">
                      Duration (Hours)
                    </label>
                    <select
                      value={discountFormData.expirationHours}
                      onChange={(e) =>
                        setDiscountFormData({ ...discountFormData, expirationHours: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm"
                    >
                      <option value="">Select duration</option>
                      <option value="24">24 hours (1 day)</option>
                      <option value="48">48 hours (2 days)</option>
                      <option value="72">72 hours (3 days)</option>
                      <option value="168">168 hours (7 days)</option>
                      <option value="336">336 hours (14 days)</option>
                      <option value="720">720 hours (30 days)</option>
                    </select>
                    {discountFormData.expirationHours && (
                      <p className="text-xs text-[#6B7280] mt-2">
                        Expires:{' '}
                        {new Date(
                          Date.now() +
                            parseInt(discountFormData.expirationHours, 10) * 60 * 60 * 1000
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscountModal(false)
                    setDiscountFormData({
                      discountPercent: '',
                      discountType: 'manual',
                      expirationHours: '',
                    })
                  }}
                  className="px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={
                    !discountFormData.discountPercent ||
                    (discountFormData.discountType === 'timed' && !discountFormData.expirationHours)
                  }
                  className="px-6 py-2.5 bg-[#E20E28] text-white rounded-lg hover:bg-[#B8000F] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Discount
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
    </PageLayout>
  )
}


import { useEffect, useMemo, useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Coins, Plus, Star, Store, Upload, X } from 'lucide-react'
import OwnerManagerKlasmeytLayout, {
    OwnerManagerNoAgrivetAlert,
} from '../../Layouts/OwnerManagerKlasmeytLayout'
import PinLocationMap from '../../Components/PinLocationMap'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const inputClass =
    'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693]'

function formatShopStatus(status) {
    return status === 'active' ? 'Active' : 'Inactive'
}

function shopCoverUrl(logoUrl) {
    if (!logoUrl) return null
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('/')) {
        return logoUrl
    }
    return `/storage/${logoUrl}`
}

function FieldError({ message }) {
    if (!message) return null
    return <p className="mt-1 text-xs text-[#E20E28]">{message}</p>
}

export default function OwnerManagerStores({ auth, agrivet, shops = [], zones = [], flash }) {
    const ownerDisplayName = agrivet?.owner_name || auth.user.name
    const [showAddModal, setShowAddModal] = useState(false)
    const [operatingDays, setOperatingDays] = useState([])
    const [storeImagePreview, setStoreImagePreview] = useState(null)
    const [permitImagePreview, setPermitImagePreview] = useState(null)
    const [permitIsPdf, setPermitIsPdf] = useState(false)
    const [formError, setFormError] = useState('')

    const addForm = useForm({
        shop_name: '',
        street: '',
        barangay: '',
        shop_city: '',
        shop_province: '',
        shop_postal_code: '',
        shop_lat: '',
        shop_long: '',
        opening_time: '08:00',
        closing_time: '18:00',
        operating_days: '',
        store_image: null,
        permit_image: null,
        shop_status: 'active',
        bank_name: '',
        account_name: '',
        account_number: '',
    })

    const zonesForMap = useMemo(
        () =>
            (zones || []).filter(
                (z) => z.boundary && Array.isArray(z.boundary) && z.boundary.length >= 3,
            ),
        [zones],
    )

    const shopsForMap = useMemo(
        () =>
            (shops || []).filter((s) => {
                const lat = Number(s.shop_lat ?? s.latitude)
                const lng = Number(s.shop_long ?? s.longitude)
                return !Number.isNaN(lat) && !Number.isNaN(lng)
            }),
        [shops],
    )

    const resetAddFormState = () => {
        addForm.reset()
        addForm.clearErrors()
        setOperatingDays([])
        setStoreImagePreview(null)
        setPermitImagePreview(null)
        setPermitIsPdf(false)
        setFormError('')
    }

    const closeAddModal = () => {
        setShowAddModal(false)
        resetAddFormState()
    }

    useEffect(() => {
        if (flash?.success) {
            setShowAddModal(false)
            resetAddFormState()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success])

    const toggleDay = (fullDay) => {
        setOperatingDays((prev) =>
            prev.includes(fullDay) ? prev.filter((d) => d !== fullDay) : [...prev, fullDay],
        )
    }

    const handleStoreImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        addForm.setData('store_image', file)
        const reader = new FileReader()
        reader.onloadend = () => setStoreImagePreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handlePermitImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        addForm.setData('permit_image', file)
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
        setPermitIsPdf(isPdf)
        if (isPdf) {
            setPermitImagePreview(null)
            return
        }
        const reader = new FileReader()
        reader.onloadend = () => setPermitImagePreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handleAddShop = (e) => {
        e.preventDefault()
        if (!agrivet) return

        if (operatingDays.length === 0) {
            setFormError('Please select at least one operating day for your store.')
            return
        }
        if (!addForm.data.store_image || !addForm.data.permit_image) {
            setFormError('Please upload both store photo and business permit.')
            return
        }
        if (!addForm.data.opening_time || !addForm.data.closing_time) {
            setFormError('Please set both opening and closing times for your store.')
            return
        }

        setFormError('')
        const daysSorted = [...operatingDays].sort(
            (a, b) => FULL_DAYS.indexOf(a) - FULL_DAYS.indexOf(b),
        )
        addForm.transform((data) => ({
            ...data,
            operating_days: daysSorted.join(', '),
        }))
        addForm.post('/dashboard/owner-manager/stores', {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                addForm.transform((data) => data)
            },
            onSuccess: () => {
                resetAddFormState()
            },
        })
    }

    return (
        <OwnerManagerKlasmeytLayout auth={auth} title="My Stores">
            {!agrivet && <OwnerManagerNoAgrivetAlert />}

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                    {flash.error}
                </div>
            )}

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
                            const coverSrc = shopCoverUrl(shop.logo_url)

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
                                        {coverSrc ? (
                                            <img
                                                src={coverSrc}
                                                alt={`${shop.shop_name} storefront`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Store className="h-14 w-14 text-[#E5E7EB]" aria-hidden />
                                            </div>
                                        )}
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
                                        <h3 className="text-sm font-bold text-[#102059] mb-3">
                                            {shop.shop_name}
                                        </h3>

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

                                        <div className="text-xs text-[#6B7280] space-y-1 mb-4">
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

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-1 px-3 py-2 text-xs font-semibold text-[#1F2937] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F8F9FB] transition-colors"
                                            >
                                                Delete Store
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (!agrivet) return
                                                    router.visit(
                                                        `/dashboard/owner-manager/stores/${shop.id}/income`,
                                                    )
                                                }}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#5B6FA8] rounded-lg hover:bg-[#4A5E97] transition-colors"
                                            >
                                                <Coins className="w-3.5 h-3.5" />
                                                Income
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {agrivet && (
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
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
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && agrivet && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={closeAddModal}
                >
                    <div
                        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="text-xl font-bold text-[#102059]">Add New Store</h3>
                            <button
                                type="button"
                                className="w-8 h-8 bg-[#F0F2F5] hover:bg-[#E5E7EB] rounded-full flex items-center justify-center text-[#65676B] transition-colors"
                                onClick={closeAddModal}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddShop}>
                            <div className="p-6 space-y-6">
                                <p className="text-sm text-[#6B7280]">
                                    This store will be added under{' '}
                                    <span className="font-semibold text-[#102059]">
                                        {agrivet.registered_business_name || agrivet.name}
                                    </span>
                                    .
                                </p>

                                {(formError || addForm.errors.error) && (
                                    <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                                        {formError || addForm.errors.error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-[#102059] mb-2">
                                            Store Name <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={addForm.data.shop_name}
                                            onChange={(e) => addForm.setData('shop_name', e.target.value)}
                                            required
                                        />
                                        <FieldError message={addForm.errors.shop_name} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#102059] mb-2">
                                            Status <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <select
                                            className={inputClass}
                                            value={addForm.data.shop_status}
                                            onChange={(e) => addForm.setData('shop_status', e.target.value)}
                                            required
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                        <FieldError message={addForm.errors.shop_status} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Pin Location <span className="text-[#6B7280] font-normal">(optional)</span>
                                    </label>
                                    <PinLocationMap
                                        height={320}
                                        zones={zonesForMap}
                                        shopLocations={shopsForMap}
                                        initialLat={addForm.data.shop_lat}
                                        initialLng={addForm.data.shop_long}
                                        onLocationSelect={(loc) => {
                                            addForm.setData('shop_lat', loc.latitude != null ? String(loc.latitude) : '')
                                            addForm.setData('shop_long', loc.longitude != null ? String(loc.longitude) : '')
                                            if (loc.city) addForm.setData('shop_city', loc.city)
                                            if (loc.province) addForm.setData('shop_province', loc.province)
                                            if (loc.postal_code) addForm.setData('shop_postal_code', loc.postal_code)
                                            if (loc.address) addForm.setData('street', loc.address)
                                            if (loc.barangay) addForm.setData('barangay', loc.barangay)
                                        }}
                                    />
                                    <p className="text-xs text-[#65676B] mt-2">
                                        Click the map to place or move the pin. Address fields below update automatically.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#102059] mb-2">
                                            Latitude <span className="text-[#6B7280] font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            inputMode="decimal"
                                            placeholder="e.g. 14.5995"
                                            className={inputClass}
                                            value={addForm.data.shop_lat}
                                            onChange={(e) => addForm.setData('shop_lat', e.target.value)}
                                        />
                                        <FieldError message={addForm.errors.shop_lat} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#102059] mb-2">
                                            Longitude <span className="text-[#6B7280] font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            inputMode="decimal"
                                            placeholder="e.g. 120.9842"
                                            className={inputClass}
                                            value={addForm.data.shop_long}
                                            onChange={(e) => addForm.setData('shop_long', e.target.value)}
                                        />
                                        <FieldError message={addForm.errors.shop_long} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Street <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={addForm.data.street}
                                        onChange={(e) => addForm.setData('street', e.target.value)}
                                        required
                                    />
                                    <FieldError message={addForm.errors.street} />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Barangay <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={addForm.data.barangay}
                                        onChange={(e) => addForm.setData('barangay', e.target.value)}
                                        required
                                    />
                                    <FieldError message={addForm.errors.barangay} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#102059] mb-2">
                                            City/Municipality <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={addForm.data.shop_city}
                                            onChange={(e) => addForm.setData('shop_city', e.target.value)}
                                            required
                                        />
                                        <FieldError message={addForm.errors.shop_city} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#102059] mb-2">
                                            Province <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={addForm.data.shop_province}
                                            onChange={(e) => addForm.setData('shop_province', e.target.value)}
                                            required
                                        />
                                        <FieldError message={addForm.errors.shop_province} />
                                    </div>
                                </div>

                                <div className="md:w-1/2">
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Zip Code <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={addForm.data.shop_postal_code}
                                        onChange={(e) => addForm.setData('shop_postal_code', e.target.value)}
                                        required
                                    />
                                    <FieldError message={addForm.errors.shop_postal_code} />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Operating Days <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <div className="grid grid-cols-7 gap-2">
                                        {DAY_LABELS.map((day, index) => {
                                            const fullDay = FULL_DAYS[index]
                                            const isSelected = operatingDays.includes(fullDay)
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => toggleDay(fullDay)}
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
                                    {operatingDays.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                                            <p className="text-xs text-[#102059]">
                                                <span className="font-semibold">Selected:</span>{' '}
                                                {[...operatingDays]
                                                    .sort((a, b) => FULL_DAYS.indexOf(a) - FULL_DAYS.indexOf(b))
                                                    .join(', ')}
                                            </p>
                                        </div>
                                    )}
                                    <FieldError message={addForm.errors.operating_days} />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Operating Hours <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-[#65676B] mb-2">
                                                Opening Time <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                className={inputClass}
                                                value={addForm.data.opening_time}
                                                onChange={(e) => addForm.setData('opening_time', e.target.value)}
                                                required
                                            />
                                            <FieldError message={addForm.errors.opening_time} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#65676B] mb-2">
                                                Closing Time <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                className={inputClass}
                                                value={addForm.data.closing_time}
                                                onChange={(e) => addForm.setData('closing_time', e.target.value)}
                                                required
                                            />
                                            <FieldError message={addForm.errors.closing_time} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Bank Details <span className="text-[#6B7280] font-normal">(optional)</span>
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs text-[#65676B] mb-1">Bank Name</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={addForm.data.bank_name}
                                                onChange={(e) => addForm.setData('bank_name', e.target.value)}
                                                placeholder="e.g. BDO, BPI"
                                            />
                                            <FieldError message={addForm.errors.bank_name} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#65676B] mb-1">Account Name</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={addForm.data.account_name}
                                                onChange={(e) => addForm.setData('account_name', e.target.value)}
                                                placeholder="Account holder name"
                                            />
                                            <FieldError message={addForm.errors.account_name} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#65676B] mb-1">Account Number</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={addForm.data.account_number}
                                                onChange={(e) => addForm.setData('account_number', e.target.value)}
                                                placeholder="Account number"
                                            />
                                            <FieldError message={addForm.errors.account_number} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Store front photo <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="om_add_store_image"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleStoreImageUpload}
                                    />
                                    <label
                                        htmlFor="om_add_store_image"
                                        className="block rounded-lg border border-dashed border-[#E5E7EB] bg-[#F8F9FB] p-6 text-center cursor-pointer hover:border-[#102059] transition-colors"
                                    >
                                        {storeImagePreview ? (
                                            <div>
                                                <img
                                                    src={storeImagePreview}
                                                    alt="Store preview"
                                                    className="mx-auto mb-3 max-h-64 rounded-lg"
                                                />
                                                <p className="text-xs text-[#6B7280]">Click to change image</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload className="mx-auto mb-2 text-[#6B7280]" size={40} />
                                                <p className="text-sm text-[#102059] mb-1">Upload store photo</p>
                                                <p className="text-xs text-[#6B7280]">PNG, JPG up to 10MB</p>
                                            </div>
                                        )}
                                    </label>
                                    <FieldError message={addForm.errors.store_image} />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#102059] mb-2">
                                        Business permit <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="om_add_permit_image"
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={handlePermitImageUpload}
                                    />
                                    <label
                                        htmlFor="om_add_permit_image"
                                        className="block rounded-lg border border-dashed border-[#E5E7EB] bg-[#F8F9FB] p-6 text-center cursor-pointer hover:border-[#102059] transition-colors"
                                    >
                                        {permitIsPdf ? (
                                            <div>
                                                <p className="text-sm font-semibold text-[#102059] mb-1">PDF selected</p>
                                                <p className="text-xs text-[#6B7280]">Click to change file</p>
                                            </div>
                                        ) : permitImagePreview ? (
                                            <div>
                                                <img
                                                    src={permitImagePreview}
                                                    alt="Permit preview"
                                                    className="mx-auto mb-3 max-h-64 rounded-lg"
                                                />
                                                <p className="text-xs text-[#6B7280]">Click to change file</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload className="mx-auto mb-2 text-[#6B7280]" size={40} />
                                                <p className="text-sm text-[#102059] mb-1">Upload permit</p>
                                                <p className="text-xs text-[#6B7280]">PNG, JPG, PDF up to 10MB</p>
                                            </div>
                                        )}
                                    </label>
                                    <FieldError message={addForm.errors.permit_image} />
                                </div>
                            </div>
                            <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    className="px-4 py-2.5 bg-white text-[#65676B] border border-[#E5E7EB] text-sm font-semibold rounded-lg hover:bg-[#F9FAFB] transition-colors"
                                    onClick={closeAddModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addForm.processing}
                                    className="px-4 py-2.5 bg-[#244693] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3570] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addForm.processing ? 'Creating...' : 'Create Store'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </OwnerManagerKlasmeytLayout>
    )
}

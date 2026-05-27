import { useMemo, useRef, useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, Upload, X } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import PinLocationMap from '../../Components/PinLocationMap'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function AddAgrivetShell({ auth, title, children }) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title={title} notificationCount={0}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return <KlasmeytDashboardLayout auth={auth} title={title}>{children}</KlasmeytDashboardLayout>
}

export default function AddAgrivet({ auth, zones = [], flash }) {
    const [currentStep, setCurrentStep] = useState(1)
    const [storeImagePreview, setStoreImagePreview] = useState(null)
    const [permitImagePreview, setPermitImagePreview] = useState(null)
    const [permitIsPdf, setPermitIsPdf] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const [operatingDays, setOperatingDays] = useState([])
    const isSubmittingRef = useRef(false)

    const zonesForMap = useMemo(
        () => (zones || []).filter((z) => z.boundary && Array.isArray(z.boundary) && z.boundary.length >= 3),
        [zones],
    )

    const baseRoute =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/agrivets' : '/dashboard/super-admin/agrivets'

    const accountsUrl =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/users' : '/dashboard/super-admin/users'

    const form = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        phone_number: '',
        agrivet_name: '',
        store_name: '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        zip_code: '',
        opening_time: '08:00',
        closing_time: '18:00',
        shop_lat: '',
        shop_long: '',
        store_image: null,
        permit_image: null,
        operating_days: '',
    })

    const steps = [
        { number: 1, title: 'Account Information' },
        { number: 2, title: 'Business Information' },
        { number: 3, title: 'Store Information' },
        { number: 4, title: 'Review & Confirm' },
    ]

    const handleStoreImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            form.setData('store_image', file)
            const reader = new FileReader()
            reader.onloadend = () => setStoreImagePreview(reader.result)
            reader.readAsDataURL(file)
        }
    }

    const handlePermitImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            form.setData('permit_image', file)
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
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (isSubmittingRef.current || form.processing) {
            return
        }
        if (currentStep !== 4) {
            return
        }
        if (!form.data.store_image || !form.data.permit_image) {
            alert('Please upload both store photo and business permit.')
            return
        }
        isSubmittingRef.current = true
        const daysSorted = [...operatingDays].sort((a, b) => FULL_DAYS.indexOf(a) - FULL_DAYS.indexOf(b))

        // Ensure `operating_days` is included in the SAME request.
        // `setData()` is async; using `transform()` avoids the “submit twice” issue caused by stale state.
        form.transform((data) => ({
            ...data,
            operating_days: daysSorted.join(', '),
        }))
        form.post(`${baseRoute}/setup-wizard`, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                isSubmittingRef.current = false
                // Reset transform so it doesn't affect other submissions.
                form.transform((data) => data)
            },
        })
    }

    const nextStep = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setErrorMessage(null)

        if (currentStep === 3) {
            if (!form.data.store_image || !form.data.permit_image) {
                setErrorMessage('Please upload both store photo and business permit before proceeding.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            if (operatingDays.length === 0) {
                setErrorMessage('Please select at least one operating day for your store.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            if (!form.data.opening_time || !form.data.closing_time) {
                setErrorMessage('Please set both opening and closing times for your store.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep < 4) {
            setCurrentStep(currentStep + 1)
        }
    }

    const prevStep = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const toggleDay = (fullDay) => {
        setOperatingDays((prev) =>
            prev.includes(fullDay) ? prev.filter((d) => d !== fullDay) : [...prev, fullDay],
        )
    }

    const inputClass =
        'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm outline-none ring-[#244693]/30 transition-all focus:border-[#244693] focus:ring-2'

    return (
        <AddAgrivetShell auth={auth} title="Add Agrivet">
            <Head title="Add Agrivet" />

            <div className="min-h-screen bg-[#F8F9FB]">
                <button
                    type="button"
                    onClick={() => router.visit(accountsUrl)}
                    className="absolute left-6 top-6 z-10 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB] group"
                    title="Back to Accounts"
                >
                    <ArrowLeft className="h-5 w-5 text-[#6B7280] group-hover:text-[#102059]" />
                </button>

                <div className="container mx-auto px-6 py-8 pt-20">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-8">
                            <h1 className="mb-2 text-2xl font-semibold text-[#102059]" style={{ fontFamily: 'Inter Condensed, sans-serif' }}>
                                Become a Trusted Store
                            </h1>
                            <p className="text-sm text-[#6B7280]">
                                Register an agrivet and its primary branch. An owner/manager account is created for the store
                                dashboard using the email and password below.
                            </p>
                        </div>

                        {flash?.success && (
                            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                                {flash.error}
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                {steps.map((step, index) => (
                                    <div key={step.number} className="flex flex-1 items-center">
                                        <div className="flex items-center">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                                                    currentStep > step.number
                                                        ? 'border-[#102059] bg-[#102059]'
                                                        : currentStep === step.number
                                                          ? 'border-[#102059] bg-[#102059]'
                                                          : 'border-[#E5E7EB] bg-white'
                                                }`}
                                            >
                                                {currentStep > step.number ? (
                                                    <Check className="h-5 w-5 text-white" />
                                                ) : (
                                                    <span
                                                        className={`text-sm font-semibold ${
                                                            currentStep === step.number ? 'text-white' : 'text-[#9CA3AF]'
                                                        }`}
                                                    >
                                                        {step.number}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ml-3">
                                                <p
                                                    className={`text-sm font-semibold ${
                                                        currentStep >= step.number ? 'text-[#102059]' : 'text-[#9CA3AF]'
                                                    }`}
                                                >
                                                    {step.title}
                                                </p>
                                            </div>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div
                                                className={`mx-4 h-0.5 flex-1 transition-all ${
                                                    currentStep > step.number ? 'bg-[#102059]' : 'bg-[#E5E7EB]'
                                                }`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="mb-6 rounded-lg border border-[#E20E28] bg-[#FEE2E2] p-4">
                                <div className="flex items-start gap-3">
                                    <X className="mt-0.5 h-5 w-5 shrink-0 text-[#E20E28]" />
                                    <div className="flex-1">
                                        <p className="mb-1 text-sm font-semibold text-[#E20E28]">Required</p>
                                        <p className="text-sm text-[#991B1B]">{errorMessage}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setErrorMessage(null)}
                                        className="shrink-0 text-[#E20E28] transition-colors hover:text-[#991B1B]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {currentStep === 1 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Account Information
                                    </h2>
                                    <div className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="first_name">
                                                    First Name <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="first_name"
                                                    type="text"
                                                    required
                                                    className={`${inputClass} ${form.errors.first_name ? 'border-red-400' : ''}`}
                                                    value={form.data.first_name}
                                                    onChange={(e) => form.setData('first_name', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {form.errors.first_name && (
                                                    <p className="mt-1 text-xs text-red-600">{form.errors.first_name}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="middle_name">
                                                    Middle Name <span className="text-[#9CA3AF]">(Optional)</span>
                                                </label>
                                                <input
                                                    id="middle_name"
                                                    type="text"
                                                    className={inputClass}
                                                    value={form.data.middle_name}
                                                    onChange={(e) => form.setData('middle_name', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="last_name">
                                                Last Name <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="last_name"
                                                type="text"
                                                required
                                                className={`${inputClass} ${form.errors.last_name ? 'border-red-400' : ''}`}
                                                value={form.data.last_name}
                                                onChange={(e) => form.setData('last_name', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {form.errors.last_name && (
                                                <p className="mt-1 text-xs text-red-600">{form.errors.last_name}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="email">
                                                Email <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                required
                                                className={`${inputClass} ${form.errors.email ? 'border-red-400' : ''}`}
                                                value={form.data.email}
                                                onChange={(e) => form.setData('email', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {form.errors.email && (
                                                <p className="mt-1 text-xs text-red-600">{form.errors.email}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="password">
                                                    Password (owner/manager login) <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="password"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    required
                                                    className={`${inputClass} ${form.errors.password ? 'border-red-400' : ''}`}
                                                    value={form.data.password}
                                                    onChange={(e) => form.setData('password', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {form.errors.password && (
                                                    <p className="mt-1 text-xs text-red-600">{form.errors.password}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label
                                                    className="mb-2 block text-xs text-[#6B7280]"
                                                    htmlFor="password_confirmation"
                                                >
                                                    Confirm password <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="password_confirmation"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    required
                                                    className={`${inputClass} ${form.errors.password_confirmation ? 'border-red-400' : ''}`}
                                                    value={form.data.password_confirmation}
                                                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {form.errors.password_confirmation && (
                                                    <p className="mt-1 text-xs text-red-600">{form.errors.password_confirmation}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="phone_number">
                                                Phone Number <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="phone_number"
                                                type="tel"
                                                required
                                                className={`${inputClass} ${form.errors.phone_number ? 'border-red-400' : ''}`}
                                                value={form.data.phone_number}
                                                onChange={(e) => form.setData('phone_number', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {form.errors.phone_number && (
                                                <p className="mt-1 text-xs text-red-600">{form.errors.phone_number}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Business Information
                                    </h2>
                                    <div>
                                        <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="agrivet_name">
                                            Agrivet Name <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            id="agrivet_name"
                                            required
                                            className={`${inputClass} ${form.errors.agrivet_name ? 'border-red-400' : ''}`}
                                            value={form.data.agrivet_name}
                                            onChange={(e) => form.setData('agrivet_name', e.target.value)}
                                            style={{ boxShadow: 'none' }}
                                        />
                                        {form.errors.agrivet_name && (
                                            <p className="mt-1 text-xs text-red-600">{form.errors.agrivet_name}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Store Information (Main Branch)
                                    </h2>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="store_name">
                                                Store Name <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="store_name"
                                                required
                                                className={`${inputClass} ${form.errors.store_name ? 'border-red-400' : ''}`}
                                                value={form.data.store_name}
                                                onChange={(e) => form.setData('store_name', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {form.errors.store_name && (
                                                <p className="mt-1 text-xs text-red-600">{form.errors.store_name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-4 block text-xs font-semibold text-[#102059]">
                                                Pin location <span className="font-normal text-[#6B7280]">(optional)</span>
                                            </label>
                                            <PinLocationMap
                                                height={320}
                                                zones={zonesForMap}
                                                initialLat={form.data.shop_lat}
                                                initialLng={form.data.shop_long}
                                                onLocationSelect={(loc) => {
                                                    form.setData('shop_lat', loc.latitude != null ? String(loc.latitude) : '')
                                                    form.setData('shop_long', loc.longitude != null ? String(loc.longitude) : '')
                                                    if (loc.city) {
                                                        form.setData('city', loc.city)
                                                    }
                                                    if (loc.province) {
                                                        form.setData('province', loc.province)
                                                    }
                                                    if (loc.postal_code) {
                                                        form.setData('zip_code', loc.postal_code)
                                                    }
                                                    if (loc.address) {
                                                        form.setData('street', loc.address)
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="shop_lat">
                                                    Latitude <span className="font-normal text-[#6B7280]">(optional)</span>
                                                </label>
                                                <input
                                                    id="shop_lat"
                                                    type="number"
                                                    step="any"
                                                    inputMode="decimal"
                                                    placeholder="e.g. 14.5995"
                                                    className={`${inputClass} ${form.errors.shop_lat ? 'border-red-400' : ''}`}
                                                    value={form.data.shop_lat}
                                                    onChange={(e) => form.setData('shop_lat', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {form.errors.shop_lat && (
                                                    <p className="mt-1 text-xs text-red-600">{form.errors.shop_lat}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="shop_long">
                                                    Longitude <span className="font-normal text-[#6B7280]">(optional)</span>
                                                </label>
                                                <input
                                                    id="shop_long"
                                                    type="number"
                                                    step="any"
                                                    inputMode="decimal"
                                                    placeholder="e.g. 120.9842"
                                                    className={`${inputClass} ${form.errors.shop_long ? 'border-red-400' : ''}`}
                                                    value={form.data.shop_long}
                                                    onChange={(e) => form.setData('shop_long', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {form.errors.shop_long && (
                                                    <p className="mt-1 text-xs text-red-600">{form.errors.shop_long}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="street">
                                                    Street <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="street"
                                                    required
                                                    className={`${inputClass} ${form.errors.street ? 'border-red-400' : ''}`}
                                                    value={form.data.street}
                                                    onChange={(e) => form.setData('street', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="barangay">
                                                    Barangay <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="barangay"
                                                    required
                                                    className={`${inputClass} ${form.errors.barangay ? 'border-red-400' : ''}`}
                                                    value={form.data.barangay}
                                                    onChange={(e) => form.setData('barangay', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="city">
                                                        City/Municipality <span className="text-[#E20E28]">*</span>
                                                    </label>
                                                    <input
                                                        id="city"
                                                        required
                                                        className={`${inputClass} ${form.errors.city ? 'border-red-400' : ''}`}
                                                        value={form.data.city}
                                                        onChange={(e) => form.setData('city', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="province">
                                                        Province <span className="text-[#E20E28]">*</span>
                                                    </label>
                                                    <input
                                                        id="province"
                                                        required
                                                        className={`${inputClass} ${form.errors.province ? 'border-red-400' : ''}`}
                                                        value={form.data.province}
                                                        onChange={(e) => form.setData('province', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="zip_code">
                                                    Zip Code <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="zip_code"
                                                    required
                                                    className={`${inputClass} ${form.errors.zip_code ? 'border-red-400' : ''}`}
                                                    value={form.data.zip_code}
                                                    onChange={(e) => form.setData('zip_code', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-3 block text-xs text-[#6B7280]">
                                                Operating Days <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                                                <div className="grid grid-cols-7 gap-2">
                                                    {DAY_LABELS.map((day, index) => {
                                                        const fullDay = FULL_DAYS[index]
                                                        const isSelected = operatingDays.includes(fullDay)
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => toggleDay(fullDay)}
                                                                className={`rounded-lg border-2 py-3 px-2 text-xs font-semibold transition-all ${
                                                                    isSelected
                                                                        ? 'border-[#102059] bg-[#102059] text-white'
                                                                        : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#102059]'
                                                                }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-3 block text-xs text-[#6B7280]">
                                                Operating Hours <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="opening_time">
                                                        Opening
                                                    </label>
                                                    <input
                                                        id="opening_time"
                                                        type="time"
                                                        required
                                                        className={inputClass}
                                                        value={form.data.opening_time}
                                                        onChange={(e) => form.setData('opening_time', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="closing_time">
                                                        Closing
                                                    </label>
                                                    <input
                                                        id="closing_time"
                                                        type="time"
                                                        required
                                                        className={inputClass}
                                                        value={form.data.closing_time}
                                                        onChange={(e) => form.setData('closing_time', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="store_image">
                                                Store front photo <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div className="cursor-pointer rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F8F9FB] p-8 text-center transition-colors hover:border-[#244693]">
                                                <input
                                                    id="store_image"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleStoreImageUpload}
                                                />
                                                <label htmlFor="store_image" className="cursor-pointer">
                                                    {storeImagePreview ? (
                                                        <div>
                                                            <img
                                                                src={storeImagePreview}
                                                                alt="Store preview"
                                                                className="mx-auto mb-4 max-h-64 rounded-lg"
                                                            />
                                                            <p className="text-xs text-[#6B7280]">Click to change image</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <Upload className="mx-auto mb-3 h-10 w-10 text-[#9CA3AF]" />
                                                            <p className="mb-1 text-sm text-[#6B7280]">Upload store photo</p>
                                                            <p className="text-xs text-[#9CA3AF]">PNG, JPG up to 10MB</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                            {form.errors.store_image && (
                                                <p className="mt-1 text-xs text-red-600">{form.errors.store_image}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="permit_image">
                                                Business permit <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div className="cursor-pointer rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F8F9FB] p-8 text-center transition-colors hover:border-[#244693]">
                                                <input
                                                    id="permit_image"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={handlePermitImageUpload}
                                                />
                                                <label htmlFor="permit_image" className="cursor-pointer">
                                                    {permitIsPdf ? (
                                                        <div>
                                                            <p className="mb-2 text-sm font-semibold text-[#102059]">PDF selected</p>
                                                            <p className="text-xs text-[#6B7280]">Click to change file</p>
                                                        </div>
                                                    ) : permitImagePreview ? (
                                                        <div>
                                                            <img
                                                                src={permitImagePreview}
                                                                alt="Permit preview"
                                                                className="mx-auto mb-4 max-h-64 rounded-lg"
                                                            />
                                                            <p className="text-xs text-[#6B7280]">Click to change file</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <Upload className="mx-auto mb-3 h-10 w-10 text-[#9CA3AF]" />
                                                            <p className="mb-1 text-sm text-[#6B7280]">Upload permit</p>
                                                            <p className="text-xs text-[#9CA3AF]">PNG, JPG, PDF up to 10MB</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                            {form.errors.permit_image && (
                                                <p className="mt-1 text-xs text-red-600">{form.errors.permit_image}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Review & Confirm
                                    </h2>
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="mb-3 text-xs font-semibold text-[#102059]">Account Information</h3>
                                            <div className="space-y-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Name</p>
                                                    <p className="text-sm text-[#102059]">
                                                        {form.data.first_name} {form.data.middle_name} {form.data.last_name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Email</p>
                                                    <p className="text-sm text-[#102059]">{form.data.email}</p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Phone</p>
                                                    <p className="text-sm text-[#102059]">{form.data.phone_number}</p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Owner/manager login</p>
                                                    <p className="text-sm text-[#102059]">
                                                        Same email and password · role: owner/manager (manages this Agrivet and its
                                                        stores)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="mb-3 text-xs font-semibold text-[#102059]">Business</h3>
                                            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                                                <p className="mb-1 text-xs text-[#9CA3AF]">Agrivet Name</p>
                                                <p className="text-sm text-[#102059]">{form.data.agrivet_name}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="mb-3 text-xs font-semibold text-[#102059]">Store</h3>
                                            <div className="space-y-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Store Name</p>
                                                    <p className="text-sm text-[#102059]">{form.data.store_name}</p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Address</p>
                                                    <p className="text-sm text-[#102059]">
                                                        {form.data.street}, {form.data.barangay}, {form.data.city},{' '}
                                                        {form.data.province} {form.data.zip_code}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Operating</p>
                                                    <p className="text-sm text-[#102059]">
                                                        {operatingDays.length
                                                            ? [...operatingDays]
                                                                  .sort(
                                                                      (a, b) =>
                                                                          FULL_DAYS.indexOf(a) - FULL_DAYS.indexOf(b),
                                                                  )
                                                                  .join(', ')
                                                            : '—'}
                                                        {' · '}
                                                        {form.data.opening_time} – {form.data.closing_time}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Photos</p>
                                                    <p className="text-sm text-[#102059]">
                                                        Store: {storeImagePreview ? '✓' : '—'} · Permit:{' '}
                                                        {permitImagePreview || permitIsPdf ? '✓' : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {(form.errors.error || form.errors.message) && (
                                        <p className="mt-4 text-sm text-red-600">{form.errors.error || form.errors.message}</p>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-white p-8">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        disabled={currentStep === 1}
                                        className={`rounded-lg border-2 py-3 px-6 text-sm font-semibold transition-all ${
                                            currentStep === 1
                                                ? 'cursor-not-allowed border-[#E5E7EB] text-[#9CA3AF] opacity-50'
                                                : 'border-[#E5E7EB] text-[#102059] hover:border-[#102059]'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    {currentStep < 4 ? (
                                        <button
                                            type="button"
                                            onClick={nextStep}
                                            className="rounded-lg bg-[#102059] py-3 px-6 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                                        >
                                            Next Step
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={form.processing}
                                            className="rounded-lg bg-[#102059] py-3 px-6 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-60"
                                        >
                                            {form.processing ? 'Submitting…' : 'Submit Registration'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </AddAgrivetShell>
    )
}

import { useMemo, useRef, useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, Upload, X } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import HalfDayHoursFields from '../../Components/HalfDayHoursFields'
import PinLocationMap from '../../Components/PinLocationMap'
import PasswordInput from '../../Components/PasswordInput'
import { formatHalfDaySchedule } from '../../utils/storeSchedule'
import {
    AGRIVET_FIELD_GUIDE,
    AGRIVET_STEP_FIELDS,
    fileInputError,
    firstInvalidAgrivetStep,
    normalizeServerErrors,
    stepForAgrivetErrors,
    validateAgrivetStep,
} from '../../utils/addAgrivetValidation'

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
    const [logoPreview, setLogoPreview] = useState(null)
    const [bannerPreview, setBannerPreview] = useState(null)
    const [permitIsPdf, setPermitIsPdf] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const [fieldErrors, setFieldErrors] = useState({})
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
        description: '',
        logo: null,
        banner: null,
        store_name: '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        zip_code: '',
        opening_time: '08:00',
        closing_time: '18:00',
        half_day: '',
        half_day_opening: '',
        half_day_closing: '',
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

    const serverErrors = useMemo(() => normalizeServerErrors(form.errors), [form.errors])
    const visibleErrors = { ...serverErrors, ...fieldErrors }
    const bannerItems = Object.entries(visibleErrors).filter(([key]) => {
        if (currentStep === 4) return true
        return AGRIVET_STEP_FIELDS[currentStep]?.includes(key)
    })

    const issue = (key) => visibleErrors[key] || ''

    const clearIssue = (key) => {
        form.clearErrors(key)
        setFieldErrors((prev) => {
            if (!prev[key]) return prev
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

    const updateField = (key, value) => {
        form.setData(key, value)
        clearIssue(key)
        setErrorMessage(null)
    }

    const showStepErrors = (errors, message) => {
        setFieldErrors(errors)
        setErrorMessage(message)
        const firstKey = Object.keys(errors)[0]
        window.requestAnimationFrame(() => {
            const target = firstKey ? document.getElementById(firstKey) : null
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                if (typeof target.focus === 'function') target.focus()
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        })
    }

    const readPreview = (file, setPreview) => {
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result)
        reader.readAsDataURL(file)
    }

    const acceptFile = (field, file, { setPreview, label, allowGif = false, allowPdf = false, maxMb, required = false }) => {
        if (!file) return
        const message = fileInputError(file, { required, label, allowGif, allowPdf, maxMb })
        if (message) {
            setFieldErrors((prev) => ({ ...prev, [field]: message }))
            setErrorMessage('This file is not an accepted upload.')
            return
        }
        form.setData(field, file)
        clearIssue(field)
        setErrorMessage(null)
        const isPdf = allowPdf && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
        if (field === 'permit_image') {
            setPermitIsPdf(isPdf)
            if (isPdf) {
                setPermitImagePreview(null)
                return
            }
        }
        if (setPreview) readPreview(file, setPreview)
    }

    const handleStoreImageUpload = (e) => {
        acceptFile('store_image', e.target.files?.[0], {
            setPreview: setStoreImagePreview,
            label: 'Storefront photo',
            maxMb: 10,
            required: true,
        })
        e.target.value = ''
    }

    const handlePermitImageUpload = (e) => {
        acceptFile('permit_image', e.target.files?.[0], {
            setPreview: setPermitImagePreview,
            label: 'Business permit',
            allowPdf: true,
            maxMb: 10,
            required: true,
        })
        e.target.value = ''
    }

    const handleImageUpload = (field, event, setPreview) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        acceptFile(field, file, {
            setPreview,
            label: field === 'banner' ? 'Banner' : 'Logo',
            allowGif: true,
            maxMb: field === 'banner' ? 10 : 5,
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (isSubmittingRef.current || form.processing) {
            return
        }
        if (currentStep !== 4) {
            nextStep(e)
            return
        }

        const invalid = firstInvalidAgrivetStep(form.data, operatingDays)
        if (invalid) {
            setCurrentStep(invalid.step)
            showStepErrors(invalid.errors, 'Some fields still need a proper value before this agrivet can be saved.')
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
            onError: (errors) => {
                const mapped = normalizeServerErrors(errors)
                const step = stepForAgrivetErrors(mapped)
                setCurrentStep(step)
                setFieldErrors(mapped)
                setErrorMessage('The registration was not saved. Update the fields listed below.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
            },
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

        if (currentStep < 4) {
            const errors = validateAgrivetStep(currentStep, form.data, operatingDays)
            if (Object.keys(errors).length) {
                showStepErrors(errors, 'These fields need a proper value before you can continue.')
                return
            }
            form.clearErrors(...(AGRIVET_STEP_FIELDS[currentStep] || []))
            setFieldErrors({})
            setErrorMessage(null)
            setCurrentStep(currentStep + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevStep = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setErrorMessage(null)
        setFieldErrors({})
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const toggleDay = (fullDay) => {
        setOperatingDays((prev) =>
            prev.includes(fullDay) ? prev.filter((d) => d !== fullDay) : [...prev, fullDay],
        )
        clearIssue('operating_days')
        setErrorMessage(null)
    }

    const inputClass =
        'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm outline-none ring-[#244693]/30 transition-all focus:border-[#244693] focus:ring-2'

    const fieldClass = (key) => `${inputClass} ${issue(key) ? 'border-red-400' : ''}`

    const fieldHelp = (key) => (
        <>
            <p className="mt-1 text-xs text-[#9CA3AF]">{AGRIVET_FIELD_GUIDE[key]}</p>
            {issue(key) ? <p className="mt-1 text-xs font-medium text-red-600">{issue(key)}</p> : null}
        </>
    )

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

                        {(errorMessage || bannerItems.length > 0) && (
                            <div className="mb-6 rounded-lg border border-[#E20E28] bg-[#FEE2E2] p-4">
                                <div className="flex items-start gap-3">
                                    <X className="mt-0.5 h-5 w-5 shrink-0 text-[#E20E28]" />
                                    <div className="flex-1">
                                        <p className="mb-1 text-sm font-semibold text-[#E20E28]">Check these fields</p>
                                        <p className="text-sm text-[#991B1B]">
                                            {errorMessage || 'These fields need a proper value before you can continue.'}
                                        </p>
                                        {bannerItems.length > 0 && (
                                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[#991B1B]">
                                                {bannerItems.map(([key, text]) => (
                                                    <li key={key}>{text}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setErrorMessage(null)
                                            setFieldErrors({})
                                            form.clearErrors()
                                        }}
                                        className="shrink-0 text-[#E20E28] transition-colors hover:text-[#991B1B]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            {currentStep === 1 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-2 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Account Information
                                    </h2>
                                    <p className="mb-6 text-xs text-[#6B7280]">
                                        Fields marked * are required. Each field below says what a proper value looks like.
                                    </p>
                                    <div className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="first_name">
                                                    First Name <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="first_name"
                                                    type="text"
                                                    maxLength={100}
                                                    autoComplete="given-name"
                                                    aria-invalid={Boolean(issue('first_name'))}
                                                    className={fieldClass('first_name')}
                                                    value={form.data.first_name}
                                                    onChange={(e) => updateField('first_name', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('first_name')}
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="middle_name">
                                                    Middle Name <span className="text-[#9CA3AF]">(Optional)</span>
                                                </label>
                                                <input
                                                    id="middle_name"
                                                    type="text"
                                                    maxLength={100}
                                                    autoComplete="additional-name"
                                                    aria-invalid={Boolean(issue('middle_name'))}
                                                    className={fieldClass('middle_name')}
                                                    value={form.data.middle_name}
                                                    onChange={(e) => updateField('middle_name', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('middle_name')}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="last_name">
                                                Last Name <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="last_name"
                                                type="text"
                                                maxLength={100}
                                                autoComplete="family-name"
                                                aria-invalid={Boolean(issue('last_name'))}
                                                className={fieldClass('last_name')}
                                                value={form.data.last_name}
                                                onChange={(e) => updateField('last_name', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {fieldHelp('last_name')}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="email">
                                                Email <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                maxLength={255}
                                                autoComplete="email"
                                                placeholder="name@example.com"
                                                aria-invalid={Boolean(issue('email'))}
                                                className={fieldClass('email')}
                                                value={form.data.email}
                                                onChange={(e) => updateField('email', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {fieldHelp('email')}
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="password">
                                                    Password (owner/manager login) <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <PasswordInput
                                                    id="password"
                                                    autoComplete="new-password"
                                                    aria-invalid={Boolean(issue('password'))}
                                                    className={fieldClass('password')}
                                                    value={form.data.password}
                                                    onChange={(e) => updateField('password', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('password')}
                                            </div>
                                            <div>
                                                <label
                                                    className="mb-2 block text-xs text-[#6B7280]"
                                                    htmlFor="password_confirmation"
                                                >
                                                    Confirm password <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <PasswordInput
                                                    id="password_confirmation"
                                                    autoComplete="new-password"
                                                    aria-invalid={Boolean(issue('password_confirmation'))}
                                                    className={fieldClass('password_confirmation')}
                                                    value={form.data.password_confirmation}
                                                    onChange={(e) => updateField('password_confirmation', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('password_confirmation')}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="phone_number">
                                                Phone Number <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="phone_number"
                                                type="tel"
                                                inputMode="tel"
                                                maxLength={30}
                                                autoComplete="tel"
                                                placeholder="09171234567"
                                                aria-invalid={Boolean(issue('phone_number'))}
                                                className={fieldClass('phone_number')}
                                                value={form.data.phone_number}
                                                onChange={(e) => updateField('phone_number', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {fieldHelp('phone_number')}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-2 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Business Information
                                    </h2>
                                    <p className="mb-6 text-xs text-[#6B7280]">
                                        The agrivet name is required. Description, logo, and banner can be left blank.
                                    </p>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="agrivet_name">
                                                Agrivet Name <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="agrivet_name"
                                                maxLength={150}
                                                aria-invalid={Boolean(issue('agrivet_name'))}
                                                className={fieldClass('agrivet_name')}
                                                value={form.data.agrivet_name}
                                                onChange={(e) => updateField('agrivet_name', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {fieldHelp('agrivet_name')}
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="description">
                                                Business Description <span className="text-[#9CA3AF]">(Optional)</span>
                                            </label>
                                            <textarea
                                                id="description"
                                                rows={4}
                                                aria-invalid={Boolean(issue('description'))}
                                                className={fieldClass('description')}
                                                value={form.data.description}
                                                onChange={(e) => updateField('description', e.target.value)}
                                                placeholder="Describe your agrivet business, products, and services..."
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {fieldHelp('description')}
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="logo">
                                                    Logo <span className="text-[#9CA3AF]">(Optional)</span>
                                                </label>
                                                <div className={`cursor-pointer rounded-lg border-2 border-dashed bg-[#F8F9FB] p-6 text-center transition-colors hover:border-[#244693] ${issue('logo') ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
                                                    <input
                                                        id="logo"
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload('logo', e, setLogoPreview)}
                                                    />
                                                    <label htmlFor="logo" className="cursor-pointer">
                                                        {logoPreview ? (
                                                            <div>
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="Logo preview"
                                                                    className="mx-auto mb-3 max-h-40 rounded-lg"
                                                                />
                                                                <p className="text-xs text-[#6B7280]">Click to change logo</p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <Upload className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" />
                                                                <p className="mb-1 text-sm text-[#6B7280]">Upload logo</p>
                                                                <p className="text-xs text-[#9CA3AF]">JPG, PNG, GIF, or WEBP up to 5MB</p>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>
                                                {fieldHelp('logo')}
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="banner">
                                                    Banner <span className="text-[#9CA3AF]">(Optional)</span>
                                                </label>
                                                <div className={`cursor-pointer rounded-lg border-2 border-dashed bg-[#F8F9FB] p-6 text-center transition-colors hover:border-[#244693] ${issue('banner') ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
                                                    <input
                                                        id="banner"
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        className="hidden"
                                                        onChange={(e) => handleImageUpload('banner', e, setBannerPreview)}
                                                    />
                                                    <label htmlFor="banner" className="cursor-pointer">
                                                        {bannerPreview ? (
                                                            <div>
                                                                <img
                                                                    src={bannerPreview}
                                                                    alt="Banner preview"
                                                                    className="mx-auto mb-3 max-h-40 w-full rounded-lg object-cover"
                                                                />
                                                                <p className="text-xs text-[#6B7280]">Click to change banner</p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <Upload className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" />
                                                                <p className="mb-1 text-sm text-[#6B7280]">Upload banner</p>
                                                                <p className="text-xs text-[#9CA3AF]">JPG, PNG, GIF, or WEBP up to 10MB</p>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>
                                                {fieldHelp('banner')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                                    <h2 className="mb-2 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">
                                        Store Information (Main Branch)
                                    </h2>
                                    <p className="mb-6 text-xs text-[#6B7280]">
                                        Store name, full address, operating days, hours, storefront photo, and business permit are required. The map pin is optional.
                                    </p>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="store_name">
                                                Store Name <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                id="store_name"
                                                maxLength={150}
                                                aria-invalid={Boolean(issue('store_name'))}
                                                className={fieldClass('store_name')}
                                                value={form.data.store_name}
                                                onChange={(e) => updateField('store_name', e.target.value)}
                                                style={{ boxShadow: 'none' }}
                                            />
                                            {fieldHelp('store_name')}
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
                                                    form.setData((data) => ({
                                                        ...data,
                                                        shop_lat: loc.latitude != null ? String(loc.latitude) : '',
                                                        shop_long: loc.longitude != null ? String(loc.longitude) : '',
                                                        ...(loc.city ? { city: loc.city } : {}),
                                                        ...(loc.province ? { province: loc.province } : {}),
                                                        ...(loc.postal_code
                                                            ? { zip_code: String(loc.postal_code).replace(/\D/g, '').slice(0, 4) }
                                                            : {}),
                                                        ...(loc.address ? { street: loc.address } : {}),
                                                        ...(loc.barangay ? { barangay: loc.barangay } : {}),
                                                    }))
                                                    ;['shop_lat', 'shop_long', 'city', 'province', 'zip_code', 'street', 'barangay'].forEach(
                                                        (key) => clearIssue(key),
                                                    )
                                                    setErrorMessage(null)
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
                                                    placeholder="e.g. 10.3157"
                                                    aria-invalid={Boolean(issue('shop_lat'))}
                                                    className={fieldClass('shop_lat')}
                                                    value={form.data.shop_lat}
                                                    onChange={(e) => updateField('shop_lat', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('shop_lat')}
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
                                                    placeholder="e.g. 123.8854"
                                                    aria-invalid={Boolean(issue('shop_long'))}
                                                    className={fieldClass('shop_long')}
                                                    value={form.data.shop_long}
                                                    onChange={(e) => updateField('shop_long', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('shop_long')}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="street">
                                                    Street <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="street"
                                                    maxLength={255}
                                                    aria-invalid={Boolean(issue('street'))}
                                                    className={fieldClass('street')}
                                                    value={form.data.street}
                                                    onChange={(e) => updateField('street', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('street')}
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="barangay">
                                                    Barangay <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="barangay"
                                                    maxLength={255}
                                                    aria-invalid={Boolean(issue('barangay'))}
                                                    className={fieldClass('barangay')}
                                                    value={form.data.barangay}
                                                    onChange={(e) => updateField('barangay', e.target.value)}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('barangay')}
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="city">
                                                        City/Municipality <span className="text-[#E20E28]">*</span>
                                                    </label>
                                                    <input
                                                        id="city"
                                                        maxLength={100}
                                                        aria-invalid={Boolean(issue('city'))}
                                                        className={fieldClass('city')}
                                                        value={form.data.city}
                                                        onChange={(e) => updateField('city', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                    {fieldHelp('city')}
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="province">
                                                        Province <span className="text-[#E20E28]">*</span>
                                                    </label>
                                                    <input
                                                        id="province"
                                                        maxLength={100}
                                                        aria-invalid={Boolean(issue('province'))}
                                                        className={fieldClass('province')}
                                                        value={form.data.province}
                                                        onChange={(e) => updateField('province', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                    {fieldHelp('province')}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="zip_code">
                                                    Zip Code <span className="text-[#E20E28]">*</span>
                                                </label>
                                                <input
                                                    id="zip_code"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    placeholder="6000"
                                                    aria-invalid={Boolean(issue('zip_code'))}
                                                    className={fieldClass('zip_code')}
                                                    value={form.data.zip_code}
                                                    onChange={(e) => updateField('zip_code', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    style={{ boxShadow: 'none' }}
                                                />
                                                {fieldHelp('zip_code')}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-3 block text-xs text-[#6B7280]" htmlFor="operating_days">
                                                Operating Days <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div
                                                id="operating_days"
                                                tabIndex={-1}
                                                className={`rounded-lg border bg-[#F8F9FB] p-4 ${issue('operating_days') ? 'border-red-400' : 'border-[#E5E7EB]'}`}
                                            >
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
                                            {fieldHelp('operating_days')}
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
                                                        aria-invalid={Boolean(issue('opening_time'))}
                                                        className={fieldClass('opening_time')}
                                                        value={form.data.opening_time}
                                                        onChange={(e) => updateField('opening_time', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                    {fieldHelp('opening_time')}
                                                </div>
                                                <div>
                                                    <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="closing_time">
                                                        Closing
                                                    </label>
                                                    <input
                                                        id="closing_time"
                                                        type="time"
                                                        aria-invalid={Boolean(issue('closing_time'))}
                                                        className={fieldClass('closing_time')}
                                                        value={form.data.closing_time}
                                                        onChange={(e) => updateField('closing_time', e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                    {fieldHelp('closing_time')}
                                                </div>
                                            </div>
                                        </div>

                                        <div id="half_day" tabIndex={-1}>
                                            <HalfDayHoursFields
                                                operatingDays={operatingDays}
                                                day={form.data.half_day}
                                                opening={form.data.half_day_opening}
                                                closing={form.data.half_day_closing}
                                                error={issue('half_day') || issue('half_day_opening') || issue('half_day_closing')}
                                                inputClass={inputClass}
                                                onChange={(next) => {
                                                    setErrorMessage(null)
                                                    clearIssue('half_day')
                                                    clearIssue('half_day_opening')
                                                    clearIssue('half_day_closing')
                                                    form.setData((data) => ({
                                                        ...data,
                                                        half_day: next.day,
                                                        half_day_opening: next.opening,
                                                        half_day_closing: next.closing,
                                                    }))
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="store_image">
                                                Store front photo <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div className={`cursor-pointer rounded-lg border-2 border-dashed bg-[#F8F9FB] p-8 text-center transition-colors hover:border-[#244693] ${issue('store_image') ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
                                                <input
                                                    id="store_image"
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
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
                                                            <p className="text-xs text-[#9CA3AF]">JPG, PNG, or WEBP up to 10MB</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                            {fieldHelp('store_image')}
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-xs text-[#6B7280]" htmlFor="permit_image">
                                                Business permit <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <div className={`cursor-pointer rounded-lg border-2 border-dashed bg-[#F8F9FB] p-8 text-center transition-colors hover:border-[#244693] ${issue('permit_image') ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
                                                <input
                                                    id="permit_image"
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,.pdf,application/pdf"
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
                                                            <p className="text-xs text-[#9CA3AF]">JPG, PNG, WEBP, or PDF up to 10MB</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                            {fieldHelp('permit_image')}
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
                                            <div className="space-y-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4">
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Agrivet Name</p>
                                                    <p className="text-sm text-[#102059]">{form.data.agrivet_name}</p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Business Description</p>
                                                    <p className="text-sm text-[#102059]">
                                                        {form.data.description?.trim() ? form.data.description : '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="mb-1 text-xs text-[#9CA3AF]">Branding</p>
                                                    <p className="text-sm text-[#102059]">
                                                        Logo: {logoPreview ? '✓' : '—'} · Banner: {bannerPreview ? '✓' : '—'}
                                                    </p>
                                                </div>
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
                                                        {formatHalfDaySchedule(
                                                            `${form.data.half_day}|${form.data.half_day_opening}|${form.data.half_day_closing}`,
                                                        )
                                                            ? ` · Half-day ${formatHalfDaySchedule(
                                                                  `${form.data.half_day}|${form.data.half_day_opening}|${form.data.half_day_closing}`,
                                                              )}`
                                                            : ''}
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

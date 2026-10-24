import { useEffect, useMemo, useRef, useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { Check, Star } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import PinLocationMap from '../../Components/PinLocationMap'
import PasswordInput from '../../Components/PasswordInput'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const STEPS = [
    { number: 1, title: 'Account Details' },
    { number: 2, title: 'Gamefarm Details' },
    { number: 3, title: 'Gamefarm Location' },
    { number: 4, title: 'Review & Confirmation' },
]

function RegisterBreederShell({ auth, children }) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title="Register a Breeder" notificationCount={0}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return (
        <KlasmeytDashboardLayout auth={auth} title="Register a Breeder">
            {children}
        </KlasmeytDashboardLayout>
    )
}

function isAllowedImage(file) {
    return ['image/jpeg', 'image/png'].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name)
}

function readPreview(file) {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(file)
    })
}

function fieldError(errors, key) {
    const value = errors?.[key]
    if (!value) return null
    return Array.isArray(value) ? value[0] : value
}

export default function RegisterBreeder({ auth, zones = [], flash }) {
    const [currentStep, setCurrentStep] = useState(1)
    const [errorMessage, setErrorMessage] = useState(null)
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState(null)
    const [certificateFile, setCertificateFile] = useState(null)
    const [certificatePreview, setCertificatePreview] = useState(null)
    const [facilitySlots, setFacilitySlots] = useState([null, null, null, null, null])
    const [primaryFacilityIndex, setPrimaryFacilityIndex] = useState(0)
    const isSubmittingRef = useRef(false)

    const zonesForMap = useMemo(
        () => (zones || []).filter((z) => z.boundary && Array.isArray(z.boundary) && z.boundary.length >= 3),
        [zones],
    )

    const accountsUrl =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/users' : '/dashboard/super-admin/users'
    const storeUrl = `${accountsUrl}/breeder-registration`

    const form = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        phone_number: '',
        gamefarm_name: '',
        bloodlines: '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        zip_code: '',
        latitude: '',
        longitude: '',
        primary_facility_index: 0,
    })

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [currentStep])

    const inputClass =
        'w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-2.5 text-sm text-[#111827] outline-none ring-[#244693]/20 transition-all placeholder:text-[#9CA3AF] focus:border-[#244693] focus:ring-2'
    const labelClass = 'mb-2 block text-sm font-semibold text-[#111827]'

    const displayName = [form.data.first_name, form.data.middle_name, form.data.last_name]
        .map((part) => (part || '').trim())
        .filter(Boolean)
        .join(' ')

    const gamefarmAddress = [form.data.barangay, form.data.street, form.data.city, form.data.province]
        .map((part) => (part || '').trim())
        .filter(Boolean)
        .join(', ')

    const facilityCount = facilitySlots.filter(Boolean).length

    const acceptImage = async (file) => {
        if (!file) return { error: 'Choose an image.' }
        if (!isAllowedImage(file)) return { error: 'Images must be JPG or PNG.' }
        if (file.size > MAX_IMAGE_BYTES) return { error: 'Each image must be 5MB or smaller.' }
        const preview = await readPreview(file)
        return { file, preview }
    }

    const handleSingleImage = async (event, setFile, setPreview) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        const result = await acceptImage(file)
        if (result.error) {
            setErrorMessage(result.error)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setErrorMessage(null)
        setFile(result.file)
        setPreview(result.preview)
    }

    const handleFacilityUpload = async (index, event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        const result = await acceptImage(file)
        if (result.error) {
            setErrorMessage(result.error)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setErrorMessage(null)
        const wasEmpty = !facilitySlots.some(Boolean)
        setFacilitySlots((prev) => {
            const next = [...prev]
            next[index] = { file: result.file, preview: result.preview }
            return next
        })
        if (wasEmpty) setPrimaryFacilityIndex(index)
    }

    const validateStep = (step) => {
        if (step === 1) {
            if (!form.data.first_name.trim()) return 'First name is required.'
            if (!form.data.last_name.trim()) return 'Last name is required.'
            if (!form.data.email.trim()) return 'Email is required.'
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.data.email.trim())) return 'Enter a valid email address.'
            if (!form.data.password) return 'Password is required.'
            if (form.data.password.length < 6) return 'Password must be at least 6 characters.'
            if (!form.data.password_confirmation) return 'Confirm the password.'
            if (form.data.password !== form.data.password_confirmation) return 'Password and confirm password must match.'
            if (!form.data.phone_number.trim()) return 'Phone number is required.'
        }
        if (step === 2) {
            if (!form.data.gamefarm_name.trim()) return 'Gamefarm name is required.'
            if (!facilitySlots.some(Boolean)) return 'Upload at least 1 gamefarm facility image.'
        }
        if (step === 3) {
            if (!form.data.street.trim()) return 'Street is required.'
            if (!form.data.barangay.trim()) return 'Barangay is required.'
            if (!form.data.city.trim()) return 'City / municipality is required.'
            if (!form.data.province.trim()) return 'Province is required.'
            if (!form.data.zip_code.trim()) return 'Zip code is required.'
        }
        return null
    }

    const nextStep = (event) => {
        event.preventDefault()
        const message = validateStep(currentStep)
        if (message) {
            setErrorMessage(message)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        if (currentStep === 2 && !facilitySlots[primaryFacilityIndex]) {
            const first = facilitySlots.findIndex(Boolean)
            if (first >= 0) setPrimaryFacilityIndex(first)
        }
        setErrorMessage(null)
        setCurrentStep((step) => Math.min(4, step + 1))
    }

    const prevStep = (event) => {
        event.preventDefault()
        setErrorMessage(null)
        if (currentStep === 1) {
            router.visit(accountsUrl)
            return
        }
        setCurrentStep((step) => Math.max(1, step - 1))
    }

    const stepForErrors = (errors) => {
        const keys = Object.keys(errors || {})
        const matches = (names) => keys.some((key) => names.some((name) => key === name || key.startsWith(`${name}.`)))
        if (matches(['first_name', 'middle_name', 'last_name', 'email', 'password', 'phone_number'])) return 1
        if (matches(['gamefarm_name', 'bloodlines', 'logo', 'membership_certificate', 'facility_images', 'primary_facility_index'])) return 2
        if (matches(['street', 'barangay', 'city', 'province', 'zip_code', 'latitude', 'longitude'])) return 3
        return 4
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        if (isSubmittingRef.current || form.processing || currentStep !== 4) return

        for (let step = 1; step <= 3; step += 1) {
            const message = validateStep(step)
            if (message) {
                setErrorMessage(message)
                setCurrentStep(step)
                return
            }
        }

        const filledIndexes = facilitySlots.flatMap((slot, index) => (slot ? [index] : []))
        const primaryAmongFilled = Math.max(0, filledIndexes.indexOf(primaryFacilityIndex))

        isSubmittingRef.current = true
        form.transform((data) => {
            const payload = {
                ...data,
                facility_images: filledIndexes.map((index) => facilitySlots[index].file),
                primary_facility_index: primaryAmongFilled,
            }
            if (logoFile) payload.logo = logoFile
            if (certificateFile) payload.membership_certificate = certificateFile
            return payload
        })
        form.post(storeUrl, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errors) => {
                setCurrentStep(stepForErrors(errors))
                setErrorMessage(null)
            },
            onFinish: () => {
                isSubmittingRef.current = false
                form.transform((data) => data)
            },
        })
    }

    const serverErrors = Object.entries(form.errors).flatMap(([key, message]) => {
        const text = Array.isArray(message) ? message[0] : message
        return text ? [[key, text]] : []
    })

    return (
        <RegisterBreederShell auth={auth}>
            <Head title="Register a Breeder" />

            <div className="mx-auto max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#111827]">Register a Breeder</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">Register a breeder and its farm.</p>
                </div>

                <div className="mb-6 flex items-center overflow-x-auto pb-1">
                    {STEPS.map((step, index) => {
                        const reached = currentStep >= step.number
                        return (
                            <div key={step.number} className="flex min-w-max flex-1 items-center">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                            reached ? 'bg-[#244693] text-white' : 'bg-[#E5E7EB] text-[#6B7280]'
                                        }`}
                                    >
                                        {reached ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.number}
                                    </div>
                                    <span className={`text-sm font-medium ${reached ? 'text-[#244693]' : 'text-[#9CA3AF]'}`}>
                                        {step.title}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`mx-3 h-0.5 min-w-[1.25rem] flex-1 ${
                                            currentStep > step.number ? 'bg-[#244693]' : 'bg-[#D1D5DB]'
                                        }`}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>

                {flash?.error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>
                )}
                {errorMessage && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</div>
                )}
                {serverErrors.length > 0 && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {serverErrors.map(([key, message]) => (
                            <p key={key}>{message}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {currentStep === 1 && (
                        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-base font-semibold text-[#111827]">
                                Account Information
                            </h2>
                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="first_name">
                                            First Name <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            id="first_name"
                                            className={inputClass}
                                            value={form.data.first_name}
                                            onChange={(e) => form.setData('first_name', e.target.value)}
                                        />
                                        {fieldError(form.errors, 'first_name') && (
                                            <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'first_name')}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="middle_name">
                                            Middle Name <span className="font-normal text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <input
                                            id="middle_name"
                                            className={inputClass}
                                            value={form.data.middle_name}
                                            onChange={(e) => form.setData('middle_name', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="last_name">
                                        Last Name <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="last_name"
                                        className={inputClass}
                                        value={form.data.last_name}
                                        onChange={(e) => form.setData('last_name', e.target.value)}
                                    />
                                    {fieldError(form.errors, 'last_name') && (
                                        <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'last_name')}</p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="email">
                                        Email <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className={inputClass}
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                    />
                                    {fieldError(form.errors, 'email') && (
                                        <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'email')}</p>
                                    )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="password">
                                            Password <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <PasswordInput
                                            id="password"
                                            autoComplete="new-password"
                                            className={inputClass}
                                            value={form.data.password}
                                            onChange={(e) => form.setData('password', e.target.value)}
                                        />
                                        {fieldError(form.errors, 'password') && (
                                            <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'password')}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="password_confirmation">
                                            Confirm Password <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            autoComplete="new-password"
                                            className={inputClass}
                                            value={form.data.password_confirmation}
                                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="phone_number">
                                        Phone Number <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="phone_number"
                                        type="tel"
                                        className={inputClass}
                                        value={form.data.phone_number}
                                        onChange={(e) => form.setData('phone_number', e.target.value)}
                                    />
                                    {fieldError(form.errors, 'phone_number') && (
                                        <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'phone_number')}</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {currentStep === 2 && (
                        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-base font-semibold text-[#111827]">
                                Gamefarm Details
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass} htmlFor="gamefarm_name">
                                        Gamefarm Name
                                    </label>
                                    <input
                                        id="gamefarm_name"
                                        className={inputClass}
                                        value={form.data.gamefarm_name}
                                        onChange={(e) => form.setData('gamefarm_name', e.target.value)}
                                    />
                                    {fieldError(form.errors, 'gamefarm_name') && (
                                        <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'gamefarm_name')}</p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="bloodlines">
                                        Gamefarm Bloodlines
                                    </label>
                                    <textarea
                                        id="bloodlines"
                                        rows={3}
                                        className={`${inputClass} resize-none`}
                                        value={form.data.bloodlines}
                                        onChange={(e) => form.setData('bloodlines', e.target.value)}
                                        placeholder="Enumerate present bloodlines......."
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className={labelClass}>Logo/Profile</p>
                                        <label
                                            htmlFor="logo"
                                            className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 text-center transition-colors hover:border-[#244693]"
                                        >
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo preview" className="max-h-32 rounded-md object-contain" />
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-[#374151]">Upload your images</p>
                                                    <p className="mt-1 text-xs text-[#9CA3AF]">Supports JPG, PNG. Max 5MB per image.</p>
                                                </>
                                            )}
                                            <input
                                                id="logo"
                                                type="file"
                                                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                                                className="hidden"
                                                onChange={(e) => handleSingleImage(e, setLogoFile, setLogoPreview)}
                                            />
                                        </label>
                                        {fieldError(form.errors, 'logo') && (
                                            <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'logo')}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className={labelClass}>
                                            Membership Certificate <span className="font-normal text-[#6B7280]">(Optional)</span>
                                        </p>
                                        <label
                                            htmlFor="membership_certificate"
                                            className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-4 text-center transition-colors hover:border-[#244693]"
                                        >
                                            {certificatePreview ? (
                                                <img src={certificatePreview} alt="Membership certificate preview" className="max-h-32 rounded-md object-contain" />
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-[#374151]">Upload your images</p>
                                                    <p className="mt-1 text-xs text-[#9CA3AF]">Supports JPG, PNG. Max 5MB per image.</p>
                                                </>
                                            )}
                                            <input
                                                id="membership_certificate"
                                                type="file"
                                                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                                                className="hidden"
                                                onChange={(e) => handleSingleImage(e, setCertificateFile, setCertificatePreview)}
                                            />
                                        </label>
                                        {fieldError(form.errors, 'membership_certificate') && (
                                            <p className="mt-1 text-xs text-red-600">{fieldError(form.errors, 'membership_certificate')}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-[#111827]">Gamefarm Facilities</h3>
                                    <p className="mt-1 text-sm text-[#6B7280]">
                                        Upload 1 up to 5 images of your Facilities and select one to be the primary thumbnail.
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                        {facilitySlots.map((slot, index) => (
                                            <div key={index} className="relative">
                                                <label
                                                    htmlFor={`facility-${index}`}
                                                    className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed px-2 text-center transition-colors ${
                                                        slot
                                                            ? 'border-[#244693] bg-[#F8F9FB]'
                                                            : 'border-[#C5CEDB] bg-white hover:border-[#244693]'
                                                    }`}
                                                >
                                                    {slot ? (
                                                        <img src={slot.preview} alt={`Facility ${index + 1}`} className="h-full max-h-[190px] w-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-semibold text-[#374151]">Upload your images</p>
                                                            <p className="mt-1 text-[11px] leading-4 text-[#9CA3AF]">
                                                                Supports JPG, PNG. Max 5MB per image.
                                                            </p>
                                                        </>
                                                    )}
                                                    <input
                                                        id={`facility-${index}`}
                                                        type="file"
                                                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                                                        className="hidden"
                                                        onChange={(e) => handleFacilityUpload(index, e)}
                                                    />
                                                </label>
                                                {slot && (
                                                    <button
                                                        type="button"
                                                        title="Set as primary thumbnail"
                                                        onClick={() => setPrimaryFacilityIndex(index)}
                                                        className={`absolute right-2 top-2 rounded-full p-1 shadow-md ${
                                                            primaryFacilityIndex === index ? 'bg-[#D3A218]' : 'bg-[#6B7280]'
                                                        }`}
                                                    >
                                                        <Star
                                                            className="h-3.5 w-3.5 text-white"
                                                            fill={primaryFacilityIndex === index ? 'white' : 'none'}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {fieldError(form.errors, 'facility_images') && (
                                        <p className="mt-2 text-xs text-red-600">{fieldError(form.errors, 'facility_images')}</p>
                                    )}
                                    <div className="mt-4 rounded-lg border border-[#244693]/15 bg-[#F0F7FF] px-4 py-3 text-xs text-[#244693]">
                                        <span className="font-semibold">Tip:</span> The primary thumbnail (marked with a gold star) will be
                                        displayed as the main image in product listings. Click the star icon on any photo to set it as primary.
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {currentStep === 3 && (
                        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-base font-semibold text-[#111827]">
                                Gamefarm Location
                            </h2>
                            <div className="space-y-5">
                                <div>
                                    <p className={labelClass}>Google Maps</p>
                                    <div className="relative overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F8F9FB]">
                                        {form.data.gamefarm_name.trim() && (
                                            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-white/90 px-2 py-0.5 text-sm text-[#6B7280]">
                                                {form.data.gamefarm_name.trim()}
                                            </div>
                                        )}
                                        <PinLocationMap
                                            height={240}
                                            zones={zonesForMap}
                                            initialLat={form.data.latitude}
                                            initialLng={form.data.longitude}
                                            onLocationSelect={(loc) => {
                                                form.setData((data) => ({
                                                    ...data,
                                                    latitude: loc.latitude != null ? String(loc.latitude) : data.latitude,
                                                    longitude: loc.longitude != null ? String(loc.longitude) : data.longitude,
                                                    city: loc.city || data.city,
                                                    province: loc.province || data.province,
                                                    zip_code: loc.postal_code || data.zip_code,
                                                    street: loc.address || data.street,
                                                    barangay: loc.barangay || data.barangay,
                                                }))
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="latitude">
                                            Latitude <span className="font-normal text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <input
                                            id="latitude"
                                            inputMode="decimal"
                                            className={inputClass}
                                            value={form.data.latitude}
                                            onChange={(e) => form.setData('latitude', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="longitude">
                                            Longitude <span className="font-normal text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <input
                                            id="longitude"
                                            inputMode="decimal"
                                            className={inputClass}
                                            value={form.data.longitude}
                                            onChange={(e) => form.setData('longitude', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="street">
                                        Street <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="street"
                                        className={inputClass}
                                        value={form.data.street}
                                        onChange={(e) => form.setData('street', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="barangay">
                                        Barangay <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="barangay"
                                        className={inputClass}
                                        value={form.data.barangay}
                                        onChange={(e) => form.setData('barangay', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass} htmlFor="city">
                                            City / Municipality <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            id="city"
                                            className={inputClass}
                                            value={form.data.city}
                                            onChange={(e) => form.setData('city', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="province">
                                            Province <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            id="province"
                                            className={inputClass}
                                            value={form.data.province}
                                            onChange={(e) => form.setData('province', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="zip_code">
                                        Zip code <span className="text-[#E20E28]">*</span>
                                    </label>
                                    <input
                                        id="zip_code"
                                        className={inputClass}
                                        value={form.data.zip_code}
                                        onChange={(e) => form.setData('zip_code', e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {currentStep === 4 && (
                        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-base font-semibold text-[#111827]">
                                Review and Confirm
                            </h2>
                            <div className="space-y-5">
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-[#111827]">Account Information</h3>
                                    <div className="space-y-3 rounded-lg bg-[#F8F9FB] p-4">
                                        <div>
                                            <p className="text-xs text-[#6B7280]">Name</p>
                                            <p className="text-sm font-medium text-[#244693]">{displayName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#6B7280]">Email</p>
                                            <p className="text-sm font-medium text-[#244693]">{form.data.email || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#6B7280]">Phone Number</p>
                                            <p className="text-sm font-medium text-[#244693]">{form.data.phone_number || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-[#111827]">Gamefarm Details</h3>
                                    <div className="space-y-3 rounded-lg bg-[#F8F9FB] p-4">
                                        <div>
                                            <p className="text-xs text-[#6B7280]">Gamefarm Name</p>
                                            <p className="text-sm font-medium text-[#244693]">{form.data.gamefarm_name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#6B7280]">Gamefarm Bloodline</p>
                                            <p className="text-sm font-medium text-[#244693]">
                                                {form.data.bloodlines.trim() || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#6B7280]">Image Uploaded</p>
                                            <p className="text-sm font-medium text-[#244693]">
                                                Logo: {logoPreview ? '✓' : '—'} • Membership Certificate: {certificatePreview ? '✓' : '—'} • Gamefarm Facilities: {facilityCount > 0 ? '✓' : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-[#111827]">Farm Location</h3>
                                    <div className="rounded-lg bg-[#F8F9FB] p-4">
                                        <p className="text-xs text-[#6B7280]">Gamefarm Address</p>
                                        <p className="text-sm font-medium text-[#244693]">{gamefarmAddress || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm sm:px-6">
                        <button
                            type="button"
                            onClick={prevStep}
                            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                        >
                            Previous
                        </button>
                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="rounded-lg bg-[#102059] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-lg bg-[#102059] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-60"
                            >
                                {form.processing ? 'Submitting…' : 'Submit'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </RegisterBreederShell>
    )
}

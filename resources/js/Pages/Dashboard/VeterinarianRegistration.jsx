import { useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, X, AlertTriangle, Upload } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const inputClass =
    'w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244693] focus:border-transparent text-sm text-[#1F2937]'

const ISSUING_LABELS = {
    PRC: 'PRC - Professional Regulation Commission',
    PVB: 'PVB - Philippine Veterinary Board',
    'DA-BAI': 'DA-BAI - Bureau of Animal Industry',
    PVMA: 'PVMA - Philippine Veterinary Medical Association',
    Other: 'Other',
}

function VeterinarianRegistrationShell({ auth, title, children }) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title={title} notificationCount={0}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return <KlasmeytDashboardLayout auth={auth} title={title}>{children}</KlasmeytDashboardLayout>
}

export default function VeterinarianRegistration({ auth }) {
    useDashboardSession()

    const accountsUrl =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/users' : '/dashboard/super-admin/users'

    const storeUrl = accountsUrl

    const [currentStep, setCurrentStep] = useState(1)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)

    const form = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
        username: '',
        user_type: 'veterinarian',
        status: 'active',
        vet_license_number: '',
        vet_license_expiration: '',
        vet_issuing_authority: '',
        vet_service_area: '',
        vet_specialization: '',
        vet_clinic_name: '',
        vet_clinic_address: '',
        license_front: null,
        license_back: null,
    })

    const steps = [
        { number: 1, title: 'Account Information' },
        { number: 2, title: 'Professional Information' },
        { number: 3, title: 'Review & Confirmation' },
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (currentStep !== 3) return
        setShowConfirmModal(true)
    }

    const confirmSubmit = () => {
        form.post(storeUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setShowConfirmModal(false),
            onError: () => {
                setShowConfirmModal(false)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            },
        })
    }

    const nextStep = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setErrorMessage(null)

        if (currentStep === 1) {
            if (
                !form.data.first_name ||
                !form.data.last_name ||
                !form.data.email ||
                !form.data.mobile_number ||
                !form.data.password ||
                !form.data.password_confirmation
            ) {
                setErrorMessage('Please fill in all required fields before proceeding.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(form.data.email)) {
                setErrorMessage('Please enter a valid email address.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            if (form.data.password.length < 6) {
                setErrorMessage('Password must be at least 6 characters.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            if (form.data.password !== form.data.password_confirmation) {
                setErrorMessage('Password and confirmation do not match.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep === 2) {
            if (
                !form.data.vet_license_number ||
                !form.data.vet_license_expiration ||
                !form.data.vet_issuing_authority ||
                !form.data.vet_service_area ||
                !form.data.vet_specialization ||
                !form.data.license_front ||
                !form.data.license_back
            ) {
                setErrorMessage('Please fill in all required fields and upload license photos before proceeding.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
            setErrorMessage(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const issuingDisplay =
        ISSUING_LABELS[form.data.vet_issuing_authority] || form.data.vet_issuing_authority || '—'

    const serverErrorKeys = [
        'error',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'mobile_number',
        'password',
        'password_confirmation',
        'username',
        'vet_license_number',
        'vet_license_expiration',
        'vet_issuing_authority',
        'vet_service_area',
        'vet_specialization',
        'license_front',
        'license_back',
    ]
    const serverErrorBanner = serverErrorKeys.some((k) => form.errors[k])

    return (
        <VeterinarianRegistrationShell auth={auth} title="Add Veterinarian">
            <Head title="Add Veterinarian" />

            <div className="min-h-screen bg-[#F8F9FB]">
                <button
                    type="button"
                    onClick={() => router.visit(accountsUrl)}
                    className="absolute left-6 top-6 z-10 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB] group"
                    title="Back to Accounts"
                >
                    <ArrowLeft className="h-5 w-5 text-[#6B7280] group-hover:text-[#102059]" />
                </button>

                <div className="container mx-auto px-6 py-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-8 pt-10 sm:pt-4">
                            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Add Veterinarian</h1>
                            <p className="text-sm text-[#6B7280]">
                                Register a new veterinarian to provide professional services
                            </p>
                        </div>

                        <div className="mb-8">
                            <div className="flex max-w-2xl items-center">
                                {steps.map((step, index) => (
                                    <div key={step.number} className="flex flex-1 items-center">
                                        <div className="flex flex-shrink-0 items-center">
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
                                            <div className="ml-3 whitespace-nowrap">
                                                <p
                                                    className={`text-sm font-semibold ${
                                                        currentStep >= step.number ? 'text-[#102059]' : 'text-[#9CA3AF]'
                                                    }`}
                                                    style={{ margin: '0px'}}
                                                >
                                                    {step.title}
                                                </p>
                                            </div>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div
                                                className={`mx-4 h-0.5 min-w-12 flex-1 transition-all ${
                                                    currentStep > step.number ? 'bg-[#102059]' : 'bg-[#E5E7EB]'
                                                }`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#C62828] bg-[#FFEBEE] px-4 py-3">
                                <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#C62828]" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#C62828]">Error</p>
                                    <p className="text-sm text-[#C62828]">{errorMessage}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setErrorMessage(null)}
                                    className="rounded p-1 text-[#C62828] transition-colors hover:bg-[#C62828]/10"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {serverErrorBanner && (
                            <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#C62828] bg-[#FFEBEE] px-4 py-3">
                                <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#C62828]" />
                                <div className="flex-1 text-sm text-[#C62828]">
                                    {serverErrorKeys.map((k) => {
                                        const err = form.errors[k]
                                        if (!err) return null
                                        const msg = Array.isArray(err) ? err[0] : err
                                        return <p key={k}>{msg}</p>
                                    })}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Account Information</h2>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                First Name <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={form.data.first_name}
                                                onChange={(e) => form.setData('first_name', e.target.value)}
                                                placeholder="Enter first name"
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Middle Name <span className="text-xs text-[#6B7280]">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={form.data.middle_name}
                                                onChange={(e) => form.setData('middle_name', e.target.value)}
                                                placeholder="Enter middle name"
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Last Name <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={form.data.last_name}
                                            onChange={(e) => form.setData('last_name', e.target.value)}
                                            placeholder="Enter last name"
                                            style={{ boxShadow: 'none'}}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Email Address <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            className={inputClass}
                                            value={form.data.email}
                                            onChange={(e) => form.setData('email', e.target.value)}
                                            placeholder="veterinarian@example.com"
                                            style={{ boxShadow: 'none'}}
                                        />
                                        <p className="mt-1 text-xs text-[#6B7280]">This email will be used for veterinarian login</p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Phone Number <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            className={inputClass}
                                            value={form.data.mobile_number}
                                            onChange={(e) => form.setData('mobile_number', e.target.value)}
                                            placeholder="+63 912 345 6789"
                                            style={{ boxShadow: 'none'}}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Password <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                className={inputClass}
                                                value={form.data.password}
                                                onChange={(e) => form.setData('password', e.target.value)}
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Confirm password <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                className={inputClass}
                                                value={form.data.password_confirmation}
                                                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Username <span className="text-xs text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={form.data.username}
                                            onChange={(e) => form.setData('username', e.target.value)}
                                            placeholder="Auto-generated if empty"
                                            style={{ boxShadow: 'none'}}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Professional Information</h2>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            License Number <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={form.data.vet_license_number}
                                            onChange={(e) => form.setData('vet_license_number', e.target.value)}
                                            placeholder="Enter license number"
                                            style={{ boxShadow: 'none'}}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Expiration Date <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                className={inputClass}
                                                value={form.data.vet_license_expiration}
                                                onChange={(e) => form.setData('vet_license_expiration', e.target.value)}
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Issuing Authority <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <select
                                                className={`${inputClass} cursor-pointer bg-white`}
                                                value={form.data.vet_issuing_authority}
                                                onChange={(e) => form.setData('vet_issuing_authority', e.target.value)}
                                                style={{ boxShadow: 'none'}}
                                            >
                                                <option value="">Select Issuing Authority</option>
                                                <option value="PRC">PRC - Professional Regulation Commission</option>
                                                <option value="PVB">PVB - Philippine Veterinary Board</option>
                                                <option value="DA-BAI">DA-BAI - Bureau of Animal Industry</option>
                                                <option value="PVMA">PVMA - Philippine Veterinary Medical Association</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                License Photo (Front) <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="file"
                                                id="licenseFront"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    form.setData('license_front', e.target.files?.[0] ?? null)
                                                }
                                                style={{ boxShadow: 'none'}}
                                            />
                                            <label
                                                htmlFor="licenseFront"
                                                className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] px-4 py-3 transition-colors hover:bg-[#F9FAFB]"
                                            >
                                                <Upload className="mr-2 h-5 w-5 text-[#6B7280]" />
                                                <span className="text-sm text-[#6B7280]">
                                                    {form.data.license_front?.name || 'Upload front photo'}
                                                </span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                License Photo (Back) <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="file"
                                                id="licenseBack"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    form.setData('license_back', e.target.files?.[0] ?? null)
                                                }
                                            />
                                            <label
                                                htmlFor="licenseBack"
                                                className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] px-4 py-3 transition-colors hover:bg-[#F9FAFB]"
                                            >
                                                <Upload className="mr-2 h-5 w-5 text-[#6B7280]" />
                                                <span className="text-sm text-[#6B7280]">
                                                    {form.data.license_back?.name || 'Upload back photo'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Service Area <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={form.data.vet_service_area}
                                                onChange={(e) => form.setData('vet_service_area', e.target.value)}
                                                placeholder="e.g., Metro Manila, Bulacan"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Specialization <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={form.data.vet_specialization}
                                                onChange={(e) => form.setData('vet_specialization', e.target.value)}
                                                placeholder="e.g., Poultry, Gamefowl"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Clinic Name <span className="text-xs text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={form.data.vet_clinic_name}
                                            onChange={(e) => form.setData('vet_clinic_name', e.target.value)}
                                            placeholder="Enter clinic name if applicable"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Clinic Address <span className="text-xs text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                            value={form.data.vet_clinic_address}
                                            onChange={(e) => form.setData('vet_clinic_address', e.target.value)}
                                            placeholder="Enter complete clinic address"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Review & Confirmation</h2>

                                    <div className="space-y-4 rounded-lg bg-[#F9FAFB] p-6">
                                        <div>
                                            <h3 className="mb-3 text-sm font-bold text-[#102059]">Account Information</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Full Name:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.first_name} {form.data.middle_name} {form.data.last_name}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Email Address:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{form.data.email}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Phone Number:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{form.data.mobile_number}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-[#E5E7EB]" />

                                        <div>
                                            <h3 className="mb-3 text-sm font-bold text-[#102059]">Professional Information</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">License Number:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.vet_license_number}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Expiration Date:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {formatDateForDisplay(form.data.vet_license_expiration)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Issuing Authority:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{issuingDisplay}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">License Photos:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">Front & Back Uploaded</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Service Area:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.vet_service_area}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Specialization:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.vet_specialization}
                                                    </span>
                                                </div>
                                                {form.data.vet_clinic_name && (
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-sm text-[#6B7280]">Clinic Name:</span>
                                                        <span className="text-sm font-semibold text-[#102059]">
                                                            {form.data.vet_clinic_name}
                                                        </span>
                                                    </div>
                                                )}
                                                {form.data.vet_clinic_address && (
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-sm text-[#6B7280]">Clinic Address:</span>
                                                        <span className="text-sm font-semibold text-[#102059]">
                                                            {form.data.vet_clinic_address}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-[#244693]/20 bg-[#EEF2FF] p-4">
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#244693]">
                                                <span className="text-xs font-bold text-white">i</span>
                                            </div>
                                            <div>
                                                <p className="mb-1 text-sm font-semibold text-[#102059]">
                                                    Veterinarian Account Creation
                                                </p>
                                                <p className="text-xs leading-relaxed text-[#65676B]">
                                                    Once submitted, this veterinarian can log in with the credentials you set and will be
                                                    able to provide professional services in their service area.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex items-center justify-between border-t border-[#E5E7EB] pt-6">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className={`rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
                                        currentStep === 1
                                            ? 'cursor-not-allowed bg-[#F9FAFB] text-[#6B7280]'
                                            : 'border border-[#244693] bg-white text-[#244693] hover:bg-[#F0F2F5]'
                                    }`}
                                    disabled={currentStep === 1}
                                >
                                    Previous
                                </button>

                                {currentStep < steps.length ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="rounded-lg bg-[#244693] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570]"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="rounded-lg bg-[#244693] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570] disabled:opacity-60"
                                    >
                                        {form.processing ? 'Adding…' : 'Add Veterinarian'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="relative w-full max-w-md rounded-lg bg-white p-8">
                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(false)}
                            className="absolute right-4 top-4 text-[#6B7280] transition-colors hover:text-[#102059]"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF9800]">
                                <AlertTriangle className="h-10 w-10 text-white" />
                            </div>

                            <h3 className="mb-2 text-2xl font-bold text-[#102059]">Confirm Veterinarian Addition</h3>

                            <p className="mb-6 text-sm text-[#6B7280]">
                                Are you sure you want to add this veterinarian account? Please confirm the details are correct.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSubmit}
                                    disabled={form.processing}
                                    className="flex-1 rounded-lg bg-[#244693] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570] disabled:opacity-60"
                                >
                                    {form.processing ? 'Submitting…' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </VeterinarianRegistrationShell>
    )
}

import { useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, X, AlertTriangle, Upload, Trash2 } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const inputClass =
    'w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244693] focus:border-transparent text-sm text-[#1F2937]'

function RiderRegistrationShell({ auth, title, children }) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title={title} notificationCount={0}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return <KlasmeytDashboardLayout auth={auth} title={title}>{children}</KlasmeytDashboardLayout>
}

export default function RiderRegistration({ auth }) {
    useDashboardSession()

    const accountsUrl =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/users' : '/dashboard/super-admin/users'

    const storeUrl = accountsUrl

    const [currentStep, setCurrentStep] = useState(1)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState(null)
    const [previews, setPreviews] = useState({
        driving_license_front: null,
        driving_license_back: null,
        vehicle_registration: null,
    })

    const form = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
        username: '',
        user_type: 'rider',
        status: 'active',
        rider_license_number: '',
        rider_vehicle_type: 'Motorcycle',
        rider_vehicle_brand: '',
        rider_vehicle_model: '',
        driving_license_front: null,
        driving_license_back: null,
        vehicle_registration: null,
    })

    const steps = [
        { number: 1, title: 'Account Information' },
        { number: 2, title: 'Rider & Vehicle \nInformation' },
        { number: 3, title: 'Document Upload' },
        { number: 4, title: 'Review & Confirmation' },
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (currentStep !== 4) return
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

    const validateFile = (file) => {
        if (file.size > 5 * 1024 * 1024) {
            return 'File size must be less than 5MB.'
        }
        if (!file.type.startsWith('image/')) {
            return 'Please upload only image files (JPG, PNG).'
        }
        return null
    }

    const handleFileChange = (e, fieldName) => {
        const file = e.target.files?.[0]
        if (!file) return
        const err = validateFile(file)
        if (err) {
            setErrorMessage(err)
            return
        }
        setErrorMessage(null)
        form.setData(fieldName, file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreviews((prev) => ({ ...prev, [fieldName]: reader.result }))
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveFile = (fieldName) => {
        form.setData(fieldName, null)
        setPreviews((prev) => ({ ...prev, [fieldName]: null }))
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
                !form.data.rider_license_number ||
                !form.data.rider_vehicle_type ||
                !form.data.rider_vehicle_brand ||
                !form.data.rider_vehicle_model
            ) {
                setErrorMessage('Please fill in all required fields before proceeding.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep === 3) {
            if (!form.data.driving_license_front || !form.data.driving_license_back || !form.data.vehicle_registration) {
                setErrorMessage('Please upload all required documents before proceeding.')
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
        'rider_license_number',
        'rider_vehicle_type',
        'rider_vehicle_brand',
        'rider_vehicle_model',
        'driving_license_front',
        'driving_license_back',
        'vehicle_registration',
    ]
    const serverErrorBanner = serverErrorKeys.some((k) => form.errors[k])

    return (
        <RiderRegistrationShell auth={auth} title="Add Rider">
            <Head title="Add Rider" />

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
                            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Add Rider</h1>
                            <p className="text-sm text-[#6B7280]">Register a new rider for delivery services</p>
                        </div>

                        <div className="mb-8">
                            <div className="flex max-w-4xl flex-wrap items-center lg:flex-nowrap">
                                {steps.map((step, index) => (
                                    <div key={step.number} className="mb-4 flex flex-1 min-w-[140px] items-center lg:mb-0">
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
                                                className={`mx-2 hidden h-0.5 min-w-8 flex-1 lg:block ${
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
                                            placeholder="rider@example.com"
                                            style={{ boxShadow: 'none'}}
                                        />
                                        <p className="mt-1 text-xs text-[#6B7280]">This email will be used for rider login</p>
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
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Rider & Vehicle Information</h2>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            License Number <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={form.data.rider_license_number}
                                            onChange={(e) => form.setData('rider_license_number', e.target.value)}
                                            placeholder="N01-23-456789"
                                            style={{ boxShadow: 'none'}}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Vehicle Type <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <select
                                            className={`${inputClass} cursor-pointer bg-white`}
                                            value={form.data.rider_vehicle_type}
                                            onChange={(e) => form.setData('rider_vehicle_type', e.target.value)}
                                        >
                                            <option value="Motorcycle">Motorcycle</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Vehicle Brand <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={form.data.rider_vehicle_brand}
                                                onChange={(e) => form.setData('rider_vehicle_brand', e.target.value)}
                                                placeholder="Honda, Yamaha, Suzuki, etc."
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Vehicle Model <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={form.data.rider_vehicle_model}
                                                onChange={(e) => form.setData('rider_vehicle_model', e.target.value)}
                                                placeholder="TMX 155, Mio, Raider 150, etc."
                                                style={{ boxShadow: 'none'}}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Document Upload</h2>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Driving License (Front) <span className="text-[#E20E28]">*</span>
                                        </label>
                                        {!form.data.driving_license_front ? (
                                            <div>
                                                <input
                                                    type="file"
                                                    id="drivingLicenseFront"
                                                    accept="image/jpeg,image/png"
                                                    className="hidden"
                                                    onChange={(e) => handleFileChange(e, 'driving_license_front')}
                                                    style={{ boxShadow: 'none'}}
                                                />
                                                <label
                                                    htmlFor="drivingLicenseFront"
                                                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] transition-colors hover:bg-[#F9FAFB]"
                                                >
                                                    <Upload className="mb-2 h-8 w-8 text-[#6B7280]" />
                                                    <span className="text-sm font-semibold text-[#6B7280]">
                                                        Upload Driving License (Front)
                                                    </span>
                                                    <span className="mt-1 text-xs text-[#9CA3AF]">JPG, PNG (max. 5MB)</span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="relative h-32 w-full overflow-hidden rounded-lg border border-[#E5E7EB]">
                                                <img
                                                    src={previews.driving_license_front || ''}
                                                    alt="Driving License Front"
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('driving_license_front')}
                                                    className="absolute right-2 top-2 rounded-lg bg-[#E20E28] p-2 text-white transition-colors hover:bg-[#C00D23]"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Driving License (Back) <span className="text-[#E20E28]">*</span>
                                        </label>
                                        {!form.data.driving_license_back ? (
                                            <div>
                                                <input
                                                    type="file"
                                                    id="drivingLicenseBack"
                                                    accept="image/jpeg,image/png"
                                                    className="hidden"
                                                    onChange={(e) => handleFileChange(e, 'driving_license_back')}
                                                />
                                                <label
                                                    htmlFor="drivingLicenseBack"
                                                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] transition-colors hover:bg-[#F9FAFB]"
                                                >
                                                    <Upload className="mb-2 h-8 w-8 text-[#6B7280]" />
                                                    <span className="text-sm font-semibold text-[#6B7280]">
                                                        Upload Driving License (Back)
                                                    </span>
                                                    <span className="mt-1 text-xs text-[#9CA3AF]">JPG, PNG (max. 5MB)</span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="relative h-32 w-full overflow-hidden rounded-lg border border-[#E5E7EB]">
                                                <img
                                                    src={previews.driving_license_back || ''}
                                                    alt="Driving License Back"
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('driving_license_back')}
                                                    className="absolute right-2 top-2 rounded-lg bg-[#E20E28] p-2 text-white transition-colors hover:bg-[#C00D23]"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Vehicle Registration <span className="text-[#E20E28]">*</span>
                                        </label>
                                        {!form.data.vehicle_registration ? (
                                            <div>
                                                <input
                                                    type="file"
                                                    id="vehicleRegistration"
                                                    accept="image/jpeg,image/png"
                                                    className="hidden"
                                                    onChange={(e) => handleFileChange(e, 'vehicle_registration')}
                                                />
                                                <label
                                                    htmlFor="vehicleRegistration"
                                                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] transition-colors hover:bg-[#F9FAFB]"
                                                >
                                                    <Upload className="mb-2 h-8 w-8 text-[#6B7280]" />
                                                    <span className="text-sm font-semibold text-[#6B7280]">
                                                        Upload Vehicle Registration
                                                    </span>
                                                    <span className="mt-1 text-xs text-[#9CA3AF]">JPG, PNG (max. 5MB)</span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="relative h-32 w-full overflow-hidden rounded-lg border border-[#E5E7EB]">
                                                <img
                                                    src={previews.vehicle_registration || ''}
                                                    alt="Vehicle Registration"
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile('vehicle_registration')}
                                                    className="absolute right-2 top-2 rounded-lg bg-[#E20E28] p-2 text-white transition-colors hover:bg-[#C00D23]"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
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
                                            <h3 className="mb-3 text-sm font-bold text-[#102059]">Rider & Vehicle Information</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">License Number:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.rider_license_number}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Vehicle Type:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.rider_vehicle_type}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Vehicle Brand:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.rider_vehicle_brand}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Vehicle Model:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">
                                                        {form.data.rider_vehicle_model}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-[#E5E7EB]" />

                                        <div>
                                            <h3 className="mb-3 text-sm font-bold text-[#102059]">Documents</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Driving License:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">Front & Back Uploaded</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Vehicle Registration:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">Uploaded</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-[#244693]/20 bg-[#EEF2FF] p-4">
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#244693]">
                                                <span className="text-xs font-bold text-white">i</span>
                                            </div>
                                            <div>
                                                <p className="mb-1 text-sm font-semibold text-[#102059]">Rider Account Creation</p>
                                                <p className="text-xs leading-relaxed text-[#65676B]">
                                                    Once submitted, this rider will be able to log in with the credentials you set and can
                                                    start accepting delivery assignments for Klasmeyt orders.
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
                                        {form.processing ? 'Adding…' : 'Add Rider'}
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

                            <h3 className="mb-2 text-2xl font-bold text-[#102059]">Confirm Rider Addition</h3>

                            <p className="mb-6 text-sm text-[#6B7280]">
                                Are you sure you want to add this rider account? Please confirm the details are correct.
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
        </RiderRegistrationShell>
    )
}

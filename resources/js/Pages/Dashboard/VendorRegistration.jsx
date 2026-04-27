import { useEffect, useMemo, useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, X } from 'lucide-react'
import KlasmeytDashboardLayout from '../../Layouts/KlasmeytDashboardLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const inputClass =
    'w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244693] focus:border-transparent text-sm text-[#1F2937]'

function VendorRegistrationShell({ auth, title, children }) {
    if (auth?.user?.user_type === 'super_admin') {
        return (
            <SuperAdminKlasmeytLayout auth={auth} title={title} notificationCount={0}>
                {children}
            </SuperAdminKlasmeytLayout>
        )
    }
    return <KlasmeytDashboardLayout auth={auth} title={title}>{children}</KlasmeytDashboardLayout>
}

export default function VendorRegistration({ auth, agrivets = [] }) {
    useDashboardSession()

    const accountsUrl =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin/users' : '/dashboard/super-admin/users'

    const apiPrefix =
        auth?.user?.user_type === 'admin' ? '/dashboard/admin' : '/dashboard/super-admin'

    const [currentStep, setCurrentStep] = useState(1)
    const [errorMessage, setErrorMessage] = useState(null)
    const [agrivetId, setAgrivetId] = useState('')
    const [shopId, setShopId] = useState('')
    const [preAgrivetId, setPreAgrivetId] = useState(null)
    const [preShopId, setPreShopId] = useState(null)

    const form = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        password_confirmation: '',
        username: '',
        status: 'active',
    })

    const steps = [
        { number: 1, title: 'Assignment' },
        { number: 2, title: 'Account Information' },
        { number: 3, title: 'Review & Confirmation' },
    ]

    useEffect(() => {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const aid = params.get('agrivet_id') || params.get('agrivetId')
        const sid = params.get('shop_id') || params.get('storeId')
        if (aid) {
            setPreAgrivetId(aid)
            setAgrivetId(String(aid))
        }
        if (sid) {
            setPreShopId(sid)
            setShopId(String(sid))
        }
    }, [])

    const selectedAgrivet = useMemo(
        () => agrivets.find((a) => String(a.id) === String(agrivetId)),
        [agrivets, agrivetId],
    )

    const availableShops = selectedAgrivet?.shops ?? []

    const selectedShop = useMemo(
        () => availableShops.find((s) => String(s.id) === String(shopId)),
        [availableShops, shopId],
    )

    const agrivetDisplayName = selectedAgrivet?.name ?? ''
    const storeDisplayName = selectedShop
        ? `${selectedShop.shop_name}${selectedShop.shop_city ? ` - ${selectedShop.shop_city}` : ''}`
        : ''

    const storeUrl = useMemo(() => {
        if (!agrivetId || !shopId) return ''
        return `${apiPrefix}/agrivets/${agrivetId}/shops/${shopId}/vendors`
    }, [apiPrefix, agrivetId, shopId])

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (currentStep !== 3 || !storeUrl) return

        form.post(storeUrl, {
            preserveScroll: true,
            onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        })
    }

    const nextStep = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setErrorMessage(null)

        if (currentStep === 1) {
            if (!agrivetId) {
                setErrorMessage('Please select an agrivet before proceeding.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            if (!shopId) {
                setErrorMessage('Please select a store before proceeding.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep === 2) {
            if (
                !form.data.first_name ||
                !form.data.last_name ||
                !form.data.email ||
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

    const handleAgrivetChange = (value) => {
        setAgrivetId(value)
        setShopId('')
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
    ]
    const serverErrorBanner = serverErrorKeys.some((k) => form.errors[k])

    const hasAgrivets = agrivets.length > 0

    return (
        <VendorRegistrationShell auth={auth} title="Add Store Vendor">
            <Head title="Add Store Vendor" />

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
                            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Add Store Vendor</h1>
                            <p className="text-sm text-[#6B7280]">Add a new vendor to help manage store operations</p>
                        </div>

                        {!hasAgrivets && (
                            <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
                                No agrivets are set up yet. Create an agrivet and shops first, then add vendors here.
                            </div>
                        )}

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
                                        return (
                                            <p key={k}>{msg}</p>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Assignment</h2>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Agrivet <span className="text-[#E20E28]">*</span>
                                        </label>
                                        {preAgrivetId ? (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={agrivetDisplayName}
                                                    disabled
                                                    className="w-full cursor-not-allowed rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[#102059]"
                                                    placeholder="Loading agrivet..."
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-[#E5E7EB] bg-[#F3F4F6] px-2 py-1 text-xs text-[#6B7280]">
                                                    Pre-assigned
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    value={agrivetId}
                                                    onChange={(e) => handleAgrivetChange(e.target.value)}
                                                    disabled={!hasAgrivets}
                                                    className={`${inputClass} cursor-pointer appearance-none bg-white`}
                                                >
                                                    <option value="">Select an agrivet...</option>
                                                    {agrivets.map((a) => (
                                                        <option key={a.id} value={String(a.id)}>
                                                            {a.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                                    <svg className="h-4 w-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                        <p className="mt-1 text-xs text-[#6B7280]">This vendor will be assigned to this agrivet</p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Store (Branch) <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={shopId}
                                                onChange={(e) => setShopId(e.target.value)}
                                                disabled={!!preShopId || !agrivetId}
                                                className={`${inputClass} appearance-none ${
                                                    preShopId ? 'cursor-not-allowed bg-[#F9FAFB]' : 'cursor-pointer bg-white'
                                                }`}
                                            >
                                                <option value="">Select a store...</option>
                                                {availableShops.map((s) => (
                                                    <option key={s.id} value={String(s.id)}>
                                                        {s.shop_name}
                                                        {s.shop_city ? ` - ${s.shop_city}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {preShopId ? (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-[#E5E7EB] bg-[#F3F4F6] px-2 py-1 text-xs text-[#6B7280]">
                                                    Pre-assigned
                                                </div>
                                            ) : (
                                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                                    <svg className="h-4 w-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-[#6B7280]">This vendor will be assigned to manage this store</p>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
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
                                            placeholder="vendor@example.com"
                                            style={{ boxShadow: 'none'}}
                                        />
                                        <p className="mt-1 text-xs text-[#6B7280]">This email will be used for vendor login</p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Phone Number <span className="text-xs text-[#6B7280]">(Optional)</span>
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

                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Review & Confirmation</h2>

                                    <div className="space-y-4 rounded-lg bg-[#F9FAFB] p-6">
                                        <div>
                                            <h3 className="mb-3 text-sm font-bold text-[#102059]">Assignment</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Agrivet:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{agrivetDisplayName}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Store:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{storeDisplayName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-[#E5E7EB]" />

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
                                                    <span className="text-sm text-[#6B7280]">Email:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{form.data.email}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Phone:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{form.data.mobile_number || '—'}</span>
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
                                                <p className="mb-1 text-sm font-semibold text-[#102059]">Vendor Account Creation</p>
                                                <p className="text-xs leading-relaxed text-[#65676B]">
                                                    Once submitted, this vendor can log in and manage store operations including products,
                                                    inventory, orders, and more.
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
                                        disabled={!hasAgrivets && currentStep === 1}
                                        className="rounded-lg bg-[#244693] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570] disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="rounded-lg bg-[#244693] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570] disabled:opacity-60"
                                    >
                                        {form.processing ? 'Adding…' : 'Add Vendor'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

        </VendorRegistrationShell>
    )
}

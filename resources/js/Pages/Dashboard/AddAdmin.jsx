import { useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, X, AlertTriangle } from 'lucide-react'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const inputClass =
    'w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244693] focus:border-transparent text-sm text-[#1F2937]'

const inputError = (err) => (err ? 'border-red-400 ring-red-200' : '')

export default function AddAdmin({ auth }) {
    useDashboardSession()

    const accountsUrl = '/dashboard/super-admin/users'

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
        user_type: 'admin',
        status: 'active',
    })

    const steps = [
        { number: 1, title: 'Account Information' },
        { number: 2, title: 'Review & Confirmation' },
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (currentStep !== 2) return
        setShowConfirmModal(true)
    }

    const confirmSubmit = () => {
        setShowConfirmModal(false)
        form.post('/dashboard/super-admin/users', {
            preserveScroll: true,
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

    const serverErrorBanner =
        form.errors.error ||
        form.errors.first_name ||
        form.errors.last_name ||
        form.errors.email ||
        form.errors.mobile_number ||
        form.errors.password ||
        form.errors.password_confirmation ||
        form.errors.username ||
        form.errors.user_type

    return (
        <SuperAdminKlasmeytLayout auth={auth} title="Add Admin" notificationCount={0}>
            <Head title="Add System Administrator" />

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
                            <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Add System Administrator</h1>
                            <p className="text-sm text-[#6B7280]">Create a new admin account with full system access</p>
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
                                    {form.errors.error && <p>{form.errors.error}</p>}
                                    {form.errors.first_name && <p>{form.errors.first_name}</p>}
                                    {form.errors.middle_name && <p>{form.errors.middle_name}</p>}
                                    {form.errors.last_name && <p>{form.errors.last_name}</p>}
                                    {form.errors.email && <p>{form.errors.email}</p>}
                                    {form.errors.mobile_number && <p>{form.errors.mobile_number}</p>}
                                    {form.errors.password && <p>{form.errors.password}</p>}
                                    {form.errors.password_confirmation && <p>{form.errors.password_confirmation}</p>}
                                    {form.errors.username && <p>{form.errors.username}</p>}
                                    {form.errors.user_type && <p>{form.errors.user_type}</p>}
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
                                                className={`${inputClass} ${inputError(form.errors.first_name)}`}
                                                value={form.data.first_name}
                                                onChange={(e) => form.setData('first_name', e.target.value)}
                                                placeholder="Enter first name"
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Middle Name <span className="text-xs text-[#6B7280]">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={`${inputClass} ${inputError(form.errors.middle_name)}`}
                                                value={form.data.middle_name}
                                                onChange={(e) => form.setData('middle_name', e.target.value)}
                                                placeholder="Enter middle name"
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Last Name <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`${inputClass} ${inputError(form.errors.last_name)}`}
                                            value={form.data.last_name}
                                            onChange={(e) => form.setData('last_name', e.target.value)}
                                            placeholder="Enter last name"
                                            style={{ boxShadow: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Email Address <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            className={`${inputClass} ${inputError(form.errors.email)}`}
                                            value={form.data.email}
                                            onChange={(e) => form.setData('email', e.target.value)}
                                            placeholder="admin@example.com"
                                            style={{ boxShadow: 'none' }}
                                        />
                                        <p className="mt-1 text-xs text-[#6B7280]">This email will be used for admin login</p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Phone Number <span className="text-[#E20E28]">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            className={`${inputClass} ${inputError(form.errors.mobile_number)}`}
                                            value={form.data.mobile_number}
                                            onChange={(e) => form.setData('mobile_number', e.target.value)}
                                            placeholder="+63 912 345 6789"
                                            style={{ boxShadow: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                            Username <span className="text-xs text-[#6B7280]">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`${inputClass} ${inputError(form.errors.username)}`}
                                            value={form.data.username}
                                            onChange={(e) => form.setData('username', e.target.value)}
                                            placeholder="Auto-generated if empty"
                                            style={{ boxShadow: 'none' }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Password <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                className={`${inputClass} ${inputError(form.errors.password)}`}
                                                value={form.data.password}
                                                onChange={(e) => form.setData('password', e.target.value)}
                                                autoComplete="new-password"
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#102059]">
                                                Confirm password <span className="text-[#E20E28]">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                className={`${inputClass} ${inputError(form.errors.password_confirmation)}`}
                                                value={form.data.password_confirmation}
                                                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                                autoComplete="new-password"
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <h2 className="mb-6 text-2xl font-bold text-[#102059]">Review & Confirmation</h2>

                                    <div className="space-y-4 rounded-lg bg-[#F9FAFB] p-6">
                                        <div>
                                            <h3 className="mb-3 text-sm font-bold text-[#102059]">Account Information</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between gap-4">
                                                    <span className="shrink-0 text-sm text-[#6B7280]">Full Name:</span>
                                                    <span className="text-right text-sm font-semibold text-[#102059]">
                                                        {form.data.first_name} {form.data.middle_name} {form.data.last_name}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Email:</span>
                                                    <span className="break-all text-right text-sm font-semibold text-[#102059]">
                                                        {form.data.email}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Phone:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">{form.data.mobile_number}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-sm text-[#6B7280]">Role:</span>
                                                    <span className="text-sm font-semibold text-[#102059]">Admin</span>
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
                                                <p className="mb-1 text-sm font-semibold text-[#102059]">Admin account creation</p>
                                                <p className="text-xs leading-relaxed text-[#65676B]">
                                                    This user will be able to sign in as Admin and manage agrivets, vendors, and
                                                    operational accounts you permit. Share the password securely with them.
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
                                    disabled={currentStep === 1}
                                    className={`rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
                                        currentStep === 1
                                            ? 'cursor-not-allowed bg-[#F9FAFB] text-[#6B7280]'
                                            : 'border border-[#244693] bg-white text-[#244693] hover:bg-[#F0F2F5]'
                                    }`}
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
                                        Add Admin
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

                            <h3 className="mb-2 text-2xl font-bold text-[#102059]">Confirm admin addition</h3>

                            <p className="mb-6 text-sm text-[#6B7280]">
                                Are you sure you want to create this admin account? You can deactivate the account later from
                                Accounts.
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
                                    {form.processing ? 'Creating…' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminKlasmeytLayout>
    )
}

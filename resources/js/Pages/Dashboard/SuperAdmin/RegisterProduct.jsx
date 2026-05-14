import { useState, useRef } from 'react'
import { useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, X, CheckCircle, Upload, Star } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

export default function SuperAdminRegisterProduct({ auth, categories = [], subCategories = [], authUser }) {
    const [currentStep, setCurrentStep] = useState(1)
    const [errorMessage, setErrorMessage] = useState(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // Five fixed photo slots
    const [uploadedPhotos, setUploadedPhotos] = useState([null, null, null, null, null])
    const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0)
    const fileInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef()]

    const form = useForm({
        brand:               '',
        product_name:        '',
        category_id:         '',
        sub_category_id:     '',
        weight:              '',
        unit:                'kg',
        description:         '',
        images:              [],
        primary_image_index: 0,
    })

    const steps = [
        { number: 1, title: 'Product Information' },
        { number: 2, title: 'Images' },
        { number: 3, title: 'Review & Confirm' },
    ]

    const unitTypes = ['kg', 'g', 'mg', 'L', 'mL', 'pieces', 'pack', 'box', 'bottle', 'bag']

    // ── Photo handling ──────────────────────────────────────────────
    const handlePhotoUpload = (index, e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const newPhotos = [...uploadedPhotos]
            newPhotos[index] = { preview: reader.result, file }
            setUploadedPhotos(newPhotos)

            // keep form.data.images in slot order (null slots produce undefined, filter later)
            const files = newPhotos.map(p => p?.file ?? null)
            form.setData('images', files)
        }
        reader.readAsDataURL(file)
    }

    const handlePrimaryChange = (index) => {
        setPrimaryPhotoIndex(index)
        form.setData('primary_image_index', index)
    }

    // ── Navigation ──────────────────────────────────────────────────
    const nextStep = () => {
        setErrorMessage(null)

        if (currentStep === 1) {
            if (!form.data.product_name || !form.data.description) {
                setErrorMessage('Please fill in all required fields: Product Name and Description.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep === 2) {
            const uploadedCount = uploadedPhotos.filter(p => p !== null).length
            if (uploadedCount < 5) {
                setErrorMessage(`Please upload all 5 product images. You have uploaded ${uploadedCount} out of 5.`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        setCurrentStep(s => s + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const prevStep = () => {
        setCurrentStep(s => s - 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // ── Submit ──────────────────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault()
        if (currentStep !== 3) return

        // Build a real FormData with the ordered file slots
        const fd = new FormData()
        fd.append('brand',               form.data.brand)
        fd.append('product_name',        form.data.product_name)
        fd.append('category_id',         form.data.category_id)
        fd.append('sub_category_id',     form.data.sub_category_id)
        fd.append('weight',              form.data.weight)
        fd.append('unit',                form.data.unit)
        fd.append('description',         form.data.description)
        fd.append('primary_image_index', primaryPhotoIndex)

        uploadedPhotos.forEach((slot, i) => {
            if (slot?.file) fd.append(`images[${i}]`, slot.file)
        })

        form.post('/dashboard/super-admin/products', {
            data: fd,
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => setShowSuccessModal(true),
        })
    }

    const getCategoryName    = (id) => categories.find(c => String(c.id) === String(id))?.name ?? '—'
    const getSubCategoryName = (id) => subCategories.find(s => String(s.id) === String(id))?.name ?? '—'
    const uploadedCount   = uploadedPhotos.filter(p => p !== null).length

    // ── Shared style tokens ─────────────────────────────────────────
    const inputClass = 'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm'
    const labelClass = 'block text-xs text-[#6B7280] mb-2'
    const cardClass  = 'rounded-lg border border-[#E5E7EB] bg-white'

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Register Product">

            {/* Back button */}
            <button
                type="button"
                onClick={() => router.visit('/dashboard/super-admin/products')}
                className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#102059]"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Products
            </button>

            {/* Page header */}
            <div className="mb-6">
                <h1 className="mb-1 text-2xl font-semibold text-[#102059]">Register New Product</h1>
                <p className="text-sm text-[#6B7280]">Add a new product to the platform catalog.</p>
            </div>

            {/* ── Stepper ── */}
            <div className={`${cardClass} mb-6 p-4`}>
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex flex-1 items-center">
                            <div className="flex items-center">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                    currentStep >= step.number ? 'border-[#102059] bg-[#102059]' : 'border-[#E5E7EB] bg-white'
                                }`}>
                                    {currentStep > step.number
                                        ? <Check className="h-5 w-5 text-white" />
                                        : <span className={`text-sm font-semibold ${currentStep === step.number ? 'text-white' : 'text-[#9CA3AF]'}`}>{step.number}</span>
                                    }
                                </div>
                                <span className={`ml-3 hidden text-sm font-semibold md:block ${currentStep >= step.number ? 'text-[#102059]' : 'text-[#9CA3AF]'}`}>
                                    {step.title}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`mx-4 h-0.5 flex-1 transition-all ${currentStep > step.number ? 'bg-[#102059]' : 'bg-[#E5E7EB]'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Error banner ── */}
            {errorMessage && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#E20E28] bg-[#FEE2E2] p-4">
                    <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E20E28]" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-[#E20E28]">Validation Error</p>
                        <p className="text-sm text-[#991B1B]">{errorMessage}</p>
                    </div>
                    <button type="button" onClick={() => setErrorMessage(null)} className="text-[#E20E28] hover:text-[#991B1B]">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* ════════════════════════════════════════════════
                    STEP 1 — Product Information
                ════════════════════════════════════════════════ */}
                {currentStep === 1 && (
                    <div className={cardClass}>
                        <div className="border-b border-[#E5E7EB] px-8 py-4">
                            <h2 className="text-sm font-semibold text-[#102059]">Product Information</h2>
                        </div>

                        <div className="space-y-6 px-8 py-6">

                            {/* Brand */}
                            <div>
                                <label className={labelClass}>Brand</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={form.data.brand}
                                    onChange={e => form.setData('brand', e.target.value)}
                                    placeholder="Enter brand name"
                                />
                            </div>

                            {/* Product Name */}
                            <div>
                                <label className={labelClass}>
                                    Product Name <span className="text-[#E20E28]">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`${inputClass} ${form.errors.product_name ? 'border-[#E20E28]' : ''}`}
                                    value={form.data.product_name}
                                    onChange={e => form.setData('product_name', e.target.value)}
                                    placeholder="Enter product name"
                                />
                                {form.errors.product_name && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.product_name}</p>}
                            </div>

                            {/* Category & Sub Category */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Category</label>
                                    <select
                                        className={inputClass}
                                        value={form.data.category_id}
                                        onChange={e => form.setData('category_id', e.target.value)}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Sub Category</label>
                                    <select
                                        className={inputClass}
                                        value={form.data.sub_category_id}
                                        onChange={e => form.setData('sub_category_id', e.target.value)}
                                    >
                                        <option value="">Select Sub Category</option>
                                        {subCategories.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Weight/Size + Unit */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Weight / Size</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={form.data.weight}
                                        onChange={e => form.setData('weight', e.target.value)}
                                        placeholder="e.g. 50, 1, 500"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Unit Type</label>
                                    <select
                                        className={inputClass}
                                        value={form.data.unit}
                                        onChange={e => form.setData('unit', e.target.value)}
                                    >
                                        {unitTypes.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelClass}>
                                    Product Description <span className="text-[#E20E28]">*</span>
                                </label>
                                <textarea
                                    className={`${inputClass} resize-none ${form.errors.description ? 'border-[#E20E28]' : ''}`}
                                    value={form.data.description}
                                    onChange={e => form.setData('description', e.target.value)}
                                    rows={4}
                                    maxLength={320}
                                    placeholder="Enter product description (max 320 characters)"
                                />
                                <p className="mt-1 text-right text-xs text-[#6B7280]">{form.data.description.length}/320 characters</p>
                                {form.errors.description && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.description}</p>}
                            </div>

                            {/* Author (read-only) */}
                            <div>
                                <label className={labelClass}>Author</label>
                                <input
                                    type="text"
                                    value={authUser ? `${authUser.name} (${authUser.role})` : ''}
                                    readOnly
                                    className={`${inputClass} cursor-not-allowed bg-[#F9FAFB] text-[#6B7280]`}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-[#E5E7EB] px-8 py-4">
                            <button
                                type="button"
                                onClick={nextStep}
                                className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
                            >
                                Next: Images
                            </button>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════
                    STEP 2 — Images
                ════════════════════════════════════════════════ */}
                {currentStep === 2 && (
                    <div className={cardClass}>
                        <div className="border-b border-[#E5E7EB] px-8 py-4">
                            <h2 className="text-sm font-semibold text-[#102059]">Product Images</h2>
                        </div>

                        <div className="space-y-6 px-8 py-6">
                            <p className="text-sm text-[#6B7280]">
                                Upload 5 images of your product and select one to be the primary thumbnail.{' '}
                                <span className="text-[#E20E28]">*</span>
                            </p>

                            {/* 5-slot photo grid */}
                            <div className="grid grid-cols-5 gap-4">
                                {[0, 1, 2, 3, 4].map(index => (
                                    <div key={index} className="relative">
                                        {/* Upload slot */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRefs[index].current?.click()}
                                            className={`flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-all ${
                                                uploadedPhotos[index]
                                                    ? 'border-[#102059] bg-[#F0F2F5]'
                                                    : 'border-[#E5E7EB] hover:border-[#102059] hover:bg-[#F9FAFB]'
                                            }`}
                                        >
                                            {uploadedPhotos[index] ? (
                                                <img
                                                    src={uploadedPhotos[index].preview}
                                                    alt={`Product ${index + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <>
                                                    <Upload className="mb-1 h-6 w-6 text-[#6B7280]" />
                                                    <span className="px-1 text-center text-[10px] leading-tight text-[#6B7280]">
                                                        Upload<br />Photo {index + 1}
                                                    </span>
                                                </>
                                            )}
                                        </button>

                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRefs[index]}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => handlePhotoUpload(index, e)}
                                        />

                                        {/* Star — set primary */}
                                        {uploadedPhotos[index] && (
                                            <button
                                                type="button"
                                                onClick={() => handlePrimaryChange(index)}
                                                title="Set as primary thumbnail"
                                                className={`absolute -right-2 -top-2 rounded-full p-1 shadow-md transition-all ${
                                                    primaryPhotoIndex === index ? 'bg-[#D3A218]' : 'bg-[#6B7280] opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <Star
                                                    className="h-3.5 w-3.5 text-white"
                                                    fill={primaryPhotoIndex === index ? 'white' : 'none'}
                                                />
                                            </button>
                                        )}

                                        {/* Label below slot */}
                                        <p className="mt-2 text-center text-xs font-semibold text-[#6B7280]">
                                            {uploadedPhotos[index] && primaryPhotoIndex === index
                                                ? <span className="text-[#D3A218]">Primary</span>
                                                : `Photo ${index + 1}`
                                            }
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Tip */}
                            <div className="rounded-lg border border-[#102059]/20 bg-[#F0F7FF] p-4">
                                <p className="text-xs text-[#102059]">
                                    <strong>Tip:</strong> The primary thumbnail (marked with a gold star) will be displayed
                                    as the main image in product listings. Click the star icon on any photo to set it as primary.
                                </p>
                            </div>

                            {/* Progress */}
                            <p className={`text-xs font-medium ${uploadedCount === 5 ? 'text-[#00C950]' : 'text-[#F59E0B]'}`}>
                                {uploadedCount === 5
                                    ? '✓ All 5 photos uploaded'
                                    : `${uploadedCount} / 5 photos uploaded`
                                }
                            </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#E5E7EB] px-8 py-4">
                            <button type="button" onClick={prevStep}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB]">
                                Back
                            </button>
                            <button type="button" onClick={nextStep}
                                className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#244693]">
                                Next: Review & Confirm
                            </button>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════
                    STEP 3 — Review & Confirm
                ════════════════════════════════════════════════ */}
                {currentStep === 3 && (
                    <div className={cardClass}>
                        <div className="border-b border-[#E5E7EB] px-8 py-4">
                            <h2 className="text-sm font-semibold text-[#102059]">Review & Confirm</h2>
                        </div>

                        <div className="space-y-6 px-8 py-6">

                            {/* Product info summary */}
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                    Product Information
                                </p>
                                <div className="space-y-3 rounded-lg bg-[#F9FAFB] p-4">
                                    {[
                                        { label: 'Product Name', value: form.data.product_name },
                                        { label: 'Brand',        value: form.data.brand || '—' },
                                        { label: 'Category',     value: form.data.category_id ? getCategoryName(form.data.category_id) : '—' },
                                        { label: 'Sub Category', value: form.data.sub_category_id ? getSubCategoryName(form.data.sub_category_id) : '—' },
                                        { label: 'Unit',         value: form.data.weight ? `${form.data.weight} ${form.data.unit}` : '—' },
                                    ].map(row => (
                                        <div key={row.label} className="flex justify-between text-sm">
                                            <span className="text-[#6B7280]">{row.label}:</span>
                                            <span className="font-semibold text-[#102059]">{row.value}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-[#E5E7EB] pt-3 text-sm">
                                        <span className="block text-[#6B7280]">Description:</span>
                                        <p className="mt-1 text-[#102059]">{form.data.description}</p>
                                    </div>
                                    {authUser && (
                                        <div className="border-t border-[#E5E7EB] pt-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[#6B7280]">Author:</span>
                                                <span className="font-semibold text-[#102059]">{authUser.name} ({authUser.role})</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Images summary */}
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                    Product Images
                                </p>
                                <div className="rounded-lg bg-[#F9FAFB] p-4">
                                    <div className="grid grid-cols-5 gap-3">
                                        {uploadedPhotos.map((photo, index) => (
                                            <div key={index} className="relative">
                                                <div className="aspect-square overflow-hidden rounded-lg border-2 border-[#E5E7EB]">
                                                    {photo && (
                                                        <img src={photo.preview} alt={`Product ${index + 1}`} className="h-full w-full object-cover" />
                                                    )}
                                                </div>
                                                {primaryPhotoIndex === index && photo && (
                                                    <div className="absolute -right-1 -top-1 rounded-full bg-[#D3A218] p-0.5">
                                                        <Star className="h-3 w-3 text-white" fill="white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-xs text-[#6B7280]">Primary thumbnail: Photo {primaryPhotoIndex + 1}</p>
                                </div>
                            </div>

                            {/* Info note */}
                            <div className="rounded-lg border border-[#102059]/20 bg-[#F0F7FF] p-4">
                                <p className="text-xs text-[#102059]">
                                    <strong>Please review all information carefully.</strong> Once submitted, this product will be
                                    added to the platform catalog and become available for vendors to add to their shop inventory.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#E5E7EB] px-8 py-4">
                            <button type="button" onClick={prevStep}
                                className="rounded-lg border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F9FAFB]">
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#244693] disabled:opacity-60"
                            >
                                {form.processing ? 'Submitting…' : 'Submit Product'}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {/* ── Success Modal ── */}
            {showSuccessModal && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/50" />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white">
                            <div className="p-8">
                                <div className="flex flex-col items-center text-center">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00C950]/10">
                                        <CheckCircle className="h-10 w-10 text-[#00C950]" />
                                    </div>
                                    <h3 className="mb-2 text-xl font-bold text-[#102059]">Product Registered Successfully!</h3>
                                    <p className="mb-4 text-sm text-[#6B7280]">
                                        Your product has been successfully added to the platform catalog.
                                    </p>
                                    <div className="mb-6 w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4 text-left">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[#6B7280]">Product:</span>
                                                <span className="font-semibold text-[#102059]">{form.data.product_name}</span>
                                            </div>
                                            {form.data.brand && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#6B7280]">Brand:</span>
                                                    <span className="font-semibold text-[#102059]">{form.data.brand}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[#6B7280]">Status:</span>
                                                <span className="inline-flex items-center rounded-full bg-[#00C950]/10 px-2 py-0.5 text-xs font-semibold text-[#00C950]">Active</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex w-full gap-3">
                                        <button
                                            onClick={() => router.visit('/dashboard/super-admin/products')}
                                            className="flex-1 rounded-lg bg-[#102059] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                                        >
                                            Back to Products
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowSuccessModal(false)
                                                setCurrentStep(1)
                                                setUploadedPhotos([null, null, null, null, null])
                                                setPrimaryPhotoIndex(0)
                                                form.reset()
                                            }}
                                            className="flex-1 rounded-lg border border-[#102059] px-4 py-2.5 text-sm font-semibold text-[#102059] transition-colors hover:bg-[#F0F7FF]"
                                        >
                                            Add Another
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SuperAdminOrAdminLayout>
    )
}

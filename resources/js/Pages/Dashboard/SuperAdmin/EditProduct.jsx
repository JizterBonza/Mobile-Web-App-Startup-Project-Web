import { useState } from 'react'
import { useForm, router } from '@inertiajs/react'
import { ArrowLeft, Check, X, Upload, Star } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../../Layouts/SuperAdminOrAdminLayout'

function getProductsBaseRoute(userType) {
    if (userType === 'admin') return '/dashboard/admin/products'
    return '/dashboard/super-admin/products'
}

function initialPhotoSlots(images = []) {
    return [0, 1, 2, 3, 4].map((index) => (
        images[index]
            ? { preview: images[index], file: null }
            : null
    ))
}

export default function SuperAdminEditProduct({
    auth,
    product,
    categories = [],
    subCategories = [],
}) {
    const productsBase = getProductsBaseRoute(auth?.user?.user_type)

    const [currentStep, setCurrentStep] = useState(1)
    const [errorMessage, setErrorMessage] = useState(null)
    const [uploadedPhotos, setUploadedPhotos] = useState(() => initialPhotoSlots(product.images))
    const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(product.primary_image_index ?? 0)

    const form = useForm({
        brand:               product.brand ?? '',
        product_name:        product.product_name ?? '',
        category_id:         product.category_id ? String(product.category_id) : '',
        sub_category_id:     product.sub_category_id ? String(product.sub_category_id) : '',
        weight:              product.weight != null && product.weight !== '' ? String(product.weight) : '',
        unit:                product.unit || 'kg',
        description:         product.description ?? '',
        status:              product.status === 'inactive' ? 'inactive' : 'active',
        primary_image_index: product.primary_image_index ?? 0,
    })

    const steps = [
        { number: 1, title: 'Product Information' },
        { number: 2, title: 'Images' },
        { number: 3, title: 'Review & Confirm' },
    ]

    const unitTypes = ['kg', 'g', 'mg', 'L', 'mL', 'pieces', 'pack', 'box', 'bottle', 'bag']
    if (form.data.unit && !unitTypes.includes(form.data.unit)) {
        unitTypes.unshift(form.data.unit)
    }

    const handlePhotoUpload = (index, e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const newPhotos = [...uploadedPhotos]
            newPhotos[index] = { preview: reader.result, file }
            setUploadedPhotos(newPhotos)
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handlePrimaryChange = (index) => {
        setPrimaryPhotoIndex(index)
        form.setData('primary_image_index', index)
    }

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
                setErrorMessage(`Please keep or replace all 5 product images. You currently have ${uploadedCount} out of 5.`)
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

    const handleSubmit = (e) => {
        e.preventDefault()
        if (currentStep !== 3) return

        form.transform((data) => {
            const payload = {
                _method: 'PUT',
                brand: data.brand,
                product_name: data.product_name,
                category_id: data.category_id,
                sub_category_id: data.sub_category_id,
                weight: data.weight,
                unit: data.unit,
                description: data.description,
                status: data.status,
                primary_image_index: primaryPhotoIndex,
            }

            const images = {}
            uploadedPhotos.forEach((slot, i) => {
                if (slot?.file) images[i] = slot.file
            })
            if (Object.keys(images).length) {
                payload.images = images
            }

            return payload
        })

        form.post(`${productsBase}/${product.id}`, {
            preserveScroll: true,
            forceFormData: true,
            onError: (errors) => {
                const first = Object.values(errors)[0]
                setErrorMessage(typeof first === 'string' ? first : 'Please fix the highlighted fields.')
                window.scrollTo({ top: 0, behavior: 'smooth' })
            },
        })
    }

    const getCategoryName    = (id) => categories.find(c => String(c.id) === String(id))?.name ?? '—'
    const getSubCategoryName = (id) => subCategories.find(s => String(s.id) === String(id))?.name ?? '—'

    const inputClass = 'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm'
    const labelClass = 'block text-xs text-[#6B7280] mb-2'
    const stepCardClass = 'bg-white rounded-lg border border-[#E5E7EB] p-8'
    const stepHeadingClass = 'text-sm font-semibold text-[#102059] mb-6 pb-4 border-b border-[#E5E7EB]'
    const stepNavClass = 'flex justify-between gap-3 mt-8 pt-6 border-t border-[#E5E7EB]'
    const btnPrimary = 'px-6 py-2.5 bg-[#102059] text-white rounded-lg hover:bg-[#244693] transition-colors text-sm font-medium'
    const btnSecondary = 'px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F9FAFB] transition-colors text-sm font-medium'

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Edit Product">

        <button
            type="button"
            onClick={() => router.visit(`${productsBase}/${product.id}`)}
            className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB] group"
            title="Back to Product"
        >
            <ArrowLeft className="h-5 w-5 text-[#6B7280] group-hover:text-[#102059]" />
        </button>

            <div className="mx-auto max-w-6xl">

            <div className="mb-8">
                <h1 className="mb-2 text-2xl font-semibold text-[#102059]">Edit Product</h1>
                <p className="text-sm text-[#6B7280]">Update this product in the platform catalog.</p>
            </div>

            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex flex-1 items-center">
                            <div className="flex items-center">
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                    currentStep > step.number || currentStep === step.number
                                        ? 'border-[#102059] bg-[#102059]'
                                        : 'border-[#E5E7EB] bg-white'
                                }`}>
                                    {currentStep > step.number
                                        ? <Check className="h-5 w-5 text-white" />
                                        : <span className={`text-sm font-semibold ${currentStep === step.number ? 'text-white' : 'text-[#9CA3AF]'}`}>{step.number}</span>
                                    }
                                </div>
                                <div className="ml-3">
                                    <p className={`text-sm font-semibold ${currentStep >= step.number ? 'text-[#102059]' : 'text-[#9CA3AF]'}`}>
                                        {step.title}
                                    </p>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`mx-4 h-0.5 flex-1 transition-all ${currentStep > step.number ? 'bg-[#102059]' : 'bg-[#E5E7EB]'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {(errorMessage || form.errors.images) && (
                <div className="mb-6 rounded-lg border border-[#E20E28] bg-[#FEE2E2] p-4">
                    <div className="flex items-start gap-3">
                        <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E20E28]" />
                        <div className="flex-1">
                            <p className="mb-1 text-sm font-semibold text-[#E20E28]">Validation Error</p>
                            <p className="text-sm text-[#991B1B]">{errorMessage || form.errors.images}</p>
                        </div>
                        <button type="button" onClick={() => setErrorMessage(null)} className="flex-shrink-0 text-[#E20E28] transition-colors hover:text-[#991B1B]">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {currentStep === 1 && (
                    <div className={stepCardClass}>
                        <h2 className={stepHeadingClass}>Product Information</h2>

                        <div className="space-y-6">

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

                            <div>
                                <label className={labelClass}>Status</label>
                                <select
                                    className={inputClass}
                                    value={form.data.status}
                                    onChange={e => form.setData('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <p className="mt-1 text-xs text-[#6B7280]">
                                    Inactive products stay in the catalog but cannot be added or restocked by Agrivets.
                                </p>
                            </div>

                            <div>
                                <label className={labelClass}>Added by</label>
                                <input
                                    type="text"
                                    value={product.created_by_name || '—'}
                                    readOnly
                                    className={`${inputClass} cursor-not-allowed bg-[#F9FAFB] text-[#6B7280]`}
                                />
                            </div>
                        </div>

                        <div className={`${stepNavClass} justify-end`}>
                            <button type="button" onClick={nextStep} className={btnPrimary}>
                                Next: Images
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className={stepCardClass}>
                        <h2 className={stepHeadingClass}>Product Images</h2>

                        <div className="space-y-6">
                            <p className="text-sm text-[#6B7280]">
                                Keep the existing photos or replace any slot, then select the primary thumbnail.{' '}
                                <span className="text-[#E20E28]">*</span>
                            </p>

                            <div className="grid grid-cols-5 gap-4">
                                {[0, 1, 2, 3, 4].map(index => (
                                    <div key={index} className="relative">
                                        <label
                                            htmlFor={`photo-${index}`}
                                            className={`block aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-all ${
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
                                                <div className="flex h-full flex-col items-center justify-center">
                                                    <Upload className="mb-1 h-6 w-6 text-[#6B7280]" />
                                                    <span className="px-1 text-center text-[10px] text-[#6B7280]">
                                                        Upload<br />Photo {index + 1}
                                                    </span>
                                                </div>
                                            )}
                                            <input
                                                id={`photo-${index}`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => handlePhotoUpload(index, e)}
                                            />
                                        </label>

                                        {uploadedPhotos[index] && (
                                            <button
                                                type="button"
                                                onClick={() => handlePrimaryChange(index)}
                                                title="Set as primary thumbnail"
                                                className={`absolute -top-2 -right-2 rounded-full p-1 shadow-md transition-all ${
                                                    primaryPhotoIndex === index ? 'bg-[#D3A218]' : 'bg-[#6B7280] opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <Star
                                                    className="h-3.5 w-3.5 text-white"
                                                    fill={primaryPhotoIndex === index ? 'white' : 'none'}
                                                />
                                            </button>
                                        )}

                                        <div className="mt-2 text-center">
                                            <span className="text-xs font-semibold text-[#6B7280]">
                                                {uploadedPhotos[index] && primaryPhotoIndex === index
                                                    ? <span className="text-[#D3A218]">Primary</span>
                                                    : uploadedPhotos[index]?.file
                                                        ? `Replace ${index + 1}`
                                                        : `Photo ${index + 1}`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-lg border border-[#102059]/20 bg-[#F0F7FF] p-4">
                                <p className="text-xs text-[#102059]">
                                    <strong>Tip:</strong> Click a photo to replace it. The gold star marks the primary thumbnail shown in product listings.
                                </p>
                            </div>
                        </div>

                        <div className={stepNavClass}>
                            <button type="button" onClick={prevStep} className={btnSecondary}>Back</button>
                            <button type="button" onClick={nextStep} className={btnPrimary}>Next: Review & Confirm</button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className={stepCardClass}>
                        <h2 className={stepHeadingClass}>Review & Confirm</h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                    Product Information
                                </h3>
                                <div className="space-y-3 rounded-lg bg-[#F9FAFB] p-4">
                                    {[
                                        { label: 'Product Name', value: form.data.product_name },
                                        { label: 'Brand',        value: form.data.brand || '—' },
                                        { label: 'Category',     value: form.data.category_id ? getCategoryName(form.data.category_id) : '—' },
                                        { label: 'Sub Category', value: form.data.sub_category_id ? getSubCategoryName(form.data.sub_category_id) : '—' },
                                        { label: 'Unit',         value: form.data.weight ? `${form.data.weight} ${form.data.unit}` : '—' },
                                        { label: 'Status',       value: form.data.status === 'active' ? 'Active' : 'Inactive' },
                                    ].map(row => (
                                        <div key={row.label} className="flex justify-between">
                                            <span className="text-sm text-[#6B7280]">{row.label}:</span>
                                            <span className="text-sm font-semibold text-[#102059]">{row.value}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-[#E5E7EB] pt-2">
                                        <span className="mb-1 block text-sm text-[#6B7280]">Description:</span>
                                        <p className="text-sm text-[#102059]">{form.data.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                                    Product Images
                                </h3>
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
                                                    <div className="absolute -top-1 -right-1 rounded-full bg-[#D3A218] p-0.5">
                                                        <Star className="h-3 w-3 text-white" fill="white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-xs text-[#6B7280]">Primary thumbnail: Photo {primaryPhotoIndex + 1}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#102059]/20 bg-[#F0F7FF] p-4">
                                <p className="text-xs text-[#102059]">
                                    <strong>Please review all information carefully.</strong> Saving will update this product in the platform catalog.
                                </p>
                            </div>
                        </div>

                        <div className={stepNavClass}>
                            <button type="button" onClick={prevStep} className={btnSecondary}>Back</button>
                            <button type="submit" disabled={form.processing} className={`${btnPrimary} disabled:opacity-60`}>
                                {form.processing ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            </div>
        </SuperAdminOrAdminLayout>
    )
}

import { useEffect, useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Star, X } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

const SEX_OPTIONS = ['Not yet determined', 'Male', 'Female']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

function initialPhotoSlots(images = []) {
    return [0, 1, 2, 3, 4].map((index) => (
        images[index] ? { preview: images[index], file: null } : null
    ))
}

function formatHatchDate(value) {
    if (!value) return 'N/A'
    const [year, month, day] = String(value).split('-')
    if (!year || !month || !day) return 'N/A'
    return `${month}/${day}/${year}`
}

function lookupName(items, id) {
    return items.find((item) => String(item.id) === String(id))?.name ?? '—'
}

export default function RegisterGamefowl({ auth, bloodlines = [], ageTypes = [], classes = [], gamefowl = null }) {
    const base = gamefowlBase(auth?.user?.user_type)
    const isEdit = Boolean(gamefowl?.id)

    const [currentStep, setCurrentStep] = useState(1)
    const [errorMessage, setErrorMessage] = useState(null)
    const [uploadedPhotos, setUploadedPhotos] = useState(() => initialPhotoSlots(gamefowl?.images))
    const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(gamefowl?.primary_image_index ?? 0)

    const form = useForm({
        name: gamefowl?.name ?? '',
        bloodline_id: gamefowl?.bloodline_id ? String(gamefowl.bloodline_id) : '',
        age_type_id: gamefowl?.age_type_id ? String(gamefowl.age_type_id) : '',
        class_id: gamefowl?.class_id ? String(gamefowl.class_id) : '',
        sex: gamefowl?.sex ?? '',
        hatch_date: gamefowl?.hatch_date ?? '',
        description: gamefowl?.description ?? '',
        primary_image_index: gamefowl?.primary_image_index ?? 0,
    })

    const steps = [
        { number: 1, title: 'Gamefowl Details' },
        { number: 2, title: 'Images' },
        { number: 3, title: 'Review & Confirmation' },
    ]

    useEffect(() => {
        const messages = Object.values(form.errors).filter((message) => typeof message === 'string')
        if (!messages.length) return
        setErrorMessage(messages[0])
        setCurrentStep(form.errors.images ? 2 : 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [form.errors])

    const inputClass = 'w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#102059]'
    const labelClass = 'mb-2 block text-sm font-semibold text-[#111827]'

    const handlePhotoUpload = (index, event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setErrorMessage('Only JPG and PNG images are supported.')
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        if (file.size > MAX_IMAGE_BYTES) {
            setErrorMessage('Each image must be 5MB or smaller.')
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setErrorMessage(null)
        const preview = URL.createObjectURL(file)
        setUploadedPhotos((current) => {
            const next = [...current]
            if (next[index]?.preview?.startsWith('blob:')) URL.revokeObjectURL(next[index].preview)
            next[index] = { preview, file }
            return next
        })
    }

    const handlePrimaryChange = (index) => {
        setPrimaryPhotoIndex(index)
        form.setData('primary_image_index', index)
    }

    const nextStep = () => {
        setErrorMessage(null)

        if (currentStep === 1) {
            const missing = []
            if (!form.data.bloodline_id) missing.push('Bloodline Category')
            if (!form.data.name.trim()) missing.push('Bloodline Composition')
            if (!form.data.age_type_id) missing.push('Age Type')
            if (!form.data.sex) missing.push('Sex')
            if (!form.data.class_id) missing.push('Class')
            if (missing.length) {
                setErrorMessage(`Please fill in: ${missing.join(', ')}.`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        if (currentStep === 2) {
            const uploadedCount = uploadedPhotos.filter(Boolean).length
            if (uploadedCount < 5) {
                setErrorMessage(`Please upload all 5 gamefowl images. You have uploaded ${uploadedCount} out of 5.`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
            if (!uploadedPhotos[primaryPhotoIndex]) {
                const first = uploadedPhotos.findIndex(Boolean)
                setPrimaryPhotoIndex(first)
                form.setData('primary_image_index', first)
            }
        }

        setCurrentStep((step) => step + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const prevStep = () => {
        setErrorMessage(null)
        setCurrentStep((step) => step - 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        if (currentStep !== 3) return

        form.transform((data) => {
            const payload = {
                name: data.name,
                bloodline_id: data.bloodline_id,
                age_type_id: data.age_type_id,
                class_id: data.class_id,
                sex: data.sex,
                hatch_date: data.hatch_date,
                description: data.description,
                primary_image_index: primaryPhotoIndex,
            }

            if (isEdit) payload._method = 'put'

            const images = {}
            uploadedPhotos.forEach((slot, index) => {
                if (slot?.file) images[index] = slot.file
            })
            if (!isEdit || Object.keys(images).length) payload.images = images

            return payload
        })

        form.post(isEdit ? `${base}/${gamefowl.id}` : base, {
            preserveScroll: true,
            forceFormData: true,
        })
    }

    const reviewRows = [
        { label: 'Bloodline Category', value: lookupName(bloodlines, form.data.bloodline_id) },
        { label: 'Bloodline Composition', value: form.data.name || '—' },
        { label: 'Age Type', value: lookupName(ageTypes, form.data.age_type_id) },
        { label: 'Sex', value: form.data.sex || '—' },
        { label: 'Hatch Date', value: formatHatchDate(form.data.hatch_date) },
        { label: 'Class', value: lookupName(classes, form.data.class_id) },
    ]

    return (
        <SuperAdminOrAdminLayout auth={auth} title={isEdit ? 'Edit Gamefowl' : 'Register Gamefowl'}>
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex flex-wrap items-center gap-y-3">
                    {steps.map((step, index) => {
                        const reached = currentStep >= step.number
                        return (
                            <div key={step.number} className="flex items-center">
                                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${reached ? 'bg-[#455CAE] text-white' : 'bg-[#EBEBF2] text-[#A3A3A8]'}`}>
                                    {step.number}
                                </div>
                                <span className={`ml-2 whitespace-nowrap text-sm font-medium ${reached ? 'text-[#455CAE]' : 'text-[#A3A3A8]'}`}>
                                    {step.title}
                                </span>
                                {index < steps.length - 1 && <div className="mx-4 h-px w-16 bg-[#E8E8EB] sm:w-24" />}
                            </div>
                        )
                    })}
                </div>

                {errorMessage && (
                    <div className="mb-6 rounded-lg border border-[#E20E28] bg-[#FEE2E2] p-4">
                        <div className="flex items-start gap-3">
                            <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E20E28]" />
                            <p className="flex-1 text-sm text-[#991B1B]">{errorMessage}</p>
                            <button type="button" onClick={() => setErrorMessage(null)} className="text-[#E20E28]">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {currentStep === 1 && (
                        <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                            <h1 className="text-lg font-semibold text-[#111827]">General Information</h1>
                            <p className="mt-1 mb-8 text-sm text-[#6B7280]">
                                {isEdit ? 'Update this gamefowl catalog entry.' : 'Create a new gamefowl catalog'}
                            </p>

                            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Bloodline Category</label>
                                    <select className={inputClass} value={form.data.bloodline_id} onChange={(event) => form.setData('bloodline_id', event.target.value)}>
                                        <option value="">Select bloodline category</option>
                                        {bloodlines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                    {form.errors.bloodline_id && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.bloodline_id}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Bloodline Composition</label>
                                    <input
                                        className={inputClass}
                                        value={form.data.name}
                                        onChange={(event) => form.setData('name', event.target.value)}
                                        placeholder="Enter bloodline composition"
                                    />
                                    {form.errors.name && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.name}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Age Type</label>
                                    <select className={inputClass} value={form.data.age_type_id} onChange={(event) => form.setData('age_type_id', event.target.value)}>
                                        <option value="">Select age type</option>
                                        {ageTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                    {form.errors.age_type_id && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.age_type_id}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Sex</label>
                                    <select className={inputClass} value={form.data.sex} onChange={(event) => form.setData('sex', event.target.value)}>
                                        <option value="">Select sex</option>
                                        {SEX_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                    {form.errors.sex && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.sex}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Hatch Date (Optional)</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={form.data.hatch_date}
                                        onChange={(event) => form.setData('hatch_date', event.target.value)}
                                    />
                                    {form.errors.hatch_date && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.hatch_date}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Class</label>
                                    <select className={inputClass} value={form.data.class_id} onChange={(event) => form.setData('class_id', event.target.value)}>
                                        <option value="">Select class</option>
                                        {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                    {form.errors.class_id && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.class_id}</p>}
                                </div>
                            </div>

                            <div className="mt-10 flex items-center justify-between">
                                <button type="button" onClick={() => router.visit(isEdit ? `${base}/${gamefowl.id}` : base)} className="rounded-lg border border-[#102059] bg-white px-5 py-2.5 text-sm font-medium text-[#102059] hover:bg-[#F0F7FF]">
                                    Cancel
                                </button>
                                <button type="button" onClick={nextStep} className="rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#244693]">
                                    Next: Images
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                            <h1 className="text-lg font-semibold text-[#111827]">Gamefowl Images</h1>
                            <p className="mt-1 mb-8 text-sm text-[#6B7280]">
                                Upload 5 images of your gamefowl and select one to be the primary thumbnail.
                            </p>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                {[0, 1, 2, 3, 4].map((index) => (
                                    <div key={index} className="relative">
                                        <label
                                            htmlFor={`gamefowl-photo-${index}`}
                                            className={`flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-[#F8FAFC] px-3 text-center transition-colors ${
                                                uploadedPhotos[index] ? 'border-[#102059]' : 'border-[#CBD5E1] hover:border-[#102059]'
                                            }`}
                                        >
                                            {uploadedPhotos[index] ? (
                                                <img src={uploadedPhotos[index].preview} alt={`Gamefowl ${index + 1}`} className="h-full w-full object-cover" />
                                            ) : (
                                                <span>
                                                    <span className="block text-sm font-semibold text-[#111827]">Upload your images</span>
                                                    <span className="mt-1 block text-xs leading-5 text-[#6B7280]">Supports JPG, PNG. Max 5MB per image.</span>
                                                </span>
                                            )}
                                            <input
                                                id={`gamefowl-photo-${index}`}
                                                type="file"
                                                accept="image/jpeg,image/png"
                                                className="hidden"
                                                onChange={(event) => handlePhotoUpload(index, event)}
                                            />
                                        </label>
                                        {uploadedPhotos[index] && (
                                            <button
                                                type="button"
                                                onClick={() => handlePrimaryChange(index)}
                                                title="Set as primary thumbnail"
                                                className={`absolute top-2 right-2 rounded-full p-1.5 shadow-md ${
                                                    primaryPhotoIndex === index ? 'bg-[#D3A218]' : 'bg-[#6B7280]/80 hover:bg-[#6B7280]'
                                                }`}
                                            >
                                                <Star className="h-3.5 w-3.5 text-white" fill={primaryPhotoIndex === index ? 'white' : 'none'} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {form.errors.images && <p className="mt-3 text-xs text-[#E20E28]">{form.errors.images}</p>}

                            <div className="mt-6 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
                                <span className="font-semibold">Tip:</span> The primary thumbnail (marked with a gold star) will be displayed as the main image in product listings. Click the star icon on any photo to set it as primary.
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <button type="button" onClick={prevStep} className="rounded-lg border border-[#102059] bg-white px-5 py-2.5 text-sm font-medium text-[#102059] hover:bg-[#F0F7FF]">
                                    Back
                                </button>
                                <button type="button" onClick={nextStep} className="rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#244693]">
                                    Next: Review
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                            <h1 className="text-lg font-semibold text-[#111827]">Gamefowl Images</h1>
                            <p className="mt-1 mb-8 text-sm text-[#6B7280]">
                                {isEdit ? 'Update this gamefowl catalog entry.' : 'Create a new gamefowl catalog'}
                            </p>

                            <h2 className="mb-3 text-xs font-bold tracking-wide text-[#111827]">GAMEFOWL INFORMATION</h2>
                            <div className="overflow-hidden rounded-lg border border-[#EEF0F4] bg-[#F8FAFC]">
                                {reviewRows.map((row) => (
                                    <div key={row.label} className="flex items-center justify-between gap-4 border-b border-[#EEF0F4] px-5 py-3.5">
                                        <span className="text-sm text-[#6B7280]">{row.label}:</span>
                                        <span className="text-right text-sm font-medium text-[#111827]">{row.value}</span>
                                    </div>
                                ))}
                                <div className="px-5 py-3.5">
                                    <p className="text-sm text-[#6B7280]">Description</p>
                                    {form.data.description ? <p className="mt-1 text-sm text-[#111827]">{form.data.description}</p> : null}
                                </div>
                            </div>

                            <h2 className="mt-8 mb-3 text-xs font-bold tracking-wide text-[#111827]">GAMEFOWL IMAGES</h2>
                            <div className="rounded-lg border border-[#EEF0F4] bg-[#F8FAFC] p-4">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                    {uploadedPhotos.map((photo, index) => (
                                        <div key={index} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#E5E7EB]">
                                            {photo && <img src={photo.preview} alt={`Gamefowl ${index + 1}`} className="h-full w-full object-cover" />}
                                            {photo && primaryPhotoIndex === index && (
                                                <div className="absolute top-2 right-2 rounded-full bg-[#D3A218] p-1.5">
                                                    <Star className="h-3.5 w-3.5 text-white" fill="white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 border-t border-[#EEF0F4] pt-3">
                                    <p className="text-sm text-[#6B7280]">Description</p>
                                </div>
                            </div>

                            <div className="mt-6 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
                                Please review all information carefully.
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <button type="button" onClick={prevStep} className="rounded-lg border border-[#102059] bg-white px-5 py-2.5 text-sm font-medium text-[#102059] hover:bg-[#F0F7FF]">
                                    Back
                                </button>
                                <button type="submit" disabled={form.processing} className="rounded-lg bg-[#102059] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#244693] disabled:opacity-50">
                                    {form.processing ? 'Submitting...' : isEdit ? 'Save Changes' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </SuperAdminOrAdminLayout>
    )
}

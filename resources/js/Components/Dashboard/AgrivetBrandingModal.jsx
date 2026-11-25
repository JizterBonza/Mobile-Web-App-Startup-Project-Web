import { useEffect, useState } from 'react'
import { useForm } from '@inertiajs/react'
import { Upload, X } from 'lucide-react'
import { storageUrl } from '../../utils/storageUrl'

function ImageField({ id, label, hint, preview, error, onChange }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-[#102059]" htmlFor={id}>
                {label}
            </label>
            <div
                className={`rounded-lg border-2 border-dashed bg-[#F8F9FB] p-4 text-center transition-colors hover:border-[#244693] ${
                    error ? 'border-[#E20E28]' : 'border-[#E5E7EB]'
                }`}
            >
                <input
                    id={id}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={onChange}
                />
                <label htmlFor={id} className="block cursor-pointer">
                    {preview ? (
                        <div>
                            <img
                                src={preview}
                                alt={`${label} preview`}
                                className={`mx-auto mb-3 rounded-lg object-cover ${
                                    label === 'Logo' ? 'h-28 w-28' : 'aspect-[4/1] w-full'
                                }`}
                            />
                            <p className="text-xs text-[#6B7280]">Click to change {label.toLowerCase()}</p>
                        </div>
                    ) : (
                        <div className="py-6">
                            <Upload className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" />
                            <p className="mb-1 text-sm text-[#6B7280]">Upload {label.toLowerCase()}</p>
                            <p className="text-xs text-[#9CA3AF]">{hint}</p>
                        </div>
                    )}
                </label>
            </div>
            {error && <p className="mt-2 text-xs text-[#E20E28]">{error}</p>}
        </div>
    )
}

export default function AgrivetBrandingModal({ open, onClose, logoUrl, bannerUrl }) {
    const form = useForm({
        logo: null,
        banner: null,
    })
    const [logoPreview, setLogoPreview] = useState(null)
    const [bannerPreview, setBannerPreview] = useState(null)

    useEffect(() => {
        if (open) return undefined
        form.reset()
        form.clearErrors()
        setLogoPreview(null)
        setBannerPreview(null)
        return undefined
        // Reset only when the modal closes. form identity changes every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    if (!open) return null

    const readPreview = (file, setPreview) => {
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handleFile = (field, setPreview) => (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        form.setData(field, file)
        form.clearErrors(field)
        readPreview(file, setPreview)
    }

    const submit = (event) => {
        event.preventDefault()
        if (!form.data.logo && !form.data.banner) {
            form.setError('logo', 'Choose a logo or a banner to upload.')
            return
        }

        form.post('/dashboard/owner-manager/branding', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onClose(),
        })
    }

    const logoSrc = logoPreview || storageUrl(logoUrl)
    const bannerSrc = bannerPreview || storageUrl(bannerUrl)
    const canSave = Boolean(form.data.logo || form.data.banner)

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#102059]">Update logo and banner</h3>
                        <p className="mt-1 text-sm text-[#6B7280]">
                            The logo appears on every store. The banner is your agrivet profile image.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F2F5] text-[#65676B] transition-colors hover:bg-[#E5E7EB]"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={submit}>
                    <div className="grid gap-5 p-6 md:grid-cols-2">
                        <ImageField
                            id="owner_manager_logo"
                            label="Logo"
                            hint="PNG, JPG, WEBP up to 5MB"
                            preview={logoSrc}
                            error={form.errors.logo}
                            onChange={handleFile('logo', setLogoPreview)}
                        />
                        <ImageField
                            id="owner_manager_banner"
                            label="Banner"
                            hint="PNG, JPG, WEBP up to 10MB"
                            preview={bannerSrc}
                            error={form.errors.banner}
                            onChange={handleFile('banner', setBannerPreview)}
                        />
                    </div>

                    <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[#E5E7EB] bg-white px-6 py-4">
                        <button
                            type="button"
                            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#65676B] transition-colors hover:bg-[#F9FAFB]"
                            onClick={onClose}
                            disabled={form.processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a3570] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canSave || form.processing}
                        >
                            {form.processing ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

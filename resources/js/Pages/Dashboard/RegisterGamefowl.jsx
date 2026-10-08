import { useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { ArrowLeft } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

export default function RegisterGamefowl({ auth, bloodlines = [], ageTypes = [], classes = [], gamefowl = null }) {
    const base = gamefowlBase(auth?.user?.user_type)
    const isEdit = Boolean(gamefowl?.id)
    const [photos, setPhotos] = useState([])

    const form = useForm({
        name: gamefowl?.name ?? '',
        bloodline_id: gamefowl?.bloodline_id ?? '',
        age_type_id: gamefowl?.age_type_id ?? '',
        class_id: gamefowl?.class_id ?? '',
        description: gamefowl?.description ?? '',
        primary_image_index: gamefowl?.primary_image_index ?? 0,
        images: [],
    })

    const inputClass = 'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102059] focus:border-transparent text-sm'
    const labelClass = 'block text-xs text-[#6B7280] mb-2'

    const handlePhotos = (event) => {
        const files = Array.from(event.target.files || []).slice(0, 5)
        setPhotos(files.map((file) => ({ file, preview: URL.createObjectURL(file) })))
        form.setData('images', files)
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        const options = { forceFormData: true, preserveScroll: true }
        if (isEdit) {
            form.transform((data) => ({ ...data, _method: 'put' }))
            form.post(`${base}/${gamefowl.id}`, options)
            return
        }
        form.post(base, options)
    }

    return (
        <SuperAdminOrAdminLayout auth={auth} title={isEdit ? 'Edit Gamefowl' : 'Register Gamefowl'}>
            <button
                type="button"
                onClick={() => router.visit(base)}
                className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-3 transition-all hover:bg-[#F9FAFB]"
                title="Back to Gamefowl Catalog"
            >
                <ArrowLeft className="h-5 w-5 text-[#6B7280]" />
            </button>

            <div className="mx-auto max-w-3xl">
                <div className="mb-8">
                    <h1 className="mb-2 text-2xl font-semibold text-[#102059]">
                        {isEdit ? 'Edit Gamefowl' : 'Register New Gamefowl'}
                    </h1>
                    <p className="text-sm text-[#6B7280]">
                        {isEdit ? 'Update this gamefowl in the platform catalog.' : 'Add a new gamefowl to the platform catalog.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="rounded-lg border border-[#E5E7EB] bg-white p-8">
                    <h2 className="mb-6 border-b border-[#E5E7EB] pb-4 text-sm font-semibold text-[#102059]">Gamefowl Information</h2>

                    <div className="space-y-5">
                        <div>
                            <label className={labelClass}>Gamefowl Name *</label>
                            <input className={inputClass} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                            {form.errors.name && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.name}</p>}
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            <div>
                                <label className={labelClass}>Bloodline Category</label>
                                <select className={inputClass} value={form.data.bloodline_id} onChange={(event) => form.setData('bloodline_id', event.target.value)}>
                                    <option value="">Select bloodline</option>
                                    {bloodlines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                {form.errors.bloodline_id && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.bloodline_id}</p>}
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
                                <label className={labelClass}>Class</label>
                                <select className={inputClass} value={form.data.class_id} onChange={(event) => form.setData('class_id', event.target.value)}>
                                    <option value="">Select class</option>
                                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                {form.errors.class_id && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.class_id}</p>}
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea className={inputClass} rows={4} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                            {form.errors.description && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.description}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Images {isEdit ? '(optional, replaces current photos)' : '(optional, up to 5)'}</label>
                            <input type="file" accept="image/*" multiple className={inputClass} onChange={handlePhotos} />
                            {form.errors.images && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.images}</p>}
                            {photos.length > 0 && (
                                <div className="mt-3 grid grid-cols-5 gap-2">
                                    {photos.map((photo, index) => (
                                        <button
                                            key={photo.preview}
                                            type="button"
                                            onClick={() => form.setData('primary_image_index', index)}
                                            className={`overflow-hidden rounded-lg border-2 ${form.data.primary_image_index === index ? 'border-[#102059]' : 'border-[#E5E7EB]'}`}
                                        >
                                            <img src={photo.preview} alt="" className="aspect-square w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-[#E5E7EB] pt-6">
                        <button type="button" onClick={() => router.visit(base)} className="rounded-lg border border-[#E5E7EB] bg-white px-6 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]">
                            Cancel
                        </button>
                        <button type="submit" disabled={form.processing} className="rounded-lg bg-[#102059] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#244693] disabled:opacity-50">
                            {form.processing ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Gamefowl'}
                        </button>
                    </div>
                </form>
            </div>
        </SuperAdminOrAdminLayout>
    )
}

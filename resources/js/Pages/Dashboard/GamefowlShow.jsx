import { Link } from '@inertiajs/react'
import { ArrowLeft, Package, Pencil } from 'lucide-react'
import SuperAdminOrAdminLayout from '../../Layouts/SuperAdminOrAdminLayout'

function gamefowlBase(userType) {
    return userType === 'admin' ? '/dashboard/admin/gamefowls' : '/dashboard/super-admin/gamefowls'
}

function formatHatchDate(value) {
    if (!value) return 'N/A'
    const [year, month, day] = String(value).split('-')
    if (!year || !month || !day) return 'N/A'
    return `${month}/${day}/${year}`
}

export default function GamefowlShow({ auth, gamefowl, flash }) {
    const base = gamefowlBase(auth?.user?.user_type)
    const photos = gamefowl.images ?? []
    const primary = photos[gamefowl.primary_image_index] ?? photos[0]

    return (
        <SuperAdminOrAdminLayout auth={auth} title="Gamefowl Detail">
            {flash?.success && (
                <div className="mb-4 rounded-lg border border-[#00C950]/30 bg-[#00C950]/10 px-4 py-3">
                    <p className="text-sm font-medium text-[#00C950]">{flash.success}</p>
                </div>
            )}

            <div className="mb-5 flex items-center justify-between gap-3">
                <Link href={base} className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#102059]">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Gamefowl Catalog
                </Link>
                <Link href={`${base}/${gamefowl.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-4 py-2 text-sm font-medium text-white hover:bg-[#244693]">
                    <Pencil className="h-4 w-4" />
                    Edit
                </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="flex aspect-square items-center justify-center bg-[#F0F2F5]">
                        {primary ? (
                            <img src={primary} alt={gamefowl.name} className="h-full w-full object-cover" />
                        ) : (
                            <Package className="h-20 w-20 text-[#D1D5DB]" />
                        )}
                    </div>
                    <div className="space-y-4 p-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Gamefowl</p>
                            <h1 className="mt-1 text-2xl font-semibold text-[#102059]">{gamefowl.name}</h1>
                        </div>
                        <dl className="space-y-3 text-sm">
                            {[
                                ['Bloodline Category', gamefowl.bloodline_name],
                                ['Age Type', gamefowl.age_type_name],
                                ['Sex', gamefowl.sex],
                                ['Hatch Date', formatHatchDate(gamefowl.hatch_date)],
                                ['Class', gamefowl.class_name],
                                ['Status', gamefowl.status === 'active' ? 'Active' : gamefowl.status],
                                ['Added by', gamefowl.created_by_name],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4 border-b border-[#F3F4F6] pb-2">
                                    <dt className="text-[#6B7280]">{label}</dt>
                                    <dd className="font-semibold text-[#102059]">{value || '—'}</dd>
                                </div>
                            ))}
                        </dl>
                        <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Description</p>
                            <p className="text-sm text-[#102059]">{gamefowl.description || '—'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminOrAdminLayout>
    )
}

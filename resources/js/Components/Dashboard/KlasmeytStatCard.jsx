import { Link } from '@inertiajs/react'

export function KlasmeytStatCard({ label, value, iconClass, href }) {
    const body = (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">{label}</p>
                    <p className="mt-2 truncate text-2xl font-semibold text-[#102059] sm:text-3xl">{value}</p>
                </div>
                <div className="shrink-0 rounded-xl bg-gradient-to-br from-[#F8F9FB] to-[#EEF2FF] p-3 text-[#102059]">
                    <i className={`${iconClass} text-lg sm:text-xl`} />
                </div>
            </div>
            {href && (
                <p className="mt-4 text-sm font-medium text-[#E20E28]">
                    View details <i className="fas fa-arrow-right ml-1 text-xs" />
                </p>
            )}
        </div>
    )

    if (href) {
        return (
            <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102059] focus-visible:ring-offset-2 rounded-2xl">
                {body}
            </Link>
        )
    }

    return body
}

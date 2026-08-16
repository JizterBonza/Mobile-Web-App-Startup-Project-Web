import { useMemo, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import { FileMinus, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import AdminKlasmeytLayout from '../Layouts/AdminKlasmeytLayout'
import SuperAdminKlasmeytLayout from '../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../hooks/useDashboardSession'

const INITIAL_CONTENTS = [
    {
        id: 1,
        title: 'Recognizing Newcastle Disease Before it Spreads',
        description: 'Newcastle disease can wipe out a flock in days. Learn the early warning signs now.',
        category: 'Health',
        status: 'published',
        publishedAt: 'August 10, 2026',
    },
]

function formatPublishedDate(date = new Date()) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

export default function Klasrum({ auth }) {
    useDashboardSession()
    const [contents, setContents] = useState(INITIAL_CONTENTS)
    const Layout = auth?.user?.user_type === 'admin' ? AdminKlasmeytLayout : SuperAdminKlasmeytLayout

    const togglePublish = (id) => {
        setContents((items) =>
            items.map((item) => {
                if (item.id !== id) {
                    return item
                }
                const nextStatus = item.status === 'published' ? 'draft' : 'published'
                return {
                    ...item,
                    status: nextStatus,
                    publishedAt: nextStatus === 'published' ? formatPublishedDate() : item.publishedAt,
                }
            }),
        )
    }

    const deleteContent = (id) => {
        if (!window.confirm('Delete this content?')) {
            return
        }
        setContents((items) => items.filter((item) => item.id !== id))
    }

    const sortedContents = useMemo(() => contents, [contents])

    return (
        <Layout auth={auth} title="Klasrum">
            <div className="w-full">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1
                            className="mb-2 text-2xl font-semibold text-[#102059]"
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            Klasrum
                        </h1>
                        <p className="text-sm text-[#6B7280]">Create and publish contents with ease.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => router.visit('/klasrum/new')}
                            className="flex items-center gap-2 bg-[#102059] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                            style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '0.6rem' }}
                        >
                            <Plus className="h-4 w-4" />
                            New Content
                        </button>
                    </div>
                </div>

                <h2 className="mb-5 text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.75rem]">
                    Manage Contents
                </h2>

                {sortedContents.length === 0 ? (
                    <div className="max-w-md rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-16 text-center">
                        <p className="text-sm font-medium text-[#6B7280]">No contents yet.</p>
                        <Link
                            href="/klasrum/new"
                            className="mt-3 inline-block text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                            Create your first content
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sortedContents.map((item) => {
                            const isPublished = item.status === 'published'
                            return (
                                <article
                                    key={item.id}
                                    className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <FileText className="mt-0.5 h-4 w-4 text-[#9CA3AF]" />
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                isPublished
                                                    ? 'bg-[#DCFCE7] text-[#15803D]'
                                                    : 'bg-[#F3F4F6] text-[#6B7280]'
                                            }`}
                                        >
                                            {isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold leading-snug text-[#111827]">{item.title}</h3>
                                    {item.description ? (
                                        <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">
                                            {item.description}
                                        </p>
                                    ) : null}
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#4B5563]">
                                            {item.category}
                                        </span>
                                        <span className="text-xs text-[#9CA3AF]">
                                            {isPublished ? `Published: ${item.publishedAt}` : 'Not published'}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-[#F3F4F6] pt-3">
                                        <div className="flex items-center gap-8">
                                            <Link
                                                href="/klasrum/new"
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5563] transition-colors hover:text-[#111827]"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => togglePublish(item.id)}
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5563] transition-colors hover:text-[#111827]"
                                            >
                                                <FileMinus className="h-4 w-4" />
                                                {isPublished ? 'Unpublish' : 'Publish'}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => deleteContent(item.id)}
                                            className="rounded-md p-1.5 text-[#9CA3AF] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                                            aria-label="Delete content"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </Layout>
    )
}

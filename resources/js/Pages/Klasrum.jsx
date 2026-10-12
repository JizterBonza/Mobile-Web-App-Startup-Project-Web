import { Link, router, usePage } from '@inertiajs/react'
import { BookOpen, Clock, FileMinus, FileText, MoreHorizontal, Pencil, Plus, Rss, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { FollowButton, PostSocial } from '../Components/Klasrum/PostSocial'
import AdminKlasmeytLayout from '../Layouts/AdminKlasmeytLayout'
import OwnerManagerKlasmeytLayout from '../Layouts/OwnerManagerKlasmeytLayout'
import SuperAdminKlasmeytLayout from '../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../hooks/useDashboardSession'
import { storageUrl } from '../utils/storageUrl'

function authorInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    if (parts.length === 0) {
        return 'K'
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase()
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function layoutFor(userType) {
    if (userType === 'admin') {
        return AdminKlasmeytLayout
    }
    if (userType === 'owner_manager') {
        return OwnerManagerKlasmeytLayout
    }
    return SuperAdminKlasmeytLayout
}

const FEATURES = [
    { id: 'articles', label: 'Articles', icon: FileText },
    { id: 'newsfeed', label: 'Newsfeed', icon: Rss },
]

function initialFeature() {
    if (typeof window === 'undefined') {
        return 'articles'
    }

    return new URLSearchParams(window.location.search).get('tab') === 'newsfeed' ? 'newsfeed' : 'articles'
}

export default function Klasrum({ auth, contents = [], posts = [], canManage = false, canCreatePost = false }) {
    useDashboardSession()
    const { flash } = usePage().props
    const Layout = layoutFor(auth?.user?.user_type)
    const [feature, setFeature] = useState(initialFeature)
    const [openMenuId, setOpenMenuId] = useState(null)

    const selectFeature = (id) => {
        setFeature(id)
        const url = new URL(window.location.href)
        if (id === 'articles') {
            url.searchParams.delete('tab')
        } else {
            url.searchParams.set('tab', id)
        }
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }

    const togglePublish = (id) => {
        router.post(`/klasrum/${id}/toggle-publish`)
    }

    const deleteContent = (id, label = 'content') => {
        if (!window.confirm(`Delete this ${label}?`)) {
            return
        }
        router.delete(`/klasrum/${id}`)
    }

    return (
        <Layout auth={auth} title="Klasrum">
            <div className="w-full">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
                        <BookOpen className="h-8 w-8 text-[#2563EB]" aria-hidden="true" />
                        <h1
                            className="text-2xl font-semibold leading-none text-[#102059]"
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            Klasrum
                        </h1>
                        <p className="col-start-2 mt-1 text-sm text-[#6B7280]">
                            {canManage
                                ? 'Create and publish contents with ease.'
                                : 'Read articles and news posts.'}
                        </p>
                    </div>
                    <div
                        role="tablist"
                        aria-label="Klasrum features"
                        className="inline-flex w-fit items-center gap-1 self-start rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-sm sm:self-auto"
                    >
                        {FEATURES.map((tab) => {
                            const active = feature === tab.id
                            const Icon = tab.icon

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => selectFeature(tab.id)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                        active
                                            ? 'bg-[#102059] text-white'
                                            : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {flash?.success ? (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        {flash.success}
                    </div>
                ) : null}
                {flash?.error ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                        {flash.error}
                    </div>
                ) : null}

                {feature === 'articles' ? (
                <>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.75rem]">
                        {canManage ? 'Manage Contents' : 'Articles'}
                    </h2>
                    {canManage ? (
                    <button
                        type="button"
                        onClick={() => router.visit('/klasrum/new')}
                        className="flex w-fit items-center gap-2 bg-[#102059] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                        style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '0.6rem' }}
                    >
                        <Plus className="h-4 w-4" />
                        New Content
                    </button>
                    ) : null}
                </div>

                {contents.length === 0 ? (
                    <div className="max-w-md rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-16 text-center">
                        <p className="text-sm font-medium text-[#6B7280]">
                            {canManage ? 'No contents yet.' : 'No articles yet.'}
                        </p>
                        {canManage ? (
                        <Link
                            href="/klasrum/new"
                            className="mt-3 inline-block text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                            Create your first content
                        </Link>
                        ) : null}
                    </div>
                ) : canManage ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {contents.map((item) => {
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
                                        {item.category ? (
                                            <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#4B5563]">
                                                {item.category}
                                            </span>
                                        ) : null}
                                        <span className="text-xs text-[#9CA3AF]">
                                            {isPublished && item.publishedAt
                                                ? `Published: ${item.publishedAt}`
                                                : 'Not published'}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-[#F3F4F6] pt-3">
                                        <div className="flex items-center gap-8">
                                            <Link
                                                href={`/klasrum/${item.id}/edit`}
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
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {contents.map((item) => (
                            <Link
                                key={item.id}
                                href={`/klasrum/articles/${item.id}`}
                                className="block rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-colors hover:border-[#BFDBFE]"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <FileText className="mt-0.5 h-4 w-4 text-[#9CA3AF]" />
                                    <span className="text-xs text-[#9CA3AF]">
                                        {item.publishedAt ? `Published: ${item.publishedAt}` : 'Published'}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold leading-snug text-[#111827]">{item.title}</h3>
                                {item.description ? (
                                    <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">{item.description}</p>
                                ) : null}
                                {item.category ? (
                                    <span className="mt-3 inline-flex rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#4B5563]">
                                        {item.category}
                                    </span>
                                ) : null}
                            </Link>
                        ))}
                    </div>
                )}
                </>
                ) : (
                    <div>
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.75rem]">
                                Newsfeed
                            </h2>
                            {canCreatePost ? (
                            <button
                                type="button"
                                onClick={() => router.visit('/klasrum/posts/new')}
                                className="flex w-fit items-center gap-2 bg-[#102059] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                                style={{ fontFamily: 'Inter Condensed, sans-serif', borderRadius: '0.6rem' }}
                            >
                                <Plus className="h-4 w-4" />
                                New Post
                            </button>
                            ) : null}
                        </div>

                        {posts.length === 0 ? (
                            <div className="max-w-md rounded-xl border border-dashed border-[#D1D5DB] bg-white px-6 py-16 text-center">
                                <Rss className="mx-auto h-6 w-6 text-[#9CA3AF]" />
                                <p className="mt-3 text-sm font-medium text-[#6B7280]">No news posts yet.</p>
                                {canCreatePost ? (
                                <Link
                                    href="/klasrum/posts/new"
                                    className="mt-3 inline-block text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                                >
                                    Create your first post
                                </Link>
                                ) : null}
                            </div>
                        ) : (
                            <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
                                {posts.map((item) => {
                                    const isPublished = item.status === 'published'
                                    const mediaUrl = storageUrl(item.mediaUrl)
                                    const card = (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <Link
                                                    href={`/klasrum/posts/${item.id}`}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-xs font-semibold text-[#6D28D9]"
                                                >
                                                    {authorInitials(item.authorName)}
                                                </Link>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-[#2563EB]" style={{ marginBottom: '0px' }}>
                                                        <Link href={`/klasrum/posts/${item.id}`} className="hover:underline">
                                                            {item.authorName}
                                                        </Link>
                                                        {item.canFollow ? (
                                                            <FollowButton authorId={item.authorId} following={item.isFollowing} />
                                                        ) : null}
                                                    </p>
                                                    <Link
                                                        href={`/klasrum/posts/${item.id}`}
                                                        className="mt-0.5 flex items-center gap-1 text-xs text-[#9CA3AF]"
                                                        style={{ marginTop: '0px' }}
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        <span>{item.postedLabel || 'Just now'}</span>
                                                        {!isPublished ? (
                                                            <span className="ml-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 font-semibold text-[#6B7280]">
                                                                Draft
                                                            </span>
                                                        ) : null}
                                                    </Link>
                                                </div>
                                                {canManage ? (
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            aria-label="Post actions"
                                                            aria-expanded={openMenuId === item.id}
                                                            onClick={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
                                                            className="rounded-md p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#4B5563]"
                                                        >
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </button>
                                                        {openMenuId === item.id ? (
                                                            <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                                                                <Link
                                                                    href={`/klasrum/posts/${item.id}/edit`}
                                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB]"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                    Edit
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuId(null)
                                                                        togglePublish(item.id)
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F9FAFB]"
                                                                >
                                                                    <FileMinus className="h-4 w-4" />
                                                                    {isPublished ? 'Unpublish' : 'Publish'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuId(null)
                                                                        deleteContent(item.id, 'post')
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEF2F2]"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <Link href={`/klasrum/posts/${item.id}`} className="mt-3 block">
                                                <h3 className="text-base font-bold text-[#111827]">{item.title}</h3>
                                                {item.body ? (
                                                    <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{item.body}</p>
                                                ) : null}
                                                <div className="mt-3 overflow-hidden rounded-lg bg-[#D1D5DB]">
                                                    <div className="aspect-[16/9] w-full">
                                                        {mediaUrl && item.mediaIsVideo ? (
                                                            <video src={mediaUrl} className="h-full w-full object-contain" />
                                                        ) : mediaUrl ? (
                                                            <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </Link>
                                            <PostSocial
                                                className="mt-3"
                                                postId={item.id}
                                                canEngage={item.canEngage}
                                                reactionCount={item.reactionCount}
                                                reacted={item.reacted}
                                                comments={item.comments}
                                            />
                                        </>
                                    )

                                    return (
                                        <article
                                            key={item.id}
                                            className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                                        >
                                            {card}
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    )
}

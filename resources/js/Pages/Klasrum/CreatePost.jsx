import { useEffect, useRef, useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Save, Upload, X } from 'lucide-react'
import axios from 'axios'
import AdminKlasmeytLayout from '../../Layouts/AdminKlasmeytLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'
import { storageUrl } from '../../utils/storageUrl'

const MAX_MEDIA_FILES = 15
const MAX_MEDIA_BYTES = 20 * 1024 * 1024

const fieldClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] shadow-none focus:border-[#102059] focus:outline-none focus:ring-1 focus:ring-[#102059]'

function readCookie(name) {
    const escaped = name.replace(/([.$?*|{}()[\]/+^])/g, '\\$1')
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
}

function csrfToken(sharedToken) {
    return sharedToken
        || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        || ''
}

async function uploadKlasrumMedia(file, sharedToken) {
    const token = csrfToken(sharedToken)
    const xsrf = readCookie('XSRF-TOKEN')
    const formData = new FormData()
    if (token) {
        formData.append('_token', token)
    }
    formData.append('media', file)

    try {
        const { data } = await axios.post('/klasrum/media', formData, {
            withCredentials: true,
            withXSRFToken: true,
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
            },
        })
        return data?.data
    } catch (error) {
        const status = error.response?.status
        const payload = error.response?.data
        const message = payload?.errors?.media?.[0] || payload?.message

        if (status === 419) {
            throw new Error('Your session expired. Please refresh the page and try again.')
        }
        if (status === 413) {
            throw new Error('This file is too large to upload.')
        }
        throw new Error(message || 'Failed to upload media.')
    }
}

function revokeMediaUrl(url) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url)
    }
}

function PostPreview({ title, body, mediaItems }) {
    const [active, setActive] = useState(0)

    useEffect(() => {
        setActive((current) => {
            if (!mediaItems.length) {
                return 0
            }
            return Math.min(current, mediaItems.length - 1)
        })
    }, [mediaItems])

    const item = mediaItems[active] ?? mediaItems[0]
    const showControls = mediaItems.length > 1

    const goTo = (index) => {
        setActive((index + mediaItems.length) % mediaItems.length)
    }

    return (
        <article className="rounded-xl bg-white px-6 py-8 sm:px-10 sm:py-10">
            <h2 className="text-2xl font-bold leading-tight text-[#111827] sm:text-3xl">
                {title.trim() || 'Untitled'}
            </h2>
            {body.trim() ? (
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-[#111827]">{body}</p>
            ) : null}
            {item ? (
                <div className="mt-8">
                    <div className="relative">
                        <div className="overflow-hidden rounded-xl bg-[#D1D5DB]">
                            <div className="aspect-video w-full">
                                {item.isVideo ? (
                                    <video key={item.id} src={item.url} controls className="h-full w-full object-contain" />
                                ) : (
                                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                                )}
                            </div>
                        </div>
                        {showControls ? (
                            <>
                                <button
                                    type="button"
                                    aria-label="Previous media"
                                    onClick={() => goTo(active - 1)}
                                    className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md"
                                >
                                    <ChevronLeft className="h-5 w-5 text-[#6B7280]" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next media"
                                    onClick={() => goTo(active + 1)}
                                    className="absolute right-0 top-1/2 z-10 flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md"
                                >
                                    <ChevronRight className="h-5 w-5 text-[#6B7280]" />
                                </button>
                            </>
                        ) : null}
                    </div>
                    {showControls ? (
                        <div className="mt-3 flex items-center justify-center gap-1.5">
                            {mediaItems.map((entry, index) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    aria-label={`Show media ${index + 1}`}
                                    onClick={() => goTo(index)}
                                    className={
                                        index === active
                                            ? 'h-1.5 w-6 rounded-full bg-[#22C55E]'
                                            : 'h-1.5 w-1.5 rounded-full bg-[#D1D5DB]'
                                    }
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </article>
    )
}

function initialMedia(post) {
    if (!Array.isArray(post?.media)) {
        return []
    }

    return post.media
        .filter((item) => item?.url || item?.path)
        .map((item, index) => ({
            id: `saved-${item.path || index}`,
            url: storageUrl(item.url) || storageUrl(item.path),
            isVideo: Boolean(item.is_video) || item.type === 'video',
            path: item.path || null,
        }))
        .filter((item) => item.url)
}

export default function CreatePost({ auth, post = null }) {
    useDashboardSession()
    const { errors, csrf_token } = usePage().props
    const Layout = auth?.user?.user_type === 'admin' ? AdminKlasmeytLayout : SuperAdminKlasmeytLayout
    const mediaInputRef = useRef(null)
    const [title, setTitle] = useState(post?.title ?? '')
    const [body, setBody] = useState(post?.body ?? '')
    const [mediaItems, setMediaItems] = useState(() => initialMedia(post))
    const [processing, setProcessing] = useState(false)
    const [processingLabel, setProcessingLabel] = useState('Saving...')
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        setTitle(post?.title ?? '')
        setBody(post?.body ?? '')
        setMediaItems((current) => {
            current.forEach((item) => revokeMediaUrl(item.url))
            return initialMedia(post)
        })
    }, [post?.id])

    const mediaItemsRef = useRef(mediaItems)
    mediaItemsRef.current = mediaItems
    useEffect(() => {
        return () => {
            mediaItemsRef.current.forEach((item) => revokeMediaUrl(item.url))
        }
    }, [])

    const addMediaFiles = (fileList) => {
        const incoming = Array.from(fileList || []).filter(
            (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
        )
        if (!incoming.length) {
            return
        }

        const oversized = incoming.filter((file) => file.size > MAX_MEDIA_BYTES)
        const allowed = incoming.filter((file) => file.size <= MAX_MEDIA_BYTES)
        if (oversized.length) {
            window.alert('Each image or video must be 20 MB or smaller.')
        }
        if (!allowed.length) {
            return
        }

        setMediaItems((current) => {
            const room = MAX_MEDIA_FILES - current.length
            if (room <= 0) {
                window.alert(`You can upload up to ${MAX_MEDIA_FILES} files.`)
                return current
            }
            if (allowed.length > room) {
                window.alert(`You can upload up to ${MAX_MEDIA_FILES} files.`)
            }
            const next = allowed.slice(0, room).map((file) => ({
                id: `new-${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
                url: URL.createObjectURL(file),
                isVideo: file.type.startsWith('video/'),
                file,
            }))
            return [...current, ...next]
        })
    }

    const removeMediaItem = (id) => {
        setMediaItems((current) => {
            const target = current.find((item) => item.id === id)
            if (target) {
                revokeMediaUrl(target.url)
            }
            return current.filter((item) => item.id !== id)
        })
    }

    const submit = async (status) => {
        if (processing) {
            return
        }

        setProcessing(true)
        setProcessingLabel(status === 'published' ? 'Posting...' : 'Saving...')

        let preparedMedia = mediaItems
        const pending = mediaItems.filter((item) => item.file && !item.path)
        if (pending.length) {
            try {
                const uploaded = []
                for (const item of mediaItems) {
                    if (item.path || !item.file) {
                        uploaded.push(item)
                        continue
                    }
                    const saved = await uploadKlasrumMedia(item.file, csrf_token)
                    uploaded.push({
                        ...item,
                        path: saved?.path,
                        file: null,
                    })
                }
                preparedMedia = uploaded.filter((item) => item.path)
                setMediaItems(preparedMedia)
            } catch (error) {
                setProcessing(false)
                setProcessingLabel('Saving...')
                window.alert(error?.message || 'Failed to upload media.')
                return
            }
        }

        const formData = new FormData()
        const token = csrfToken(csrf_token)
        if (token) {
            formData.append('_token', token)
        }
        formData.append('title', title)
        formData.append('body', body)
        formData.append('status', status)
        formData.append(
            'keep_media',
            JSON.stringify(preparedMedia.filter((item) => item.path).map((item) => item.path))
        )

        const url = post?.id ? `/klasrum/posts/${post.id}` : '/klasrum/posts'
        router.post(url, formData, {
            forceFormData: true,
            onFinish: () => {
                setProcessing(false)
                setProcessingLabel('Saving...')
            },
        })
    }

    const mediaError = errors?.media
        || Object.entries(errors || {}).find(([key]) => key === 'media' || key.startsWith('media.'))?.[1]
    const atLimit = mediaItems.length >= MAX_MEDIA_FILES

    return (
        <Layout auth={auth} title={post?.id ? 'Edit Post' : 'Create Post'}>
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/klasrum?tab=newsfeed"
                            className="rounded-lg bg-[#F3F4F6] p-2.5 text-[#4B5563] transition-colors hover:bg-[#E5E7EB]"
                            aria-label="Back to Newsfeed"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#111827]">{post?.id ? 'Edit Post' : 'Create Post'}</h1>
                            <p className="text-sm text-[#6B7280]">Share an update, photo, or video with your followers</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            type="button"
                            onClick={() => submit('draft')}
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB] disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {processing ? processingLabel : 'Save Draft'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPreview((current) => !current)}
                            aria-pressed={showPreview}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium"
                            style={
                                showPreview
                                    ? { border: '1px solid #60A5FA', color: '#2563EB' }
                                    : { border: '1px solid #E5E7EB', color: '#4B5563' }
                            }
                        >
                            <Eye className="h-4 w-4" style={{ color: showPreview ? '#2563EB' : '#4B5563' }} />
                            <span style={{ color: showPreview ? '#2563EB' : '#4B5563' }}>Preview</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => submit('published')}
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-60"
                        >
                            <Eye className="h-4 w-4" />
                            {processing ? processingLabel : 'Post'}
                        </button>
                    </div>
                </div>

                {(errors?.title || errors?.body || mediaError) ? (
                    <p className="mb-4 text-sm text-[#DC2626]">{errors?.title || errors?.body || mediaError}</p>
                ) : null}

                {showPreview ? (
                    <PostPreview title={title} body={body} mediaItems={mediaItems} />
                ) : null}

                <div className={showPreview ? 'hidden' : 'space-y-4'}>
                    <input
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Title"
                        className={fieldClass}
                    />
                    <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="Write your content here..."
                        rows={8}
                        className={`${fieldClass} min-h-[180px] resize-y`}
                    />
                </div>

                <section className={showPreview ? 'hidden' : 'mt-8 border-t border-[#E5E7EB] pt-6'}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2 className="text-base font-bold text-[#111827]">Additional Media</h2>
                        <p className="text-xs text-[#9CA3AF]">Optional</p>
                    </div>
                    <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                            addMediaFiles(event.target.files)
                            event.target.value = ''
                        }}
                    />
                    {mediaItems.length === 0 ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#E5E7EB] px-6 py-14 text-center">
                            <p className="text-sm font-medium text-[#6B7280]">Upload image or video</p>
                            <p className="mt-1 text-xs text-[#9CA3AF]">Select up to {MAX_MEDIA_FILES} files</p>
                            <button
                                type="button"
                                onClick={() => mediaInputRef.current?.click()}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#102059] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244693]"
                            >
                                <Upload className="h-4 w-4" />
                                Select files
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#E5E7EB] p-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {mediaItems.map((item) => (
                                    <div key={item.id} className="relative overflow-hidden rounded-lg bg-white">
                                        <div className="aspect-video">
                                            {item.isVideo ? (
                                                <video src={item.url} className="h-full w-full object-contain" />
                                            ) : (
                                                <img src={item.url} alt="" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        {item.isVideo ? (
                                            <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                                                Video
                                            </span>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => removeMediaItem(item.id)}
                                            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                                            aria-label="Remove file"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {!atLimit ? (
                                    <button
                                        type="button"
                                        onClick={() => mediaInputRef.current?.click()}
                                        className="flex aspect-video flex-col items-center justify-center rounded-lg border border-dashed border-[#9CA3AF] bg-white/70 text-[#6B7280] transition-colors hover:bg-white"
                                    >
                                        <Upload className="mb-1 h-5 w-5" />
                                        <span className="text-xs font-medium">Add files</span>
                                    </button>
                                ) : null}
                            </div>
                            <p className="mt-3 text-center text-xs text-[#6B7280]">
                                {mediaItems.length} of {MAX_MEDIA_FILES} files
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    )
}

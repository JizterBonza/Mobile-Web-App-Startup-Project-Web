import { useEffect, useRef, useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import {
    ArrowLeft,
    Bold,
    ChevronLeft,
    ChevronRight,
    Eye,
    Italic,
    List,
    ListOrdered,
    Pencil,
    Plus,
    Save,
    Trash2,
    Underline,
    Upload,
    X,
} from 'lucide-react'
import AdminKlasmeytLayout from '../../Layouts/AdminKlasmeytLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'
import { storageUrl } from '../../utils/storageUrl'

const fieldClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] shadow-none ring-0 focus:border-[#102059] focus:outline-none focus:ring-1 focus:ring-[#102059]'

function actionButtonClass(active = false) {
    if (active) {
        return 'inline-flex items-center gap-2 rounded-lg border border-[#93C5FD] bg-white px-3.5 py-2 text-sm font-medium text-[#2563EB] transition-colors'
    }
    return 'inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB]'
}

const editorListClass =
    '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1'

const MAX_MEDIA_FILES = 15
const MAX_MEDIA_BYTES = 20 * 1024 * 1024

function csrfHeaders() {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
    }
}

async function uploadKlasrumMedia(file) {
    const formData = new FormData()
    formData.append('media', file)
    const response = await fetch('/klasrum/media', {
        method: 'POST',
        headers: csrfHeaders(),
        credentials: 'same-origin',
        body: formData,
    })

    let payload = null
    try {
        payload = await response.json()
    } catch {
        payload = null
    }

    if (!response.ok) {
        const message = payload?.errors?.media?.[0]
            || payload?.message
            || (response.status === 413
                ? 'This file is too large to upload.'
                : 'Failed to upload media.')
        throw new Error(message)
    }

    return payload?.data
}

function initialMediaItems(content) {
    if (Array.isArray(content?.media) && content.media.length > 0) {
        return content.media
            .filter((item) => item?.url || item?.path)
            .map((item, index) => ({
                id: `saved-${item.path || index}`,
                url: storageUrl(item.url) || storageUrl(item.path),
                isVideo: Boolean(item.is_video) || item.type === 'video',
                path: item.path || null,
            }))
            .filter((item) => item.url)
    }

    const url = storageUrl(content?.media_url)
    if (!url) {
        return []
    }

    return [
        {
            id: 'saved-legacy',
            url,
            isVideo: Boolean(content?.media_is_video),
            path: null,
        },
    ]
}

function revokeMediaUrl(url) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url)
    }
}

function placeCaretIn(node) {
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
}

function ensureEditorSelection(editor) {
    editor.focus()
    const selection = window.getSelection()
    const anchorInEditor = selection.anchorNode && editor.contains(selection.anchorNode)
    if (selection.rangeCount && anchorInEditor) {
        return
    }
    if (!editor.innerHTML.trim() || editor.innerHTML === '<br>') {
        editor.innerHTML = '<p><br></p>'
    }
    const target = editor.querySelector('li, p, div') || editor
    placeCaretIn(target)
}

function wrapSelectionAsList(editor, ordered) {
    const tag = ordered ? 'ol' : 'ul'
    const selection = window.getSelection()
    const selectedText = selection.toString()
    const itemHtml = selectedText ? selectedText.split('\n').map((line) => `<li>${line || '<br>'}</li>`).join('') : '<li><br></li>'
    document.execCommand('insertHTML', false, `<${tag}>${itemHtml}</${tag}>`)
    const list = editor.querySelector(`${tag}:last-of-type`)
    const lastItem = list?.querySelector('li:last-child')
    if (lastItem) {
        placeCaretIn(lastItem)
    }
}

function applyFormat(command, editor) {
    if (!editor) {
        return
    }
    ensureEditorSelection(editor)
    const isList = command === 'insertUnorderedList' || command === 'insertOrderedList'
    const ordered = command === 'insertOrderedList'
    if (isList) {
        const applied = document.execCommand(command, false, null)
        const tag = ordered ? 'ol' : 'ul'
        if (!applied || !editor.querySelector(tag)) {
            wrapSelectionAsList(editor, ordered)
        }
        return
    }
    document.execCommand(command, false, null)
}

function PreviewArticle({
    category,
    title,
    description,
    heading,
    bodyHtml,
    coverPreview,
    mediaItems = [],
    caption,
}) {
    const hasBody = Boolean(bodyHtml && bodyHtml.replace(/<[^>]*>/g, '').trim())

    return (
        <article className="rounded-xl bg-white">
            <div className="overflow-hidden rounded-t-xl">
                <div className="aspect-video w-full bg-[#D1D5DB]">
                    {coverPreview ? (
                        <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                    ) : null}
                </div>
            </div>
            <div className="px-6 py-8 sm:px-10 sm:py-10">
                {category ? (
                    <span className="mb-4 inline-flex rounded-full bg-[#9CA3AF] px-3 py-1 text-xs font-medium text-white">
                        {category}
                    </span>
                ) : null}
                <h2 className="mt-2 text-2xl font-bold leading-tight text-[#111827] sm:text-3xl">
                    {title || 'Untitled'}
                </h2>
                {description ? (
                    <p className="mt-4 text-base leading-relaxed text-[#374151]">{description}</p>
                ) : null}
                <MediaHero items={mediaItems} caption={caption} />
                {heading ? (
                    <h3 className="mt-8 text-xl font-bold leading-snug text-[#111827]">{heading}</h3>
                ) : null}
                {hasBody ? (
                    <div
                        className={`mt-4 space-y-4 text-base leading-relaxed text-[#111827] [&_p]:mb-4 [&_p:last-child]:mb-0 ${editorListClass}`}
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                ) : null}
            </div>
        </article>
    )
}

function MediaHero({ items = [], caption }) {
    const [active, setActive] = useState(0)
    const videoRef = useRef(null)

    useEffect(() => {
        setActive((current) => {
            if (!items.length) {
                return 0
            }
            return Math.min(current, items.length - 1)
        })
    }, [items])

    if (!items.length) {
        return null
    }

    const item = items[active] ?? items[0]
    const showControls = items.length > 1

    const goTo = (index) => {
        videoRef.current?.pause()
        setActive((index + items.length) % items.length)
    }

    return (
        <div className="mt-8">
            <div className="relative">
                <div className="overflow-hidden rounded-xl bg-[#D1D5DB]">
                    <div className="aspect-video w-full">
                        {item.isVideo ? (
                            <video
                                key={item.id}
                                ref={videoRef}
                                src={item.url}
                                controls
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <img src={item.url} alt={caption || ''} className="h-full w-full object-cover" />
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
                <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Additional media">
                    {items.map((entry, index) => (
                        <button
                            key={entry.id}
                            type="button"
                            role="tab"
                            aria-selected={index === active}
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
            {caption ? (
                <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{caption}</p>
            ) : null}
        </div>
    )
}

function MediaDropzone({
    inputRef,
    accept,
    previewUrl,
    isVideo,
    title,
    hint,
    onChange,
    onClear,
}) {
    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={onChange}
            />
            {previewUrl ? (
                <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F3F4F6]">
                    {isVideo ? (
                        <video src={previewUrl} controls className="max-h-72 w-full object-contain" />
                    ) : (
                        <img src={previewUrl} alt="" className="aspect-video w-full object-cover" />
                    )}
                    <div className="flex justify-end gap-2 border-t border-[#E5E7EB] bg-white px-3 py-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="text-sm font-medium text-[#4B5563] hover:text-[#111827]"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-sm font-medium text-[#DC2626] hover:text-[#B91C1C]"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F3F4F6] px-6 py-14 text-center transition-colors hover:bg-[#EEEFF2]"
                >
                    <Upload className="mb-3 h-6 w-6 text-[#9CA3AF]" />
                    <p className="text-sm font-medium text-[#6B7280]">{title}</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">{hint}</p>
                </button>
            )}
        </div>
    )
}

function AdditionalMediaPicker({ inputRef, items, onAddFiles, onRemove }) {
    const atLimit = items.length >= MAX_MEDIA_FILES

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => {
                    onAddFiles(event.target.files)
                    event.target.value = ''
                }}
            />
            {items.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl bg-[#E5E7EB] px-6 py-14 text-center">
                    <p className="text-sm font-medium text-[#6B7280]">Upload image or video</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Select up to {MAX_MEDIA_FILES} files</p>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1F2937]"
                    >
                        <Upload className="h-4 w-4" />
                        Select files
                    </button>
                </div>
            ) : (
                <div className="rounded-xl bg-[#E5E7EB] p-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {items.map((item) => (
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
                                    onClick={() => onRemove(item.id)}
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
                                onClick={() => inputRef.current?.click()}
                                className="flex aspect-video flex-col items-center justify-center rounded-lg border border-dashed border-[#9CA3AF] bg-white/70 text-[#6B7280] transition-colors hover:bg-white"
                            >
                                <Upload className="mb-1 h-5 w-5" />
                                <span className="text-xs font-medium">Add files</span>
                            </button>
                        ) : null}
                    </div>
                    <p className="mt-3 text-center text-xs text-[#6B7280]">
                        {items.length} of {MAX_MEDIA_FILES} files
                    </p>
                </div>
            )}
        </div>
    )
}

export default function ContentBuilder({ auth, content = null, categories = [] }) {
    useDashboardSession()
    const { errors, flash } = usePage().props
    const Layout = auth?.user?.user_type === 'admin' ? AdminKlasmeytLayout : SuperAdminKlasmeytLayout
    const coverInputRef = useRef(null)
    const mediaInputRef = useRef(null)
    const bodyRef = useRef(null)

    const [category, setCategory] = useState(content?.category_id ? String(content.category_id) : '')
    const selectedCategory = categories.find((item) => String(item.id) === String(category)) ?? null
    const selectedCategoryName = selectedCategory?.name ?? ''
    const [title, setTitle] = useState(content?.title ?? '')
    const [description, setDescription] = useState(content?.description ?? '')
    const [heading, setHeading] = useState(content?.heading ?? '')
    const [caption, setCaption] = useState(content?.caption ?? '')
    const [coverPreview, setCoverPreview] = useState(storageUrl(content?.cover_url) ?? null)
    const [mediaItems, setMediaItems] = useState(() => initialMediaItems(content))
    const [coverFile, setCoverFile] = useState(null)
    const [removeCover, setRemoveCover] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [bodyHtml, setBodyHtml] = useState(content?.body ?? '')
    const [processing, setProcessing] = useState(false)
    const [processingLabel, setProcessingLabel] = useState('Saving...')
    const [categoryModal, setCategoryModal] = useState(null)
    const [categoryName, setCategoryName] = useState('')
    const [categorySaving, setCategorySaving] = useState(false)

    const savedMediaKey = Array.isArray(content?.media)
        ? content.media.map((item) => item.path || item.url || '').join('|')
        : (content?.media_url || '')

    useEffect(() => {
        if (bodyRef.current && content?.body) {
            bodyRef.current.innerHTML = content.body
        }
        setCoverPreview(storageUrl(content?.cover_url) ?? null)
        setMediaItems((current) => {
            current.forEach((item) => revokeMediaUrl(item.url))
            return initialMediaItems(content)
        })
    }, [content?.id, content?.body, content?.cover_url, savedMediaKey, content?.media_is_video])

    const mediaItemsRef = useRef(mediaItems)
    mediaItemsRef.current = mediaItems
    useEffect(() => {
        return () => {
            mediaItemsRef.current.forEach((item) => revokeMediaUrl(item.url))
        }
    }, [])

    const readFile = (file, setter, isVideoSetter) => {
        if (!file) {
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            setter(reader.result)
            isVideoSetter?.(file.type.startsWith('video/'))
        }
        reader.readAsDataURL(file)
    }

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

    const togglePreview = () => {
        if (!showPreview) {
            setBodyHtml(bodyRef.current?.innerHTML || '')
        }
        setShowPreview((current) => !current)
    }

    const openCreateCategory = () => {
        setCategoryName('')
        setCategoryModal('create')
    }

    const openEditCategory = () => {
        if (!selectedCategory) {
            return
        }
        setCategoryName(selectedCategory.name)
        setCategoryModal('edit')
    }

    const closeCategoryModal = () => {
        setCategoryModal(null)
        setCategoryName('')
    }

    const saveCategory = (event) => {
        event.preventDefault()
        const name = categoryName.trim()
        if (!name) {
            return
        }

        const options = {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setCategorySaving(true),
            onFinish: () => setCategorySaving(false),
            onSuccess: (page) => {
                if (categoryModal === 'create') {
                    const list = page.props.categories || []
                    const match = list.find((item) => item.name.toLowerCase() === name.toLowerCase())
                    if (match) {
                        setCategory(String(match.id))
                    }
                }
                closeCategoryModal()
            },
        }

        if (categoryModal === 'edit' && category) {
            router.put(`/klasrum/categories/${category}`, { name }, options)
            return
        }

        router.post('/klasrum/categories', { name }, options)
    }

    const deleteCategory = () => {
        if (!selectedCategory) {
            return
        }

        const count = selectedCategory.contents_count ?? 0
        const message = count > 0
            ? `"${selectedCategory.name}" is used by ${count} article${count === 1 ? '' : 's'}. It will be hidden from the list, but existing articles will keep this category. Continue?`
            : `Delete category "${selectedCategory.name}"?`

        if (!window.confirm(message)) {
            return
        }

        router.delete(`/klasrum/categories/${selectedCategory.id}`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                if (!content?.id || String(content.category_id) !== String(selectedCategory.id)) {
                    setCategory('')
                }
            },
        })
    }

    const submit = async (status) => {
        const body = bodyRef.current?.innerHTML || bodyHtml || ''
        if (status === 'published' && !title.trim()) {
            window.alert('Please add a title before publishing.')
            return
        }
        if (processing) {
            return
        }

        setProcessing(true)
        let preparedMedia = mediaItems
        const pendingUploads = mediaItems.filter((item) => item.file && !item.path)
        if (pendingUploads.length) {
            try {
                const nextItems = [...mediaItems]
                let uploadedCount = 0
                for (let index = 0; index < nextItems.length; index += 1) {
                    const item = nextItems[index]
                    if (!item.file || item.path) {
                        continue
                    }
                    uploadedCount += 1
                    setProcessingLabel(`Uploading media ${uploadedCount} of ${pendingUploads.length}...`)
                    const uploaded = await uploadKlasrumMedia(item.file)
                    if (!uploaded?.path) {
                        throw new Error('Failed to upload media.')
                    }
                    const previousUrl = item.url
                    nextItems[index] = {
                        id: item.id,
                        url: storageUrl(uploaded?.url) || item.url,
                        isVideo: Boolean(uploaded?.is_video) || item.isVideo,
                        path: uploaded?.path,
                    }
                    setMediaItems([...nextItems])
                    if (previousUrl && previousUrl !== nextItems[index].url) {
                        revokeMediaUrl(previousUrl)
                    }
                }
                preparedMedia = nextItems.filter((item) => item.path)
                setMediaItems(preparedMedia)
            } catch (error) {
                setProcessing(false)
                setProcessingLabel('Saving...')
                window.alert(error?.message || 'Failed to upload media.')
                return
            }
        }

        const formData = new FormData()
        formData.append('category_id', category)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('heading', heading)
        formData.append('caption', caption)
        formData.append('body', body)
        formData.append('status', status)
        if (coverFile) {
            formData.append('cover', coverFile)
        }
        formData.append(
            'keep_media',
            JSON.stringify(preparedMedia.filter((item) => item.path).map((item) => item.path))
        )
        if (removeCover) {
            formData.append('remove_cover', '1')
        }

        setProcessingLabel(status === 'published' ? 'Publishing...' : 'Saving...')
        const url = content?.id ? `/klasrum/${content.id}` : '/klasrum'
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

    return (
        <Layout auth={auth} title="Content Builder">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-8 flex items-start gap-3">
                    <Link
                        href="/klasrum"
                        className="rounded-lg border border-[#E5E7EB] bg-white p-2.5 transition-colors hover:bg-[#F9FAFB]"
                        aria-label="Back to Klasrum"
                    >
                        <ArrowLeft className="h-5 w-5 text-[#6B7280]" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <h1
                            className="mb-1 text-2xl font-semibold text-[#111827]"
                            style={{ fontFamily: 'Inter Condensed, sans-serif' }}
                        >
                            Content Builder
                        </h1>
                        <p className="text-sm text-[#6B7280]">Fill in the sections top to bottom, then publish.</p>
                        {flash?.success ? (
                            <p className="mt-2 text-sm text-emerald-700">{flash.success}</p>
                        ) : null}
                        {(flash?.error || errors?.title || errors?.cover || mediaError) && (
                            <p className="mt-2 text-sm text-[#DC2626]">
                                {flash?.error || errors?.title || errors?.cover || mediaError}
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => submit('draft')}
                                disabled={processing}
                                className={actionButtonClass()}
                            >
                                <Save className="h-4 w-4" />
                                {processing ? processingLabel : 'Save Draft'}
                            </button>
                            <button
                                type="button"
                                onClick={togglePreview}
                                aria-pressed={showPreview}
                                className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium"
                                style={
                                    showPreview
                                        ? { border: '1px solid #60A5FA', color: '#2563EB' }
                                        : { border: '1px solid #E5E7EB', color: '#4B5563' }
                                }
                            >
                                <Eye
                                    className="h-4 w-4"
                                    style={{ color: showPreview ? '#2563EB' : '#4B5563' }}
                                />
                                <span style={{ color: showPreview ? '#2563EB' : '#4B5563' }}>Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => submit('published')}
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-60"
                            >
                                <Eye className="h-4 w-4" />
                                {processing ? processingLabel : 'Publish'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={showPreview ? 'hidden' : 'space-y-8'}>
                    <section>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2 className="text-base font-bold text-[#111827]">Cover</h2>
                            <p className="text-xs text-[#9CA3AF]">16:9 · 1920 × 1080 px recommended</p>
                        </div>
                        <MediaDropzone
                            inputRef={coverInputRef}
                            accept="image/png,image/jpeg"
                            previewUrl={coverPreview}
                            title="Click to upload cover image"
                            hint="PNG or JPG, auto-cropped to 16:9."
                            onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (!file) {
                                    return
                                }
                                setCoverFile(file)
                                setRemoveCover(false)
                                readFile(file, setCoverPreview)
                            }}
                            onClear={() => {
                                setCoverFile(null)
                                setCoverPreview(null)
                                setRemoveCover(true)
                                if (coverInputRef.current) {
                                    coverInputRef.current.value = ''
                                }
                            }}
                        />
                    </section>

                    <section className="flex flex-col">
                        <div className="mb-8">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label htmlFor="klasrum-category" className="text-sm font-medium text-[#374151]">
                                    Category
                                </label>
                                <button
                                    type="button"
                                    onClick={openCreateCategory}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#102059] hover:text-[#244693]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    id="klasrum-category"
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value)}
                                    className={`${fieldClass} flex-1`}
                                >
                                    <option value="">Select category</option>
                                    {categories.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedCategory ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={openEditCategory}
                                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[#4B5563] transition-colors hover:bg-[#F9FAFB]"
                                            aria-label="Edit category"
                                            title="Edit category"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={deleteCategory}
                                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
                                            aria-label="Delete category"
                                            title="Delete category"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : null}
                            </div>
                            {errors?.category_id ? (
                                <p className="mt-1 text-sm text-[#DC2626]">{errors.category_id}</p>
                            ) : null}
                        </div>
                        <div className="mb-8">
                            <input
                                type="text"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Title"
                                className={fieldClass}
                            />
                        </div>
                        <div className="mb-8">
                            <textarea
                                rows={4}
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Description"
                                className={fieldClass}
                            />
                        </div>
                        <div className="mb-8">
                            <input
                                type="text"
                                value={heading}
                                onChange={(event) => setHeading(event.target.value)}
                                placeholder="Heading"
                                className={fieldClass}
                            />
                        </div>
                        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                            <div className="flex items-center gap-1 border-b border-[#E5E7EB] px-2 py-1.5">
                                {[
                                    { label: 'Bold', command: 'bold', Icon: Bold },
                                    { label: 'Italic', command: 'italic', Icon: Italic },
                                    { label: 'Underline', command: 'underline', Icon: Underline },
                                    { label: 'Bulleted list', command: 'insertUnorderedList', Icon: List },
                                    { label: 'Numbered list', command: 'insertOrderedList', Icon: ListOrdered },
                                ].map(({ label, command, Icon }) => (
                                    <button
                                        key={command}
                                        type="button"
                                        title={label}
                                        aria-label={label}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => applyFormat(command, bodyRef.current)}
                                        className="rounded p-1.5 text-[#4B5563] hover:bg-[#F3F4F6]"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                            <div
                                ref={bodyRef}
                                contentEditable
                                suppressContentEditableWarning
                                data-placeholder="Write your content here..."
                                className={`min-h-[180px] px-3 py-2.5 text-sm text-[#111827] outline-none empty:before:text-[#9CA3AF] empty:before:content-[attr(data-placeholder)] ${editorListClass}`}
                            />
                        </div>
                    </section>

                    <section>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2 className="text-base font-bold text-[#111827]">Additional Media</h2>
                            <p className="text-xs text-[#9CA3AF]">Optional</p>
                        </div>
                        <div className={`mb-8 ${processing ? 'pointer-events-none opacity-70' : ''}`}>
                            <AdditionalMediaPicker
                                inputRef={mediaInputRef}
                                items={mediaItems}
                                onAddFiles={addMediaFiles}
                                onRemove={removeMediaItem}
                            />
                        </div>
                        <input
                            type="text"
                            value={caption}
                            onChange={(event) => setCaption(event.target.value)}
                            placeholder="Caption (Optional)"
                            className={fieldClass}
                        />
                    </section>
                </div>

                {showPreview ? (
                    <PreviewArticle
                        category={selectedCategoryName}
                        title={title}
                        description={description}
                        heading={heading}
                        bodyHtml={bodyHtml}
                        coverPreview={coverPreview}
                        mediaItems={mediaItems}
                        caption={caption}
                    />
                ) : null}
            </div>

            {categoryModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={closeCategoryModal}
                >
                    <form
                        onSubmit={saveCategory}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <h2 className="text-lg font-semibold text-[#111827]">
                                {categoryModal === 'edit' ? 'Edit category' : 'Add category'}
                            </h2>
                            <button
                                type="button"
                                onClick={closeCategoryModal}
                                className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            value={categoryName}
                            onChange={(event) => setCategoryName(event.target.value)}
                            placeholder="Category name"
                            maxLength={100}
                            className={fieldClass}
                        />
                        {errors?.name ? (
                            <p className="mt-2 text-sm text-[#DC2626]">{errors.name}</p>
                        ) : null}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeCategoryModal}
                                className={actionButtonClass()}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={categorySaving || !categoryName.trim()}
                                className="inline-flex items-center rounded-lg bg-[#102059] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:opacity-60"
                            >
                                {categorySaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
        </Layout>
    )
}

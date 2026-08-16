import { useRef, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
    ArrowLeft,
    Bold,
    Eye,
    Italic,
    List,
    ListOrdered,
    Save,
    Underline,
    Upload,
} from 'lucide-react'
import AdminKlasmeytLayout from '../../Layouts/AdminKlasmeytLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'

const CATEGORIES = ['Health', 'Nutrition', 'Training', 'News', 'General']

const fieldClass =
    'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] shadow-none ring-0 focus:border-[#102059] focus:outline-none focus:ring-1 focus:ring-[#102059]'

function actionButtonClass(active = false) {
    if (active) {
        return 'inline-flex items-center gap-2 rounded-lg border border-[#93C5FD] bg-white px-3.5 py-2 text-sm font-medium text-[#2563EB] transition-colors'
    }
    return 'inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB]'
}

function PreviewArticle({
    category,
    title,
    description,
    heading,
    bodyHtml,
    coverPreview,
    mediaPreview,
    mediaIsVideo,
    caption,
}) {
    const hasBody = Boolean(bodyHtml && bodyHtml.replace(/<[^>]*>/g, '').trim())

    return (
        <article className="overflow-hidden rounded-xl bg-white">
            <div className="aspect-video w-full bg-[#D1D5DB]">
                {coverPreview ? (
                    <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                ) : null}
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
                <hr className="my-6 border-[#E5E7EB]" />
                {heading ? (
                    <h3 className="text-xl font-bold leading-snug text-[#111827]">{heading}</h3>
                ) : null}
                {hasBody ? (
                    <div
                        className="mt-4 space-y-4 text-base leading-relaxed text-[#111827] [&_p]:mb-4 [&_p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                ) : null}
                <div className="mt-8 overflow-hidden rounded-xl bg-[#D1D5DB]">
                    <div className="aspect-video w-full">
                        {mediaPreview ? (
                            mediaIsVideo ? (
                                <video src={mediaPreview} controls className="h-full w-full object-contain" />
                            ) : (
                                <img src={mediaPreview} alt={caption || ''} className="h-full w-full object-cover" />
                            )
                        ) : null}
                    </div>
                    {caption ? (
                        <div className="bg-[#4B5563] px-4 py-3 text-sm leading-relaxed text-white">
                            {caption}
                        </div>
                    ) : null}
                </div>
            </div>
        </article>
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

export default function ContentBuilder({ auth }) {
    useDashboardSession()
    const Layout = auth?.user?.user_type === 'admin' ? AdminKlasmeytLayout : SuperAdminKlasmeytLayout
    const coverInputRef = useRef(null)
    const mediaInputRef = useRef(null)
    const bodyRef = useRef(null)

    const [category, setCategory] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [heading, setHeading] = useState('')
    const [caption, setCaption] = useState('')
    const [coverPreview, setCoverPreview] = useState(null)
    const [mediaPreview, setMediaPreview] = useState(null)
    const [mediaIsVideo, setMediaIsVideo] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [bodyHtml, setBodyHtml] = useState('')

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

    const goBack = () => router.visit('/klasrum')

    const togglePreview = () => {
        if (!showPreview) {
            setBodyHtml(bodyRef.current?.innerHTML || '')
        }
        setShowPreview((current) => !current)
    }

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
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={goBack}
                                className={actionButtonClass()}
                            >
                                <Save className="h-4 w-4" />
                                Save Draft
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
                                onClick={goBack}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#102059] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693]"
                            >
                                <Eye className="h-4 w-4" />
                                Publish
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
                            onChange={(event) => readFile(event.target.files?.[0], setCoverPreview)}
                            onClear={() => {
                                setCoverPreview(null)
                                if (coverInputRef.current) {
                                    coverInputRef.current.value = ''
                                }
                            }}
                        />
                    </section>

                    <section className="flex flex-col">
                        <div className="mb-8">
                            <select
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                                className={fieldClass}
                            >
                                <option value="">Select category</option>
                                {CATEGORIES.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
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
                                        onClick={() => applyFormat(command)}
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
                                className="min-h-[180px] px-3 py-2.5 text-sm text-[#111827] outline-none empty:before:text-[#9CA3AF] empty:before:content-[attr(data-placeholder)]"
                            />
                        </div>
                    </section>

                    <section>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2 className="text-base font-bold text-[#111827]">Additional Media</h2>
                            <p className="text-xs text-[#9CA3AF]">Optional</p>
                        </div>
                        <div className="mb-8">
                            <MediaDropzone
                                inputRef={mediaInputRef}
                                accept="image/*,video/*"
                                previewUrl={mediaPreview}
                                isVideo={mediaIsVideo}
                                title="Upload image or video"
                                hint="Optional media to enrich your article"
                                onChange={(event) =>
                                    readFile(event.target.files?.[0], setMediaPreview, setMediaIsVideo)
                                }
                                onClear={() => {
                                    setMediaPreview(null)
                                    setMediaIsVideo(false)
                                    if (mediaInputRef.current) {
                                        mediaInputRef.current.value = ''
                                    }
                                }}
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
                        category={category}
                        title={title}
                        description={description}
                        heading={heading}
                        bodyHtml={bodyHtml}
                        coverPreview={coverPreview}
                        mediaPreview={mediaPreview}
                        mediaIsVideo={mediaIsVideo}
                        caption={caption}
                    />
                ) : null}
            </div>
        </Layout>
    )
}

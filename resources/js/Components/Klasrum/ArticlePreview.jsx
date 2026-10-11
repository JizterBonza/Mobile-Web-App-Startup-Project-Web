import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const editorListClass =
    '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1'

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

export default function ArticlePreview({
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

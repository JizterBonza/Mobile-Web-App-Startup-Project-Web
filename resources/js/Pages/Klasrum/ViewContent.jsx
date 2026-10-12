import { Link } from '@inertiajs/react'
import { ArrowLeft, Clock } from 'lucide-react'
import ArticlePreview from '../../Components/Klasrum/ArticlePreview'
import { FollowButton, PostSocial } from '../../Components/Klasrum/PostSocial'
import AdminKlasmeytLayout from '../../Layouts/AdminKlasmeytLayout'
import OwnerManagerKlasmeytLayout from '../../Layouts/OwnerManagerKlasmeytLayout'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'
import { useDashboardSession } from '../../hooks/useDashboardSession'
import { storageUrl } from '../../utils/storageUrl'

function layoutFor(userType) {
    if (userType === 'admin') {
        return AdminKlasmeytLayout
    }
    if (userType === 'owner_manager') {
        return OwnerManagerKlasmeytLayout
    }
    return SuperAdminKlasmeytLayout
}

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

export default function ViewContent({ auth, item }) {
    useDashboardSession()
    const Layout = layoutFor(auth?.user?.user_type)
    const isPost = item?.kind === 'post'
    const backHref = isPost ? '/klasrum?tab=newsfeed' : '/klasrum'
    const coverUrl = storageUrl(item?.coverUrl)
    const media = Array.isArray(item?.media) ? item.media : []
    const body = item?.body || ''
    const hasHtml = /<[a-z][\s\S]*>/i.test(body)

    return (
        <Layout auth={auth} title={item?.title || 'Klasrum'}>
            <article className="mx-auto w-full max-w-3xl">
                <Link
                    href={backHref}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#4B5563] hover:text-[#111827]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {isPost ? 'Back to Newsfeed' : 'Back to Articles'}
                </Link>

                {isPost ? (
                <div className="overflow-hidden rounded-xl bg-white">
                    {coverUrl ? (
                        <div className="aspect-video w-full bg-[#D1D5DB]">
                            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                    ) : null}
                    <div className="px-6 py-8 sm:px-10">
                        <div className="mb-4 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-xs font-semibold text-[#6D28D9]">
                                {authorInitials(item?.authorName)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#2563EB]" style={{ marginBottom: '0px' }}>
                                    {item?.authorName || 'Klasrum'}
                                    {item?.canFollow ? (
                                        <FollowButton authorId={item.authorId} following={item.isFollowing} />
                                    ) : null}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9CA3AF]" style={{ marginTop: '0px' }}>
                                    <Clock className="h-3 w-3" />
                                    <span>{item?.postedLabel || 'Just now'}</span>
                                </p>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold leading-tight text-[#111827] sm:text-3xl">{item?.title}</h1>
                        {body ? (
                            hasHtml ? (
                                <div
                                    className="mt-4 space-y-4 text-base leading-relaxed text-[#111827] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
                                    dangerouslySetInnerHTML={{ __html: body }}
                                />
                            ) : (
                                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-[#111827]">{body}</p>
                            )
                        ) : null}
                        {media.length > 0 ? (
                            <div className="mt-8 space-y-4">
                                {media.map((entry) => {
                                    const url = storageUrl(entry.url) || storageUrl(entry.path)
                                    if (!url) {
                                        return null
                                    }
                                    const isVideo = entry.is_video || entry.type === 'video'
                                    return (
                                        <div key={entry.path || url} className="overflow-hidden rounded-xl bg-[#D1D5DB]">
                                            {isVideo ? (
                                                <video src={url} controls className="max-h-[28rem] w-full object-contain" />
                                            ) : (
                                                <img src={url} alt="" className="w-full object-cover" />
                                            )}
                                        </div>
                                    )
                                })}
                                {item?.caption ? (
                                    <p className="text-sm leading-relaxed text-[#6B7280]">{item.caption}</p>
                                ) : null}
                            </div>
                        ) : null}
                        <PostSocial
                            className="mt-8"
                            postId={item?.id}
                            canEngage={item?.canEngage}
                            reactionCount={item?.reactionCount}
                            reacted={item?.reacted}
                            comments={item?.comments}
                            startOpen
                        />
                    </div>
                </div>
                ) : (
                    <ArticlePreview
                        category={item?.category}
                        title={item?.title}
                        description={item?.description}
                        heading={item?.heading}
                        bodyHtml={body}
                        coverPreview={coverUrl}
                        mediaItems={media
                            .map((entry, index) => ({
                                id: entry.path || `media-${index}`,
                                url: storageUrl(entry.url) || storageUrl(entry.path),
                                isVideo: Boolean(entry.is_video) || entry.type === 'video',
                            }))
                            .filter((entry) => entry.url)}
                        caption={item?.caption}
                    />
                )}
            </article>
        </Layout>
    )
}

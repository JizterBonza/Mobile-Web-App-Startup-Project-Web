import { router } from '@inertiajs/react'
import { Heart, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function countLabel(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`
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

export function FollowButton({ authorId, following = false }) {
    const [on, setOn] = useState(Boolean(following))
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        setOn(Boolean(following))
    }, [following])

    const toggle = (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (busy || !authorId) {
            return
        }

        const previous = on
        setOn(!on)
        setBusy(true)
        let settled = false
        router.post(`/klasrum/users/${authorId}/follow`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                settled = true
            },
            onFinish: () => {
                setBusy(false)
                if (!settled) {
                    setOn(previous)
                }
            },
        })
    }

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-pressed={on}
            className="font-medium text-[#2563EB] hover:underline disabled:opacity-60"
        >
            {` • ${on ? 'Following' : 'Follow'}`}
        </button>
    )
}

export function PostSocial({
    postId,
    canEngage = false,
    reactionCount = 0,
    reacted = false,
    comments = [],
    startOpen = false,
    className = '',
}) {
    const [open, setOpen] = useState(startOpen)
    const [on, setOn] = useState(Boolean(reacted))
    const [count, setCount] = useState(Number(reactionCount) || 0)
    const [draft, setDraft] = useState('')
    const [error, setError] = useState('')
    const [reactionBusy, setReactionBusy] = useState(false)
    const [commentBusy, setCommentBusy] = useState(false)
    const inputRef = useRef(null)
    const list = Array.isArray(comments) ? comments : []

    useEffect(() => {
        setOn(Boolean(reacted))
    }, [reacted])

    useEffect(() => {
        setCount(Number(reactionCount) || 0)
    }, [reactionCount])

    const toggleReaction = () => {
        if (!canEngage || reactionBusy) {
            return
        }

        const previousOn = on
        const previousCount = count
        const next = !on
        setOn(next)
        setCount(Math.max(0, count + (next ? 1 : -1)))
        setReactionBusy(true)
        let settled = false
        router.post(`/klasrum/posts/${postId}/reactions`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                settled = true
            },
            onFinish: () => {
                setReactionBusy(false)
                if (!settled) {
                    setOn(previousOn)
                    setCount(previousCount)
                }
            },
        })
    }

    const toggleComments = () => {
        setOpen((current) => {
            const next = !current
            if (next) {
                requestAnimationFrame(() => inputRef.current?.focus())
            }
            return next
        })
    }

    const submitComment = (event) => {
        event?.preventDefault()
        const body = draft.trim()
        if (!canEngage || commentBusy || body === '') {
            return
        }

        setCommentBusy(true)
        setError('')
        router.post(`/klasrum/posts/${postId}/comments`, { body }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setDraft('')
            },
            onError: (errors) => {
                const message = Array.isArray(errors?.body) ? errors.body[0] : errors?.body
                setError(message || 'Could not post this comment.')
            },
            onFinish: () => setCommentBusy(false),
        })
    }

    const removeComment = (commentId) => {
        if (!window.confirm('Delete this comment?')) {
            return
        }
        router.delete(`/klasrum/posts/${postId}/comments/${commentId}`, {
            preserveScroll: true,
            preserveState: true,
        })
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-4 border-t border-[#F3F4F6] pt-3 text-sm text-[#6B7280]">
                <button
                    type="button"
                    onClick={toggleReaction}
                    disabled={!canEngage || reactionBusy}
                    aria-pressed={on}
                    title={canEngage ? (on ? 'Remove reaction' : 'React to this post') : 'Publish this post to turn on reactions.'}
                    className={`inline-flex items-center gap-1.5 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        on ? 'text-[#DC2626]' : 'hover:text-[#111827]'
                    }`}
                >
                    <Heart className={`h-4 w-4 ${on ? 'fill-current' : ''}`} />
                    {countLabel(count, 'reaction', 'reactions')}
                </button>
                <button
                    type="button"
                    onClick={toggleComments}
                    aria-expanded={open}
                    className={`inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-[#111827] ${
                        open ? 'text-[#2563EB]' : ''
                    }`}
                >
                    <MessageCircle className="h-4 w-4" />
                    {countLabel(list.length, 'comment', 'comments')}
                </button>
            </div>

            {open ? (
                <div className="mt-3 space-y-3">
                    {list.length === 0 ? (
                        <p className="text-sm text-[#9CA3AF]">No comments yet.</p>
                    ) : (
                        <ul className="max-h-80 space-y-3 overflow-y-auto">
                            {list.map((comment) => (
                                <li key={comment.id} className="flex items-start gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[10px] font-semibold text-[#6D28D9]">
                                        {authorInitials(comment.authorName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-[#111827]">
                                            <span className="font-semibold">{comment.authorName}</span>
                                            {comment.createdLabel ? (
                                                <span className="ml-2 text-xs font-normal text-[#9CA3AF]">{comment.createdLabel}</span>
                                            ) : null}
                                        </p>
                                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#374151]">
                                            {comment.body}
                                        </p>
                                        {comment.canDelete ? (
                                            <button
                                                type="button"
                                                onClick={() => removeComment(comment.id)}
                                                className="mt-1 text-xs font-medium text-[#9CA3AF] hover:text-[#DC2626]"
                                            >
                                                Delete
                                            </button>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {canEngage ? (
                        <form onSubmit={submitComment} className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={draft}
                                rows={2}
                                maxLength={2000}
                                placeholder="Write a comment..."
                                onChange={(event) => {
                                    setDraft(event.target.value)
                                    if (error) {
                                        setError('')
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault()
                                        submitComment()
                                    }
                                }}
                                className="min-h-[2.5rem] flex-1 resize-none rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#2563EB]"
                            />
                            <button
                                type="submit"
                                disabled={commentBusy || draft.trim() === ''}
                                className="rounded-lg bg-[#102059] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244693] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {commentBusy ? 'Posting…' : 'Post'}
                            </button>
                        </form>
                    ) : (
                        <p className="text-sm text-[#9CA3AF]">Comments open after this post is published.</p>
                    )}
                    {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
                </div>
            ) : null}
        </div>
    )
}

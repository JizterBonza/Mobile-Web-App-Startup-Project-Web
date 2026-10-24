const STAFF_TYPES = new Set(['vendor', 'owner_manager'])
const STAFF_ROLES = new Set(['vendor', 'owner_manager'])

export function isStaffUser(user) {
    return STAFF_TYPES.has(user?.user_type)
}

export function isShopOriginatedMessage(payloadMessage) {
    return STAFF_ROLES.has(payloadMessage?.sender_role) || payloadMessage?.type === 'order_update'
}

export function isCustomerOriginatedMessage(payloadMessage) {
    return payloadMessage?.sender_role === 'customer' && payloadMessage?.type !== 'order_update'
}

function outgoingReadCursor(readCursors, user) {
    if (!readCursors) return null
    return isStaffUser(user) ? readCursors.customer_last_read_at : readCursors.staff_last_read_at
}

function deliveryStatus(createdAt, cursor) {
    if (!createdAt || !cursor) return 'sent'
    const created = Date.parse(createdAt)
    const read = Date.parse(cursor)
    if (Number.isNaN(created) || Number.isNaN(read)) return 'sent'
    return read >= created ? 'read' : 'sent'
}

export function toUiMessage(payloadMessage, user, readCursors = null) {
    const isOutgoing = isStaffUser(user)
        ? isShopOriginatedMessage(payloadMessage)
        : Number(payloadMessage.sender_user_id) === Number(user?.id)

    const message = {
        id: payloadMessage.id,
        type: payloadMessage.type,
        side: isOutgoing ? 'outgoing' : 'incoming',
        time: payloadMessage.time || '',
        created_at: payloadMessage.created_at || null,
    }

    if (isOutgoing) {
        message.sent_by = STAFF_ROLES.has(payloadMessage.sender_role)
            ? payloadMessage.sent_by || 'Staff'
            : 'Staff'
        message.status = deliveryStatus(
            payloadMessage.created_at,
            outgoingReadCursor(readCursors, user),
        )
    }

    if (payloadMessage.type === 'images') {
        message.caption = payloadMessage.caption || ''
        message.images = payloadMessage.images || []
    } else if (payloadMessage.type === 'file') {
        message.file_name = payloadMessage.file_name
        message.file_label = payloadMessage.file_label
        message.file_size = payloadMessage.file_size
        message.file_url = payloadMessage.file_url
    } else if (payloadMessage.type === 'order_update') {
        message.body = payloadMessage.body || ''
        message.products = payloadMessage.products || []
        message.total = payloadMessage.total
    } else if (payloadMessage.type === 'product') {
        message.body = payloadMessage.body || ''
        message.product = payloadMessage.product
    } else {
        message.body = payloadMessage.body || ''
    }

    return message
}

export function appendLiveMessage(messages, payload, user) {
    const incoming = payload?.message
    if (!incoming?.id) return messages
    if (messages.some((message) => message.id === incoming.id)) return messages

    const next = [...messages]
    const dateId = `date-${incoming.date_key}`
    const hasDate = next.some((message) => message.id === dateId)

    if (!hasDate && incoming.date_key) {
        next.push({
            id: dateId,
            type: 'date',
            label: incoming.date_label || incoming.date_key,
        })
    }

    next.push(toUiMessage(incoming, user, payload.read_cursors))
    return next
}

export function applyReadReceipt(messages, payload, user) {
    if (!payload?.last_read_at || !payload?.reader_role) return messages

    const readerIsCustomer = payload.reader_role === 'customer'
    const marksOutgoingRead = isStaffUser(user) ? readerIsCustomer : !readerIsCustomer
    if (!marksOutgoingRead) return messages

    const readAt = Date.parse(payload.last_read_at)
    if (Number.isNaN(readAt)) return messages

    return messages.map((message) => {
        if (message.side !== 'outgoing' || message.type === 'date' || message.status === 'read') {
            return message
        }

        const created = Date.parse(message.created_at || '')
        if (!Number.isNaN(created) && created > readAt) return message

        return { ...message, status: 'read' }
    })
}

export function clearConversationUnread(conversations, conversationId) {
    return conversations.map((conversation) =>
        Number(conversation.id) === Number(conversationId)
            ? { ...conversation, unread: false }
            : conversation,
    )
}

export function applyConversationListUpdate(conversations, payload, user) {
    if (!payload?.conversation_id || !payload?.preview) {
        return { conversations, isNew: false }
    }

    const isFromCustomer = isCustomerOriginatedMessage(payload.message)
    const isOwnMessage = Number(payload.message?.sender_user_id) === Number(user?.id)
    const unread = isStaffUser(user) ? isFromCustomer && !isOwnMessage : !isOwnMessage

    const index = conversations.findIndex(
        (conversation) => Number(conversation.id) === Number(payload.conversation_id),
    )

    const lastSender =
        payload.preview.last_sender ||
        (payload.message
            ? {
                  user_id: payload.message.sender_user_id,
                  role: payload.message.sender_role,
                  name: payload.message.sent_by || null,
              }
            : null)

    if (index === -1) {
        return {
            conversations: [
                {
                    id: payload.conversation_id,
                    name: payload.preview.name || 'Customer',
                    avatar_url: payload.preview.avatar_url || null,
                    last_message: payload.preview.last_message || 'New message',
                    last_sender: lastSender,
                    timestamp: payload.preview.timestamp || '',
                    unread,
                },
                ...conversations,
            ],
            isNew: true,
        }
    }

    const updated = [...conversations]
    const [existing] = updated.splice(index, 1)
    updated.unshift({
        ...existing,
        last_message: payload.preview.last_message || existing.last_message,
        last_sender: lastSender || existing.last_sender || null,
        timestamp: payload.preview.timestamp || existing.timestamp,
        unread: unread || Boolean(existing.unread && !isOwnMessage),
    })

    return { conversations: updated, isNew: false }
}

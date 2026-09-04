/**
 * Resolve uploaded-file URLs to a same-origin /storage/... path.
 * Hosted APP_URL values (or leftover localhost links) otherwise break <img> tags.
 */
export function storageUrl(value) {
    if (!value || typeof value !== 'string') {
        return null
    }

    if (value.startsWith('blob:') || value.startsWith('data:')) {
        return value
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
            const parsed = new URL(value)
            if (parsed.pathname.startsWith('/storage/')) {
                return `${parsed.pathname}${parsed.search}`
            }
        } catch {
            return value
        }

        return value
    }

    if (value.startsWith('/')) {
        return value
    }

    return `/storage/${value.replace(/^storage\//, '')}`
}

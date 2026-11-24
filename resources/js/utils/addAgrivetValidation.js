import { halfDayError } from './storeSchedule'

/** Shown under each field so the person filling the form knows the expected value. */
export const AGRIVET_FIELD_GUIDE = {
    first_name: 'Required. Letters only, up to 100 characters. Spaces, hyphens, and apostrophes are allowed.',
    middle_name: 'Optional. Letters only, up to 100 characters.',
    last_name: 'Required. Letters only, up to 100 characters.',
    email: 'Required. A valid email up to 255 characters. This becomes the owner/manager login and must not already be registered.',
    password: 'Required. At least 6 characters. This is the password for the owner/manager login.',
    password_confirmation: 'Required. Must match the password exactly.',
    phone_number: 'Required. Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.',
    agrivet_name: 'Required. Business name, 2 to 150 characters.',
    description: 'Optional. Describe the products and services. Leave blank if you have nothing to add.',
    logo: 'Optional. JPG, PNG, GIF, or WEBP, up to 5MB.',
    banner: 'Optional. JPG, PNG, GIF, or WEBP, up to 10MB.',
    store_name: 'Required. Branch name, 2 to 150 characters.',
    shop_lat: 'Optional. Decimal latitude from -90 to 90, such as 10.3157. Enter both coordinates, or leave both blank.',
    shop_long: 'Optional. Decimal longitude from -180 to 180, such as 123.8854.',
    street: 'Required. Street, building, or landmark, up to 255 characters.',
    barangay: 'Required. Barangay name, up to 255 characters.',
    city: 'Required. City or municipality, up to 100 characters.',
    province: 'Required. Province name, up to 100 characters.',
    zip_code: 'Required. 4-digit Philippine ZIP code, such as 6000.',
    operating_days: 'Required. Select at least one day the store is open.',
    opening_time: 'Required. Use the store opening time.',
    closing_time: 'Required. Must be later than the opening time. Overnight hours are not accepted.',
    half_day: 'Optional. Pick one operating day and set both times. Closing must be later than opening.',
    store_image: 'Required. Storefront photo as JPG, PNG, or WEBP, up to 10MB.',
}

export const AGRIVET_STEP_FIELDS = {
    1: ['first_name', 'middle_name', 'last_name', 'email', 'password', 'password_confirmation', 'phone_number'],
    2: ['agrivet_name', 'description', 'logo', 'banner'],
    3: [
        'store_name',
        'shop_lat',
        'shop_long',
        'street',
        'barangay',
        'city',
        'province',
        'zip_code',
        'operating_days',
        'opening_time',
        'closing_time',
        'half_day',
        'half_day_opening',
        'half_day_closing',
        'store_image',
    ],
}

const PERSON_NAME = /^[\p{L}][\p{L}\s.\u2019'-]*$/u

function personNameError(value, label, required) {
    const text = String(value || '').trim()
    if (!text) {
        return required ? `${label} is required. Use letters only, up to 100 characters.` : null
    }
    if (text.length > 100) return `${label} must be 100 characters or fewer.`
    if (!PERSON_NAME.test(text)) {
        return `${label} must use letters only. Spaces, hyphens, and apostrophes are allowed.`
    }
    return null
}

function requiredTextError(value, label, { max, min = 1 }) {
    const text = String(value || '').trim()
    if (!text) return `${label} is required.`
    if (text.length < min) return `${label} must be at least ${min} characters.`
    if (text.length > max) return `${label} must be ${max} characters or fewer.`
    return null
}

export function phoneNumberError(value) {
    const raw = String(value || '').trim()
    if (!raw) return 'Phone number is required. Use 09XXXXXXXXX or +639XXXXXXXXX.'
    if (raw.length > 30) return 'Phone number must be 30 characters or fewer.'
    if (!/^[+\d][\d\s()-]*$/.test(raw)) {
        return 'Phone number can only contain digits, spaces, +, -, and parentheses.'
    }
    const digits = raw.replace(/\D/g, '')
    const local = digits.startsWith('63') ? `0${digits.slice(2)}` : digits
    if (!/^09\d{9}$/.test(local)) {
        return 'Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.'
    }
    return null
}

function emailError(value) {
    const text = String(value || '').trim()
    if (!text) return 'Email is required. Use an address such as name@example.com.'
    if (text.length > 255) return 'Email must be 255 characters or fewer.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return 'Enter a valid email address, such as name@example.com.'
    }
    return null
}

export function fileInputError(file, { required = false, label, allowGif = false, allowPdf = false, maxMb }) {
    const kinds = ['JPG', 'PNG', 'WEBP']
    if (allowGif) kinds.push('GIF')
    if (allowPdf) kinds.push('PDF')
    const kindLabel = kinds.length === 1 ? kinds[0] : `${kinds.slice(0, -1).join(', ')}, or ${kinds.at(-1)}`

    if (!file) {
        return required ? `${label} is required. Use ${kindLabel}, up to ${maxMb}MB.` : null
    }

    const name = file.name || ''
    const type = file.type || ''
    const image = /^(image\/(jpeg|png|webp))$/.test(type) || /\.(jpe?g|png|webp)$/i.test(name)
    const gif = allowGif && (type === 'image/gif' || /\.gif$/i.test(name))
    const pdf = allowPdf && (type === 'application/pdf' || /\.pdf$/i.test(name))
    if (!image && !gif && !pdf) {
        return `${label} must be ${kindLabel}.`
    }
    if (file.size > maxMb * 1024 * 1024) {
        return `${label} must be ${maxMb}MB or smaller.`
    }
    return null
}

function coordinateErrors(lat, lng) {
    const errors = {}
    const latText = String(lat ?? '').trim()
    const lngText = String(lng ?? '').trim()
    if (!latText && !lngText) return errors

    if (!latText) errors.shop_lat = 'Enter the latitude as well, or clear both coordinates.'
    if (!lngText) errors.shop_long = 'Enter the longitude as well, or clear both coordinates.'

    if (latText && !errors.shop_lat) {
        const value = Number(latText)
        if (!Number.isFinite(value) || value < -90 || value > 90) {
            errors.shop_lat = 'Latitude must be a number from -90 to 90, such as 10.3157.'
        }
    }
    if (lngText && !errors.shop_long) {
        const value = Number(lngText)
        if (!Number.isFinite(value) || value < -180 || value > 180) {
            errors.shop_long = 'Longitude must be a number from -180 to 180, such as 123.8854.'
        }
    }
    return errors
}

function put(errors, key, message) {
    if (message) errors[key] = message
}

export function validateAgrivetStep(step, data, operatingDays = []) {
    const errors = {}

    if (step === 1) {
        put(errors, 'first_name', personNameError(data.first_name, 'First name', true))
        put(errors, 'middle_name', personNameError(data.middle_name, 'Middle name', false))
        put(errors, 'last_name', personNameError(data.last_name, 'Last name', true))
        put(errors, 'email', emailError(data.email))
        if (!data.password) put(errors, 'password', 'Password is required. Use at least 6 characters.')
        else if (String(data.password).length < 6) put(errors, 'password', 'Password must be at least 6 characters.')
        if (!data.password_confirmation) {
            put(errors, 'password_confirmation', 'Confirm the password. It must match exactly.')
        } else if (data.password !== data.password_confirmation) {
            put(errors, 'password_confirmation', 'Confirmation does not match the password.')
        }
        put(errors, 'phone_number', phoneNumberError(data.phone_number))
    }

    if (step === 2) {
        put(errors, 'agrivet_name', requiredTextError(data.agrivet_name, 'Agrivet name', { max: 150, min: 2 }))
        put(errors, 'logo', fileInputError(data.logo, { label: 'Logo', allowGif: true, maxMb: 5 }))
        put(errors, 'banner', fileInputError(data.banner, { label: 'Banner', allowGif: true, maxMb: 10 }))
    }

    if (step === 3) {
        put(errors, 'store_name', requiredTextError(data.store_name, 'Store name', { max: 150, min: 2 }))
        Object.assign(errors, coordinateErrors(data.shop_lat, data.shop_long))
        put(errors, 'street', requiredTextError(data.street, 'Street', { max: 255 }))
        put(errors, 'barangay', requiredTextError(data.barangay, 'Barangay', { max: 255 }))
        put(errors, 'city', requiredTextError(data.city, 'City or municipality', { max: 100 }))
        put(errors, 'province', requiredTextError(data.province, 'Province', { max: 100 }))
        const zip = String(data.zip_code || '').trim()
        if (!zip) put(errors, 'zip_code', 'ZIP code is required. Use 4 digits, such as 6000.')
        else if (!/^\d{4}$/.test(zip)) put(errors, 'zip_code', 'ZIP code must be exactly 4 digits, such as 6000.')
        if (!operatingDays.length) put(errors, 'operating_days', 'Select at least one operating day.')
        if (!data.opening_time) put(errors, 'opening_time', 'Opening time is required.')
        if (!data.closing_time) put(errors, 'closing_time', 'Closing time is required.')
        else if (data.opening_time && data.opening_time >= data.closing_time) {
            put(errors, 'closing_time', 'Closing time must be later than the opening time.')
        }
        put(
            errors,
            'half_day',
            halfDayError({
                day: data.half_day,
                opening: data.half_day_opening,
                closing: data.half_day_closing,
                operatingDays,
            }),
        )
        put(
            errors,
            'store_image',
            fileInputError(data.store_image, { required: true, label: 'Storefront photo', maxMb: 10 }),
        )
    }

    return errors
}

export function firstInvalidAgrivetStep(data, operatingDays = []) {
    for (const step of [1, 2, 3]) {
        const errors = validateAgrivetStep(step, data, operatingDays)
        if (Object.keys(errors).length) return { step, errors }
    }
    return null
}

export function stepForAgrivetErrors(errors) {
    const keys = Object.keys(errors || {})
    for (const step of [1, 2, 3]) {
        if (keys.some((key) => AGRIVET_STEP_FIELDS[step].includes(key))) return step
    }
    return 4
}

export function normalizeServerErrors(errors) {
    const mapped = {}
    for (const [key, value] of Object.entries(errors || {})) {
        const text = Array.isArray(value) ? value.find(Boolean) : value
        if (text) mapped[key] = String(text)
    }
    return mapped
}

export const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function formatClock(time) {
  const match = String(time || '').trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  const hours = Number(match[1])
  if (Number.isNaN(hours) || hours > 23) return ''
  const period = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${match[2]} ${period}`
}

function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  const hours = Number(match[1])
  if (Number.isNaN(hours) || hours > 23) return ''
  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

export function parseHalfDaySchedule(value) {
  const empty = { day: '', opening: '', closing: '' }
  if (!value || typeof value !== 'string') return empty
  const [day, opening, closing] = value.split('|')
  if (!FULL_DAYS.includes(day)) return empty
  const open = normalizeTime(opening)
  const close = normalizeTime(closing)
  if (!open || !close) return empty
  return { day, opening: open, closing: close }
}

export function formatHalfDaySchedule(value) {
  const { day, opening, closing } = parseHalfDaySchedule(value)
  if (!day) return ''
  const label = DAY_LABELS[FULL_DAYS.indexOf(day)] || day
  const openLabel = formatClock(opening)
  const closeLabel = formatClock(closing)
  if (!openLabel || !closeLabel) return ''
  return `${label} ${openLabel} - ${closeLabel}`
}

export function halfDayError({ day, opening, closing, operatingDays }) {
  const days = Array.isArray(operatingDays) ? operatingDays : []
  if (!day && !opening && !closing) return ''
  if (!day) return 'Choose the day that uses shorter hours.'
  if (!days.includes(day)) return 'The half-day must be one of the operating days.'
  if (!opening || !closing) return 'Set both opening and closing times for the half-day.'
  if (opening >= closing) return 'Half-day closing time must be after the opening time.'
  return ''
}

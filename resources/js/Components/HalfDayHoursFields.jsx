import { useEffect, useRef } from 'react'
import { DAY_LABELS, FULL_DAYS, formatClock } from '../utils/storeSchedule'

const defaultInputClass =
  'w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#102059] focus:outline-none focus:border-[#244693] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]'

export default function HalfDayHoursFields({
  operatingDays = [],
  day = '',
  opening = '',
  closing = '',
  onChange,
  error = '',
  variant = 'klas',
  inputClass = defaultInputClass,
}) {
  const days = (Array.isArray(operatingDays) ? operatingDays : [])
    .filter((name) => FULL_DAYS.includes(name))
    .sort((a, b) => FULL_DAYS.indexOf(a) - FULL_DAYS.indexOf(b))
  const dayKey = days.join('|')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const selected = dayKey.split('|').filter(Boolean)
    if (day && !selected.includes(day)) {
      onChangeRef.current({ day: '', opening: '', closing: '' })
    }
  }, [day, dayKey])

  const update = (next) => onChange(next)
  const previewReady = Boolean(day && opening && closing)
  const shortDay = DAY_LABELS[FULL_DAYS.indexOf(day)] || day

  if (variant === 'bootstrap') {
    return (
      <div className="form-group">
        <label>
          Half-day <span className="text-muted">(optional)</span>
        </label>
        <p className="text-muted small mb-2">
          One operating day can use shorter hours, such as Sunday 6:00 AM – 8:00 AM. The other days keep the standard schedule.
        </p>
        <div className="row">
          <div className="col-md-4">
            <label className="small text-muted">Day</label>
            <select
              className="form-control"
              value={days.includes(day) ? day : ''}
              onChange={(e) => update({
                day: e.target.value,
                opening: e.target.value ? opening : '',
                closing: e.target.value ? closing : '',
              })}
              disabled={days.length === 0}
            >
              <option value="">None</option>
              {days.map((name) => (
                <option key={name} value={name}>
                  {DAY_LABELS[FULL_DAYS.indexOf(name)]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="small text-muted">Opening</label>
            <input
              type="time"
              className="form-control"
              value={opening}
              disabled={!day}
              onChange={(e) => update({ day, opening: e.target.value, closing })}
            />
          </div>
          <div className="col-md-4">
            <label className="small text-muted">Closing</label>
            <input
              type="time"
              className="form-control"
              value={closing}
              disabled={!day}
              onChange={(e) => update({ day, opening, closing: e.target.value })}
            />
          </div>
        </div>
        {previewReady && (
          <p className="small mb-0 mt-2">
            <strong>{shortDay} {formatClock(opening)} - {formatClock(closing)}.</strong> Other operating days keep the standard hours.
          </p>
        )}
        {error && <div className="text-danger small mt-1">{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-[#102059] mb-1">
        Half-day <span className="font-normal text-[#6B7280]">(optional)</span>
      </label>
      <p className="mb-3 text-xs text-[#65676B]">
        One operating day can use shorter hours, such as Sunday 6:00 AM – 8:00 AM. The other days keep the standard schedule.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs text-[#65676B]">Day</label>
          <select
            className={inputClass}
            value={days.includes(day) ? day : ''}
            disabled={days.length === 0}
            onChange={(e) => update({
              day: e.target.value,
              opening: e.target.value ? opening : '',
              closing: e.target.value ? closing : '',
            })}
          >
            <option value="">None</option>
            {days.map((name) => (
              <option key={name} value={name}>
                {DAY_LABELS[FULL_DAYS.indexOf(name)]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs text-[#65676B]">Opening</label>
          <input
            type="time"
            className={inputClass}
            value={opening}
            disabled={!day}
            onChange={(e) => update({ day, opening: e.target.value, closing })}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs text-[#65676B]">Closing</label>
          <input
            type="time"
            className={inputClass}
            value={closing}
            disabled={!day}
            onChange={(e) => update({ day, opening, closing: e.target.value })}
          />
        </div>
      </div>
      {previewReady && (
        <p className="mt-3 text-xs text-[#102059]">
          <span className="font-semibold">{shortDay} {formatClock(opening)} - {formatClock(closing)}.</span>{' '}
          Other operating days keep the standard hours.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[#E20E28]">{error}</p>}
    </div>
  )
}

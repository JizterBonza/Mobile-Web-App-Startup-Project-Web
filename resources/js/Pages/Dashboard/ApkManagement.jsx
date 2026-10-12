import { useEffect, useRef, useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import {
    Archive,
    ChevronLeft,
    ChevronRight,
    Download,
    FileArchive,
    Rocket,
    RefreshCw,
    Search,
    ShieldCheck,
    Smartphone,
    Trash2,
    Upload,
    Users,
    X,
} from 'lucide-react'
import SuperAdminKlasmeytLayout from '../../Layouts/SuperAdminKlasmeytLayout'

const MAX_APK_SIZE = 150 * 1024 * 1024
const BASE_URL = '/dashboard/super-admin/apk-management'

const STATUS_LABELS = {
    draft: 'Draft',
    staging: 'Staging',
    live: 'Live',
    archived: 'Archived',
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

function formatDate(value) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusClass(status) {
    if (status === 'live') return 'bg-[#DCFCE7] text-[#15803D]'
    if (status === 'staging') return 'bg-[#FEF3C7] text-[#B45309]'
    return 'bg-[#F3F4F6] text-[#6B7280]'
}

function MetricCard({ label, value, detail, Icon, progress }) {
    return (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-[#6B7280]">{label}</p>
                <div className="rounded-lg bg-[#EEF2FF] p-2 text-[#244693]">
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#102059]">{value}</p>
            {progress !== undefined && progress !== null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                    <div className="h-full rounded-full bg-[#244693]" style={{ width: `${progress}%` }} />
                </div>
            )}
            {detail && <p className="mt-1 text-sm text-[#6B7280]">{detail}</p>}
        </div>
    )
}

function ActionButton({ label, onClick, Icon, danger = false, disabled = false, href }) {
    const className = `rounded-lg border p-2 transition ${
        disabled
            ? 'cursor-not-allowed border-[#E5E7EB] text-[#D1D5DB]'
            : danger
                ? 'border-[#E5E7EB] text-[#6B7280] hover:border-[#E20E28] hover:text-[#E20E28]'
                : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#244693] hover:text-[#244693]'
    }`

    if (href && !disabled) {
        return (
            <a href={href} aria-label={label} title={label} className={className}>
                <Icon className="h-4 w-4" />
            </a>
        )
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={className}>
            <Icon className="h-4 w-4" />
        </button>
    )
}

export default function ApkManagement({ auth, releases, stats, filters, uploadLimitBytes }) {
    const { flash } = usePage().props
    const maxUploadBytes = uploadLimitBytes ? Math.min(MAX_APK_SIZE, uploadLimitBytes) : MAX_APK_SIZE
    const serverLimitIsLower = maxUploadBytes < MAX_APK_SIZE
    const fileInputRef = useRef(null)
    const [searchQuery, setSearchQuery] = useState(filters?.search ?? '')
    const [isDragging, setIsDragging] = useState(false)
    const [fileError, setFileError] = useState('')
    const [notice, setNotice] = useState(null)
    const [busyReleaseId, setBusyReleaseId] = useState(null)

    const form = useForm({
        apk: null,
        version_name: '',
        version_code: stats?.next_version_code ? String(stats.next_version_code) : '',
        release_notes: '',
        is_force_update: false,
        min_supported_version_code: '',
        channel: 'staging',
    })

    useEffect(() => {
        if (flash?.success) setNotice({ type: 'success', text: flash.success })
        else if (flash?.error) setNotice({ type: 'error', text: flash.error })
    }, [flash?.success, flash?.error])

    useEffect(() => {
        if (searchQuery === (filters?.search ?? '')) return undefined
        const timeout = setTimeout(() => {
            router.get(BASE_URL, searchQuery ? { search: searchQuery } : {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['releases', 'filters'],
            })
        }, 350)
        return () => clearTimeout(timeout)
    }, [searchQuery])

    const updateField = (field, value) => {
        form.setData(field, value)
        form.clearErrors(field)
    }

    const acceptFile = (file) => {
        setNotice(null)
        if (!file) return
        if (!file.name.toLowerCase().endsWith('.apk')) {
            setFileError('Choose an Android package with the .apk extension.')
            return
        }
        if (file.size > maxUploadBytes) {
            setFileError(serverLimitIsLower
                ? `This file is ${formatBytes(file.size)}, but the server only accepts uploads up to ${formatBytes(maxUploadBytes)}. Raise upload_max_filesize and post_max_size in php.ini, then restart the server.`
                : 'The APK must be 150 MB or smaller.')
            return
        }
        setFileError('')
        form.clearErrors('apk')
        form.setData('apk', file)
    }

    const removeFile = () => {
        if (form.processing) return
        form.setData('apk', null)
        setFileError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const refresh = () => {
        router.reload({ only: ['releases', 'stats', 'filters'] })
    }

    const publishRelease = (event) => {
        event.preventDefault()
        setNotice(null)
        if (!form.data.apk) {
            setFileError('Select an APK before publishing.')
            return
        }

        form.post(`${BASE_URL}/releases`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                if (!page.props.flash?.success) {
                    if (!page.props.flash?.error) {
                        setNotice({ type: 'error', text: 'The upload did not reach the server. The file may exceed the server upload limit.' })
                    }
                    return
                }
                const nextCode = page.props.stats?.next_version_code
                form.reset()
                form.setData((data) => ({ ...data, version_code: nextCode ? String(nextCode) : '' }))
                if (fileInputRef.current) fileInputRef.current.value = ''
            },
            onError: () => setNotice({ type: 'error', text: 'Please correct the highlighted fields.' }),
        })
    }

    const runAction = (release, method, url, confirmText) => {
        if (confirmText && !window.confirm(confirmText)) return
        setNotice(null)
        setBusyReleaseId(release.id)
        router[method](url, {}, {
            preserveScroll: true,
            onError: (errors) => setNotice({ type: 'error', text: errors.release ?? 'The action could not be completed.' }),
            onFinish: () => setBusyReleaseId(null),
        })
    }

    const deleteRelease = (release) => {
        if (!window.confirm(`Delete v${release.version_name} (build ${release.version_code})? The APK file will be removed from storage.`)) return
        setNotice(null)
        setBusyReleaseId(release.id)
        router.delete(`${BASE_URL}/releases/${release.id}`, {
            preserveScroll: true,
            onError: (errors) => setNotice({ type: 'error', text: errors.release ?? 'The release could not be deleted.' }),
            onFinish: () => setBusyReleaseId(null),
        })
    }

    const inputClass = (hasError = false) =>
        `w-full rounded-lg border bg-white px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:ring-2 focus:ring-[#244693]/20 ${
            hasError ? 'border-[#E20E28] focus:border-[#E20E28]' : 'border-[#D1D5DB] focus:border-[#244693]'
        }`

    const selectedFile = form.data.apk
    const uploadProgress = form.progress?.percentage ?? 0
    const rows = releases?.data ?? []
    const live = stats?.live

    return (
        <SuperAdminKlasmeytLayout auth={auth} title="APK Management">
            <input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0])}
            />

            <div className="mx-auto w-full max-w-[1440px]">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="mb-1 text-3xl font-bold tracking-tight text-[#102059]">App Releases</h1>
                        <p className="text-sm text-[#6B7280] sm:text-base">Upload, monitor, and roll out Android builds</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={refresh}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102059] disabled:opacity-60"
                        >
                            <Upload className="h-4 w-4" />
                            Upload APK
                        </button>
                    </div>
                </div>

                {notice && (
                    <div
                        role="status"
                        className={`mb-6 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                            notice.type === 'error'
                                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                                : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                        }`}
                    >
                        <span>{notice.text}</span>
                        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Live version"
                        value={live ? `v${live.version_name}` : '—'}
                        detail={live ? `Build ${live.version_code} · Production` : 'No production release yet'}
                        Icon={Smartphone}
                    />
                    <MetricCard
                        label="Total downloads"
                        value={(stats?.total_downloads ?? 0).toLocaleString()}
                        detail={`+${(stats?.downloads_last_7_days ?? 0).toLocaleString()} in the last 7 days`}
                        Icon={Download}
                    />
                    <MetricCard
                        label="Latest build downloads"
                        value={stats?.latest_download_share !== null && stats?.latest_download_share !== undefined ? `${stats.latest_download_share}%` : '—'}
                        progress={stats?.latest_download_share}
                        detail="Share of last 30 days' downloads"
                        Icon={Users}
                    />
                    <MetricCard
                        label="Force update"
                        value={stats?.force_update ? 'On' : 'Off'}
                        detail={
                            stats?.min_supported_version_code
                                ? `Min build ${stats.min_supported_version_code}${stats.min_supported_version_name ? ` (v${stats.min_supported_version_name})` : ''}`
                                : 'No minimum version set'
                        }
                        Icon={ShieldCheck}
                    />
                </div>

                <form onSubmit={publishRelease} noValidate className="mb-7 grid gap-5 xl:grid-cols-2">
                    <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-7">
                        <h2 className="mb-5 text-xl font-bold text-[#102059]">Upload new build</h2>

                        <label
                            className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${
                                isDragging
                                    ? 'border-[#244693] bg-[#EEF2FF]'
                                    : 'border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#244693] hover:bg-[#F5F7FF]'
                            }`}
                            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
                            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault()
                                setIsDragging(false)
                                acceptFile(event.dataTransfer.files?.[0])
                            }}
                        >
                            <div className="mb-4 rounded-full bg-[#E8EEFC] p-4 text-[#244693]">
                                <FileArchive className="h-7 w-7" />
                            </div>
                            <span className="text-base font-semibold text-[#102059]">Drag and drop your APK here</span>
                            <span className="mt-1 text-sm text-[#6B7280]">or browse files · .apk only, max {formatBytes(maxUploadBytes)}</span>
                            <input
                                type="file"
                                accept=".apk,application/vnd.android.package-archive"
                                className="sr-only"
                                disabled={form.processing}
                                onChange={(event) => acceptFile(event.target.files?.[0])}
                            />
                        </label>

                        {(fileError || form.errors.apk) && (
                            <p className="mt-2 text-sm text-[#E20E28]">{fileError || form.errors.apk}</p>
                        )}

                        {selectedFile && (
                            <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#F8F9FB] p-4">
                                <div className="rounded-lg bg-[#E8EEFC] p-3 text-[#244693]">
                                    <FileArchive className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-semibold text-[#1F2937]">{selectedFile.name}</p>
                                        <span className="text-sm font-semibold text-[#244693]">{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                                        <div
                                            className="h-full rounded-full bg-[#244693] transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-[#6B7280]">
                                        {form.processing
                                            ? uploadProgress >= 100
                                                ? `${formatBytes(selectedFile.size)} · Saving to storage…`
                                                : `${formatBytes(selectedFile.size * uploadProgress / 100)} of ${formatBytes(selectedFile.size)} · Uploading…`
                                            : `${formatBytes(selectedFile.size)} · Ready to publish`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    disabled={form.processing}
                                    aria-label="Remove selected APK"
                                    className="rounded-lg border border-[#D1D5DB] bg-white p-2 text-[#6B7280] transition hover:border-[#E20E28] hover:text-[#E20E28] disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-7">
                        <h2 className="mb-5 text-xl font-bold text-[#102059]">Release details</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="version-name" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Version name</label>
                                <input
                                    id="version-name"
                                    placeholder="e.g. 2.5.0"
                                    value={form.data.version_name}
                                    onChange={(event) => updateField('version_name', event.target.value)}
                                    className={inputClass(Boolean(form.errors.version_name))}
                                />
                                {form.errors.version_name && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.version_name}</p>}
                            </div>
                            <div>
                                <label htmlFor="build-number" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Build number</label>
                                <input
                                    id="build-number"
                                    inputMode="numeric"
                                    value={form.data.version_code}
                                    onChange={(event) => updateField('version_code', event.target.value.replace(/\D/g, ''))}
                                    className={inputClass(Boolean(form.errors.version_code))}
                                />
                                {form.errors.version_code && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.version_code}</p>}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label htmlFor="release-notes" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Release notes</label>
                            <textarea
                                id="release-notes"
                                rows={4}
                                value={form.data.release_notes}
                                onChange={(event) => updateField('release_notes', event.target.value)}
                                className={`${inputClass(Boolean(form.errors.release_notes))} resize-y`}
                            />
                            {form.errors.release_notes && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.release_notes}</p>}
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="release-channel" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Release channel</label>
                                <select
                                    id="release-channel"
                                    value={form.data.channel}
                                    onChange={(event) => updateField('channel', event.target.value)}
                                    className={inputClass(Boolean(form.errors.channel))}
                                >
                                    <option value="staging">Staging</option>
                                    <option value="production">Production (goes live now)</option>
                                </select>
                                {form.errors.channel && <p className="mt-1 text-xs text-[#E20E28]">{form.errors.channel}</p>}
                            </div>
                            <div>
                                <label htmlFor="min-supported" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Minimum supported build</label>
                                <input
                                    id="min-supported"
                                    inputMode="numeric"
                                    placeholder="Optional"
                                    value={form.data.min_supported_version_code}
                                    onChange={(event) => updateField('min_supported_version_code', event.target.value.replace(/\D/g, ''))}
                                    className={inputClass(Boolean(form.errors.min_supported_version_code))}
                                />
                                {form.errors.min_supported_version_code && (
                                    <p className="mt-1 text-xs text-[#E20E28]">{form.errors.min_supported_version_code}</p>
                                )}
                            </div>
                        </div>

                        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-medium text-[#374151]">
                            <input
                                type="checkbox"
                                checked={form.data.is_force_update}
                                onChange={(event) => updateField('is_force_update', event.target.checked)}
                                className="h-4 w-4 rounded border-[#9CA3AF] text-[#244693] focus:ring-[#244693]"
                            />
                            <span>Force update (users on older builds must update)</span>
                        </label>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="mt-5 w-full rounded-lg bg-[#244693] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#102059] disabled:opacity-60"
                        >
                            {form.processing ? 'Uploading…' : 'Publish release'}
                        </button>
                    </section>
                </form>

                <section className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-[#E5E7EB] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                        <h2 className="text-xl font-bold text-[#102059]">Release history</h2>
                        <div className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search versions"
                                aria-label="Search release history"
                                className="w-full rounded-lg border border-[#D1D5DB] bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#244693] focus:ring-2 focus:ring-[#244693]/20"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                                    <th className="px-6 py-4">Version</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Channel</th>
                                    <th className="px-6 py-4">Size</th>
                                    <th className="px-6 py-4">Downloads</th>
                                    <th className="px-6 py-4">Uploaded</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {rows.length ? rows.map((release) => {
                                    const busy = busyReleaseId === release.id
                                    const isLive = release.status === 'live'
                                    return (
                                        <tr key={release.id} className="text-sm text-[#374151] transition hover:bg-[#F9FAFB]">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-[#102059]">v{release.version_name}</p>
                                                <p className="text-xs text-[#6B7280]">Build {release.version_code}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(release.status)}`}>
                                                        {STATUS_LABELS[release.status] ?? release.status}
                                                    </span>
                                                    {release.is_force_update && (
                                                        <span className="inline-flex rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-semibold text-[#B91C1C]">
                                                            Force update
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 capitalize">{release.channel}</td>
                                            <td className="px-6 py-4">{formatBytes(release.file_size)}</td>
                                            <td className="px-6 py-4">{(release.download_count ?? 0).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <p>{formatDate(release.created_at)}</p>
                                                {release.uploaded_by && <p className="text-xs text-[#6B7280]">by {release.uploaded_by}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <ActionButton
                                                        label={`Download v${release.version_name}`}
                                                        href={`${BASE_URL}/releases/${release.id}/download`}
                                                        Icon={Download}
                                                    />
                                                    {!isLive && (
                                                        <ActionButton
                                                            label={`Promote v${release.version_name} to production`}
                                                            Icon={Rocket}
                                                            disabled={busy}
                                                            onClick={() => runAction(
                                                                release,
                                                                'post',
                                                                `${BASE_URL}/releases/${release.id}/publish`,
                                                                `Make v${release.version_name} (build ${release.version_code}) the live production release? The current live build will be archived.`,
                                                            )}
                                                        />
                                                    )}
                                                    {release.status !== 'archived' && (
                                                        <ActionButton
                                                            label={`Archive v${release.version_name}`}
                                                            Icon={Archive}
                                                            disabled={busy}
                                                            onClick={() => runAction(
                                                                release,
                                                                'post',
                                                                `${BASE_URL}/releases/${release.id}/archive`,
                                                                isLive
                                                                    ? `Archive the live release v${release.version_name}? Production users will no longer be offered an update until another build is promoted.`
                                                                    : null,
                                                            )}
                                                        />
                                                    )}
                                                    <ActionButton
                                                        label={isLive ? 'The live release cannot be deleted' : `Delete v${release.version_name}`}
                                                        Icon={Trash2}
                                                        danger
                                                        disabled={busy || isLive}
                                                        onClick={() => deleteRelease(release)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#6B7280]">
                                            {filters?.search ? `No releases match “${filters.search}”.` : 'No releases uploaded yet.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {releases?.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-[#E5E7EB] px-6 py-4 text-sm text-[#6B7280]">
                            <span>
                                Showing {releases.from}–{releases.to} of {releases.total}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={!releases.prev_page_url}
                                    onClick={() => router.get(releases.prev_page_url, {}, { preserveScroll: true, preserveState: true })}
                                    className="rounded-lg border border-[#D1D5DB] p-2 disabled:opacity-40"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    disabled={!releases.next_page_url}
                                    onClick={() => router.get(releases.next_page_url, {}, { preserveScroll: true, preserveState: true })}
                                    className="rounded-lg border border-[#D1D5DB] p-2 disabled:opacity-40"
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </SuperAdminKlasmeytLayout>
    )
}

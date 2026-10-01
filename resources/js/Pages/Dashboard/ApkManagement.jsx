import { useMemo, useRef, useState } from 'react'
import {
    Download,
    FileArchive,
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

const INITIAL_FILE = {
    name: 'klasmeyt-v2.5.0.apk',
    size: 60 * 1024 * 1024,
    uploadedBytes: 38.4 * 1024 * 1024,
    progress: 64,
    timeRemaining: '12 sec left',
    isDemo: true,
}

const INITIAL_FORM = {
    versionName: '2.5.0',
    buildNumber: '88',
    releaseNotes: 'Faster checkout, rider tracking fixes, and bug fixes.',
    forceUpdate: false,
    channel: 'staging',
}

const RELEASES = [
    { id: 1, version: 'v2.4.1', status: 'Live', size: '58.2 MB', downloads: 842, uploaded: '24 Sep 2026' },
    { id: 2, version: 'v2.4.0', status: 'Staging', size: '57.9 MB', downloads: 311, uploaded: '15 Sep 2026' },
    { id: 3, version: 'v2.3.2', status: 'Archived', size: '55.1 MB', downloads: 131, uploaded: '02 Sep 2026' },
]

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

function statusClass(status) {
    if (status === 'Live') return 'bg-[#DCFCE7] text-[#15803D]'
    if (status === 'Staging') return 'bg-[#FEF3C7] text-[#B45309]'
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
            {progress !== undefined ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                    <div className="h-full rounded-full bg-[#244693]" style={{ width: `${progress}%` }} />
                </div>
            ) : (
                <p className="mt-1 text-sm text-[#15803D]">{detail}</p>
            )}
        </div>
    )
}

export default function ApkManagement({ auth }) {
    const fileInputRef = useRef(null)
    const [selectedFile, setSelectedFile] = useState({ ...INITIAL_FILE })
    const [form, setForm] = useState({ ...INITIAL_FORM })
    const [searchQuery, setSearchQuery] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [fileError, setFileError] = useState('')
    const [fieldErrors, setFieldErrors] = useState({})
    const [notice, setNotice] = useState('')

    const filteredReleases = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return RELEASES
        return RELEASES.filter((release) =>
            [release.version, release.status, release.size, release.uploaded]
                .some((value) => String(value).toLowerCase().includes(query)),
        )
    }, [searchQuery])

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }))
        setFieldErrors((current) => ({ ...current, [field]: undefined }))
        setNotice('')
    }

    const acceptFile = (file) => {
        setNotice('')
        if (!file) return
        if (!file.name.toLowerCase().endsWith('.apk')) {
            setFileError('Choose an Android package with the .apk extension.')
            return
        }
        if (file.size > MAX_APK_SIZE) {
            setFileError('The APK must be 150 MB or smaller.')
            return
        }

        setFileError('')
        setSelectedFile({
            name: file.name,
            size: file.size,
            uploadedBytes: 0,
            progress: 0,
            timeRemaining: 'Ready to publish',
            isDemo: false,
        })
    }

    const removeFile = () => {
        setSelectedFile(null)
        setFileError('')
        setNotice('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const resetDemo = () => {
        setSelectedFile({ ...INITIAL_FILE })
        setForm({ ...INITIAL_FORM })
        setSearchQuery('')
        setIsDragging(false)
        setFileError('')
        setFieldErrors({})
        setNotice('Demo data refreshed. No server request was made.')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const publishRelease = (event) => {
        event.preventDefault()
        const errors = {}
        if (!form.versionName.trim()) errors.versionName = 'Enter a version name.'
        if (!/^\d+$/.test(form.buildNumber) || Number(form.buildNumber) < 1) {
            errors.buildNumber = 'Enter a positive build number.'
        }
        if (!form.releaseNotes.trim()) errors.releaseNotes = 'Enter release notes.'
        if (!selectedFile) setFileError('Select an APK before publishing.')

        setFieldErrors(errors)
        if (Object.keys(errors).length || !selectedFile) {
            setNotice('Please correct the highlighted fields.')
            return
        }

        setNotice('Release details are valid. Backend publishing is not connected yet, so nothing was saved.')
    }

    const inputClass = (hasError = false) =>
        `w-full rounded-lg border bg-white px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:ring-2 focus:ring-[#244693]/20 ${
            hasError ? 'border-[#E20E28] focus:border-[#E20E28]' : 'border-[#D1D5DB] focus:border-[#244693]'
        }`

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
                            onClick={resetDemo}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#244693] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102059]"
                        >
                            <Upload className="h-4 w-4" />
                            Upload APK
                        </button>
                    </div>
                </div>

                <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Live version" value="v2.4.1" detail="Build 87 · Production" Icon={Smartphone} />
                    <MetricCard label="Total downloads" value="1,284" detail="+126 this week" Icon={Download} />
                    <MetricCard label="Active on latest" value="78%" progress={78} Icon={Users} />
                    <MetricCard label="Force update" value="Off" detail="Min version v2.2.0" Icon={ShieldCheck} />
                </div>

                <div className="mb-7 grid gap-5 xl:grid-cols-2">
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
                            <span className="mt-1 text-sm text-[#6B7280]">or browse files · .apk only, max 150 MB</span>
                            <input
                                type="file"
                                accept=".apk,application/vnd.android.package-archive"
                                className="sr-only"
                                onChange={(event) => acceptFile(event.target.files?.[0])}
                            />
                        </label>

                        {fileError && <p className="mt-2 text-sm text-[#E20E28]">{fileError}</p>}

                        {selectedFile && (
                            <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#F8F9FB] p-4">
                                <div className="rounded-lg bg-[#E8EEFC] p-3 text-[#244693]">
                                    <FileArchive className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-semibold text-[#1F2937]">{selectedFile.name}</p>
                                        <span className="text-sm font-semibold text-[#244693]">{selectedFile.progress}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                                        <div
                                            className="h-full rounded-full bg-[#244693] transition-all"
                                            style={{ width: `${selectedFile.progress}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-[#6B7280]">
                                        {selectedFile.isDemo
                                            ? `${formatBytes(selectedFile.uploadedBytes)} of ${formatBytes(selectedFile.size)} · ${selectedFile.timeRemaining}`
                                            : `${formatBytes(selectedFile.size)} · ${selectedFile.timeRemaining}`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    aria-label="Remove selected APK"
                                    className="rounded-lg border border-[#D1D5DB] bg-white p-2 text-[#6B7280] transition hover:border-[#E20E28] hover:text-[#E20E28]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-7">
                        <h2 className="mb-5 text-xl font-bold text-[#102059]">Release details</h2>
                        <form onSubmit={publishRelease} noValidate>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="version-name" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Version name</label>
                                    <input
                                        id="version-name"
                                        value={form.versionName}
                                        onChange={(event) => updateForm('versionName', event.target.value)}
                                        className={inputClass(Boolean(fieldErrors.versionName))}
                                    />
                                    {fieldErrors.versionName && <p className="mt-1 text-xs text-[#E20E28]">{fieldErrors.versionName}</p>}
                                </div>
                                <div>
                                    <label htmlFor="build-number" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Build number</label>
                                    <input
                                        id="build-number"
                                        inputMode="numeric"
                                        value={form.buildNumber}
                                        onChange={(event) => updateForm('buildNumber', event.target.value.replace(/\D/g, ''))}
                                        className={inputClass(Boolean(fieldErrors.buildNumber))}
                                    />
                                    {fieldErrors.buildNumber && <p className="mt-1 text-xs text-[#E20E28]">{fieldErrors.buildNumber}</p>}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="release-notes" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Release notes</label>
                                <textarea
                                    id="release-notes"
                                    rows={5}
                                    value={form.releaseNotes}
                                    onChange={(event) => updateForm('releaseNotes', event.target.value)}
                                    className={`${inputClass(Boolean(fieldErrors.releaseNotes))} resize-y`}
                                />
                                {fieldErrors.releaseNotes && <p className="mt-1 text-xs text-[#E20E28]">{fieldErrors.releaseNotes}</p>}
                            </div>

                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                                <label className="flex h-12 shrink-0 cursor-pointer items-center gap-3 text-sm font-medium text-[#374151] sm:w-36">
                                    <input
                                        type="checkbox"
                                        checked={form.forceUpdate}
                                        onChange={(event) => updateForm('forceUpdate', event.target.checked)}
                                        className="h-4 w-4 rounded border-[#9CA3AF] text-[#244693] focus:ring-[#244693]"
                                    />
                                    <span className="whitespace-nowrap">Force update</span>
                                </label>
                                <div className="min-w-0 flex-1">
                                    <label htmlFor="release-channel" className="mb-1.5 block text-sm font-medium text-[#4B5563]">Release channel</label>
                                    <select
                                        id="release-channel"
                                        value={form.channel}
                                        onChange={(event) => updateForm('channel', event.target.value)}
                                        className={inputClass()}
                                    >
                                        <option value="staging">Staging</option>
                                        <option value="production">Production</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="mt-5 w-full rounded-lg bg-[#244693] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#102059]"
                            >
                                Publish release
                            </button>
                        </form>

                        {notice && (
                            <div className="mt-4 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8]" role="status">
                                {notice}
                            </div>
                        )}
                    </section>
                </div>

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
                        <table className="w-full min-w-[760px] text-left">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                                    <th className="px-6 py-4">Version</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Size</th>
                                    <th className="px-6 py-4">Downloads</th>
                                    <th className="px-6 py-4">Uploaded</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {filteredReleases.length ? filteredReleases.map((release) => (
                                    <tr key={release.id} className="text-sm text-[#374151] transition hover:bg-[#F9FAFB]">
                                        <td className="px-6 py-4 font-semibold text-[#102059]">{release.version}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(release.status)}`}>
                                                {release.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{release.size}</td>
                                        <td className="px-6 py-4">{release.downloads.toLocaleString()}</td>
                                        <td className="px-6 py-4">{release.uploaded}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled
                                                    aria-label={`Download ${release.version} unavailable until backend is connected`}
                                                    title="Backend connection pending"
                                                    className="cursor-not-allowed rounded-lg border border-[#E5E7EB] p-2 text-[#9CA3AF]"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled
                                                    aria-label={`Delete ${release.version} unavailable until backend is connected`}
                                                    title="Backend connection pending"
                                                    className="cursor-not-allowed rounded-lg border border-[#E5E7EB] p-2 text-[#9CA3AF]"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#6B7280]">
                                            No releases match “{searchQuery}”.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </SuperAdminKlasmeytLayout>
    )
}

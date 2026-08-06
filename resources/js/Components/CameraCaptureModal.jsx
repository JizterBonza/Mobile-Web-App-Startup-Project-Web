import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

/**
 * Opens the device camera via getUserMedia, lets the user take a photo,
 * and returns it as a File through onCapture.
 */
export default function CameraCaptureModal({ open, onClose, onCapture }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const [error, setError] = useState(null)
    const [ready, setReady] = useState(false)
    const [capturing, setCapturing] = useState(false)

    useEffect(() => {
        if (!open) return undefined

        let cancelled = false
        setError(null)
        setReady(false)

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('Camera is not supported in this browser.')
                return
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                })

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop())
                    return
                }

                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play()
                    if (!cancelled) setReady(true)
                }
            } catch (err) {
                if (cancelled) return
                const name = err?.name || ''
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setError('Camera permission was denied. Allow camera access and try again.')
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                    setError('No camera was found on this device.')
                } else {
                    setError('Unable to open the camera. Please try again.')
                }
            }
        }

        startCamera()

        return () => {
            cancelled = true
            streamRef.current?.getTracks().forEach((track) => track.stop())
            streamRef.current = null
            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
        }
    }, [open])

    useEffect(() => {
        if (!open) return undefined

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    const handleCapture = async () => {
        const video = videoRef.current
        if (!video || !ready || capturing) return

        setCapturing(true)
        try {
            const width = video.videoWidth || 1280
            const height = video.videoHeight || 720
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas unavailable')

            ctx.drawImage(video, 0, 0, width, height)

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (result) => (result ? resolve(result) : reject(new Error('Capture failed'))),
                    'image/jpeg',
                    0.92,
                )
            })

            const file = new File([blob], `camera-${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            })

            onCapture(file)
            onClose()
        } catch {
            setError('Could not capture the photo. Please try again.')
        } finally {
            setCapturing(false)
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Take a photo"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#111827] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-semibold text-white">Camera</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Close camera"
                    >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>

                <div className="relative aspect-[4/3] bg-black">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={`h-full w-full object-cover ${ready ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {!ready && !error && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                            Starting camera…
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/90">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-4 px-4 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCapture}
                        disabled={!ready || capturing || Boolean(error)}
                        className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/40 bg-white text-[#111827] transition-opacity disabled:opacity-40"
                        aria-label="Take photo"
                    >
                        <Camera className="h-6 w-6" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    )
}

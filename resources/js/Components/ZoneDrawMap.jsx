import { useState, useEffect, useRef } from 'react'

/**
 * ZoneDrawMap – draw a zone boundary (polygon) on a Google Map.
 * Uses Google Maps Drawing library (polygon). Callback receives array of { lat, lng }.
 *
 * Props:
 * - initialBoundary: optional array of { lat, lng } to show/edit existing zone
 * - onBoundaryChange: callback(boundary) when polygon is drawn or edited
 * - apiKey: optional; falls back to window.GOOGLE_MAPS_API_KEY
 * - height: map height (default 400)
 * - className: wrapper class
 */
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }
const DEFAULT_ZOOM = 12

export default function ZoneDrawMap({
  initialBoundary = [],
  onBoundaryChange,
  apiKey,
  height = 400,
  className = '',
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const drawingManagerRef = useRef(null)
  const polygonRef = useRef(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [drawingLoaded, setDrawingLoaded] = useState(false)
  const [mapError, setMapError] = useState(null)

  const getApiKey = () => apiKey || (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) || ''

  // Load Google Maps script (same as PinLocationMap)
  useEffect(() => {
    const key = getApiKey()
    if (!key) {
      setMapError('Google Maps API key is not configured.')
      return
    }
    if (window.google?.maps?.Map) {
      setIsGoogleLoaded(true)
      return
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) {
          setIsGoogleLoaded(true)
          clearInterval(check)
        }
      }, 100)
      return () => clearInterval(check)
    }
    const callbackName = `__agrifyZoneMapReady_${Date.now()}`
    window[callbackName] = () => {
      window[callbackName] = null
      setIsGoogleLoaded(true)
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=drawing&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      window[callbackName] = null
      setMapError('Failed to load Google Maps.')
    }
    document.head.appendChild(script)
    return () => { window[callbackName] = null }
  }, [apiKey])

  function pathToBoundary(path) {
    if (!path || !path.getArray) return []
    return path.getArray().map((ll) => ({ lat: ll.lat(), lng: ll.lng() }))
  }

  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || !window.google?.maps) return

    const hasInitial = Array.isArray(initialBoundary) && initialBoundary.length >= 3
    const center = hasInitial
      ? initialBoundary[0]
      : DEFAULT_CENTER

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    })
    mapInstanceRef.current = map

    // If DrawingManager is on the script (libraries=drawing), use it; otherwise import
    const initDrawing = async () => {
      let DrawingManager = window.google.maps.drawing?.DrawingManager
      if (!DrawingManager) {
        try {
          const lib = await window.google.maps.importLibrary('drawing')
          DrawingManager = lib.DrawingManager
        } catch (e) {
          setMapError('Could not load Drawing library.')
          return
        }
      }

      const drawingManager = new DrawingManager({
        drawingMode: window.google.maps.drawing?.OverlayType?.POLYGON || null,
        drawingControl: true,
        drawingControlOptions: {
          position: window.google.maps.ControlPosition?.TOP_CENTER || 12,
          drawingModes: [window.google.maps.drawing?.OverlayType?.POLYGON],
        },
        polygonOptions: {
          editable: true,
          draggable: true,
          fillColor: '#3388ff',
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: '#3388ff',
        },
      })
      drawingManager.setMap(map)
      drawingManagerRef.current = drawingManager

      const overlayCompleteHandler = (e) => {
        if (e.type !== 'polygon') return
        // Remove previous polygon when drawing a new one
        if (polygonRef.current) {
          polygonRef.current.setMap(null)
          polygonRef.current = null
        }
        const polygon = e.overlay
        polygonRef.current = polygon
        const path = polygon.getPath()
        const boundary = pathToBoundary(path)
        onBoundaryChange?.(boundary)
        path.addListener('set_at', () => onBoundaryChange?.(pathToBoundary(path)))
        path.addListener('insert_at', () => onBoundaryChange?.(pathToBoundary(path)))
      }

      window.google.maps.event.addListener(drawingManager, 'overlaycomplete', overlayCompleteHandler)
      setDrawingLoaded(true)
    }

    initDrawing()

    // If we have initial boundary, draw it and listen for edits
    if (hasInitial) {
      const path = initialBoundary.map((p) => new window.google.maps.LatLng(p.lat, p.lng))
      const polygon = new window.google.maps.Polygon({
        paths: path,
        map,
        editable: true,
        draggable: true,
        fillColor: '#3388ff',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#3388ff',
      })
      polygonRef.current = polygon
      const pathObj = polygon.getPath()
      pathObj.addListener('set_at', () => onBoundaryChange?.(pathToBoundary(pathObj)))
      pathObj.addListener('insert_at', () => onBoundaryChange?.(pathToBoundary(pathObj)))
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
        polygonRef.current = null
      }
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null)
        drawingManagerRef.current = null
      }
      mapInstanceRef.current = null
      setDrawingLoaded(false)
    }
  }, [isGoogleLoaded, JSON.stringify(initialBoundary)])

  return (
    <div className={className}>
      {!getApiKey() ? (
        <div
          className="border rounded bg-light d-flex align-items-center justify-content-center text-muted"
          style={{ height: `${height}px` }}
        >
          <span><i className="fas fa-map mr-2"></i>Configure Google Maps API key to draw zones.</span>
        </div>
      ) : !isGoogleLoaded ? (
        <div
          className="border rounded bg-light d-flex align-items-center justify-content-center"
          style={{ height: `${height}px` }}
        >
          <span className="spinner-border text-primary" role="status"><span className="sr-only">Loading map...</span></span>
        </div>
      ) : (
        <>
          <div
            ref={mapRef}
            className="w-100 rounded border"
            style={{ height: `${height}px`, minHeight: 300 }}
            role="application"
            aria-label="Map to draw zone boundary"
          />
          <p className="mt-1 mb-0 small text-muted">
            Use the polygon tool above the map to draw the zone boundary. You can edit or move the shape after drawing.
          </p>
        </>
      )}
      {mapError && <span className="invalid-feedback d-block">{mapError}</span>}
    </div>
  )
}

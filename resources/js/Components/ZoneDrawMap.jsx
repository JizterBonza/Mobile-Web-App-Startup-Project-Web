import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * ZoneDrawMap – draw a zone boundary (polygon) on a Google Map.
 * Uses click-to-draw (no Drawing library). Callback receives array of { lat, lng }.
 *
 * Props:
 * - initialBoundary: optional array of { lat, lng } to show/edit existing zone
 * - otherZones: optional array of { id?, name, boundary } for read-only reference polygons
 * - onBoundaryChange: callback(boundary) when polygon is drawn or edited
 * - apiKey: optional; falls back to window.GOOGLE_MAPS_API_KEY
 * - height: map height (default 400)
 * - className: wrapper class
 * - active: when true, triggers a map resize (use after modal open animation)
 */
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }
const DEFAULT_ZOOM = 12

function getPolygonCentroid(path) {
  if (!Array.isArray(path) || path.length === 0) return null
  let sumLat = 0
  let sumLng = 0
  for (const p of path) {
    sumLat += Number(p.lat ?? p.latitude ?? 0)
    sumLng += Number(p.lng ?? p.longitude ?? 0)
  }
  return { lat: sumLat / path.length, lng: sumLng / path.length }
}

function createZoneLabelOverlay(map, position, zoneName) {
  if (!window.google?.maps?.OverlayView) return null
  const div = document.createElement('div')
  div.textContent = zoneName
  div.style.cssText = [
    'position: absolute',
    'padding: 4px 10px',
    'background: rgba(107, 114, 128, 0.9)',
    'color: #fff',
    'font-size: 12px',
    'font-weight: 600',
    'border-radius: 4px',
    'white-space: nowrap',
    'pointer-events: none',
    'box-shadow: 0 1px 3px rgba(0,0,0,0.3)',
    'transform: translate(-50%, -50%)',
  ].join(';')

  class LabelOverlay extends window.google.maps.OverlayView {
    onAdd() {
      const panes = this.getPanes()
      if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(div)
      else if (panes?.overlayLayer) panes.overlayLayer.appendChild(div)
    }
    draw() {
      const projection = this.getProjection()
      if (!projection) return
      const point = projection.fromLatLngToDivPixel(
        new window.google.maps.LatLng(position.lat, position.lng)
      )
      if (point) {
        div.style.left = `${point.x}px`
        div.style.top = `${point.y}px`
      }
    }
    onRemove() {
      if (div.parentNode) div.parentNode.removeChild(div)
    }
  }
  const overlay = new LabelOverlay()
  overlay.setMap(map)
  return overlay
}

const OTHER_ZONE_POLYGON_STYLE = {
  editable: false,
  draggable: false,
  clickable: false,
  strokeColor: '#6B7280',
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: '#9CA3AF',
  fillOpacity: 0.2,
}

const POLYGON_STYLE = {
  editable: true,
  draggable: true,
  fillColor: '#3388ff',
  fillOpacity: 0.3,
  strokeWeight: 2,
  strokeColor: '#3388ff',
}

export default function ZoneDrawMap({
  initialBoundary = [],
  otherZones = [],
  onBoundaryChange,
  apiKey,
  height = 400,
  className = '',
  active = true,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const polygonRef = useRef(null)
  const otherZonePolygonsRef = useRef([])
  const otherZoneLabelsRef = useRef([])
  const draftPolylineRef = useRef(null)
  const draftMarkersRef = useRef([])
  const mapClickListenerRef = useRef(null)
  const onBoundaryChangeRef = useRef(onBoundaryChange)
  const otherZonesRef = useRef(otherZones)

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [mapError, setMapError] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [draftPoints, setDraftPoints] = useState([])
  const [hasPolygon, setHasPolygon] = useState(false)

  const getApiKey = () => apiKey || (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) || ''

  useEffect(() => {
    onBoundaryChangeRef.current = onBoundaryChange
  }, [onBoundaryChange])

  useEffect(() => {
    otherZonesRef.current = otherZones
  }, [otherZones])

  function pathToBoundary(path) {
    if (!path || !path.getArray) return []
    return path.getArray().map((ll) => ({ lat: ll.lat(), lng: ll.lng() }))
  }

  const clearDraftPreview = useCallback(() => {
    if (draftPolylineRef.current) {
      draftPolylineRef.current.setMap(null)
      draftPolylineRef.current = null
    }
    draftMarkersRef.current.forEach((m) => m.setMap(null))
    draftMarkersRef.current = []
  }, [])

  const clearPolygon = useCallback(() => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    setHasPolygon(false)
  }, [])

  const clearOtherZones = useCallback(() => {
    otherZonePolygonsRef.current.forEach((polygon) => polygon.setMap(null))
    otherZonePolygonsRef.current = []
    otherZoneLabelsRef.current.forEach((overlay) => overlay.setMap(null))
    otherZoneLabelsRef.current = []
  }, [])

  const fitMapToContent = useCallback((map, boundary = []) => {
    if (!map || !window.google?.maps) return
    const bounds = new window.google.maps.LatLngBounds()
    let hasPoints = false

    const extendPath = (path) => {
      if (!Array.isArray(path)) return
      path.forEach((p) => {
        const lat = Number(p.lat ?? p.latitude)
        const lng = Number(p.lng ?? p.longitude)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          bounds.extend({ lat, lng })
          hasPoints = true
        }
      })
    }

    extendPath(boundary)
    otherZonesRef.current.forEach((zone) => extendPath(zone.boundary))

    if (!hasPoints) return
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
  }, [])

  const renderOtherZones = useCallback((map) => {
    if (!map || !window.google?.maps) return
    clearOtherZones()

    const zones = otherZonesRef.current
    if (!Array.isArray(zones) || zones.length === 0) return

    for (const zone of zones) {
      const path = Array.isArray(zone.boundary)
        ? zone.boundary.map((p) => ({
            lat: Number(p.lat ?? p.latitude ?? 0),
            lng: Number(p.lng ?? p.longitude ?? 0),
          }))
        : []
      if (path.length < 3) continue

      const polygon = new window.google.maps.Polygon({
        paths: path,
        map,
        ...OTHER_ZONE_POLYGON_STYLE,
      })
      otherZonePolygonsRef.current.push(polygon)

      if (zone.name) {
        const centroid = getPolygonCentroid(path)
        if (centroid) {
          const overlay = createZoneLabelOverlay(map, centroid, zone.name)
          if (overlay) otherZoneLabelsRef.current.push(overlay)
        }
      }
    }
  }, [clearOtherZones])

  const attachPolygonListeners = useCallback((polygon) => {
    const path = polygon.getPath()
    const emit = () => onBoundaryChangeRef.current?.(pathToBoundary(path))
    path.addListener('set_at', emit)
    path.addListener('insert_at', emit)
    path.addListener('remove_at', emit)
  }, [])

  const renderPolygon = useCallback((points, map) => {
    if (!map || !window.google?.maps || points.length < 3) return null
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    clearDraftPreview()
    const path = points.map((p) => new window.google.maps.LatLng(p.lat, p.lng))
    const polygon = new window.google.maps.Polygon({
      paths: path,
      map,
      ...POLYGON_STYLE,
    })
    polygonRef.current = polygon
    attachPolygonListeners(polygon)
    setHasPolygon(true)
    setIsDrawing(false)
    setDraftPoints([])
    onBoundaryChangeRef.current?.(points)
    return polygon
  }, [attachPolygonListeners, clearDraftPreview])

  // Load Google Maps core script
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      window[callbackName] = null
      setMapError('Failed to load Google Maps.')
    }
    document.head.appendChild(script)

    return () => {
      window[callbackName] = null
    }
  }, [apiKey])

  // Initialize map
  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || !window.google?.maps) return

    const hasInitial = Array.isArray(initialBoundary) && initialBoundary.length >= 3
    const center = hasInitial ? initialBoundary[0] : DEFAULT_CENTER

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    })
    mapInstanceRef.current = map

    renderOtherZones(map)

    if (hasInitial) {
      renderPolygon(initialBoundary, map)
    }

    fitMapToContent(map, hasInitial ? initialBoundary : [])

    return () => {
      if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current)
        mapClickListenerRef.current = null
      }
      clearDraftPreview()
      clearOtherZones()
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
        polygonRef.current = null
      }
      mapInstanceRef.current = null
    }
    // Edit modal remounts via key={zone.id} so initialBoundary is correct on first paint.
  }, [isGoogleLoaded, clearDraftPreview, clearOtherZones, fitMapToContent, renderOtherZones, renderPolygon])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps) return
    renderOtherZones(map)
    fitMapToContent(
      map,
      polygonRef.current ? pathToBoundary(polygonRef.current.getPath()) : initialBoundary
    )
  }, [otherZones, fitMapToContent, initialBoundary, renderOtherZones])

  // Resize when modal finishes opening
  useEffect(() => {
    if (!active || !mapInstanceRef.current || !window.google?.maps) return
    const map = mapInstanceRef.current
    const timer = setTimeout(() => {
      window.google.maps.event.trigger(map, 'resize')
      fitMapToContent(
        map,
        polygonRef.current ? pathToBoundary(polygonRef.current.getPath()) : initialBoundary
      )
    }, 350)
    return () => clearTimeout(timer)
  }, [active, fitMapToContent, initialBoundary, isGoogleLoaded])

  // Sync draft preview on map while drawing
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps || !isDrawing) return

    clearDraftPreview()

    if (draftPoints.length === 0) return

    draftPolylineRef.current = new window.google.maps.Polyline({
      path: draftPoints,
      map,
      strokeColor: '#3388ff',
      strokeWeight: 2,
      strokeOpacity: 0.9,
    })

    draftMarkersRef.current = draftPoints.map((point, index) =>
      new window.google.maps.Marker({
        position: point,
        map,
        label: String(index + 1),
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3388ff',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
    )
  }, [draftPoints, isDrawing, clearDraftPreview])

  // Map click handler while drawing
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps) return

    if (mapClickListenerRef.current) {
      window.google.maps.event.removeListener(mapClickListenerRef.current)
      mapClickListenerRef.current = null
    }

    if (!isDrawing) return

    mapClickListenerRef.current = map.addListener('click', (e) => {
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setDraftPoints((prev) => [...prev, point])
    })

    return () => {
      if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current)
        mapClickListenerRef.current = null
      }
    }
  }, [isDrawing])

  const startDrawing = () => {
    clearPolygon()
    clearDraftPreview()
    setDraftPoints([])
    setIsDrawing(true)
    onBoundaryChangeRef.current?.([])
  }

  const undoLastPoint = () => {
    setDraftPoints((prev) => prev.slice(0, -1))
  }

  const finishDrawing = () => {
    const map = mapInstanceRef.current
    if (!map || draftPoints.length < 3) return
    renderPolygon(draftPoints, map)
  }

  const clearBoundary = () => {
    clearDraftPreview()
    clearPolygon()
    setDraftPoints([])
    setIsDrawing(false)
    onBoundaryChangeRef.current?.([])
  }

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
          <div className="d-flex flex-wrap align-items-center mb-2">
            {!isDrawing && !hasPolygon && (
              <button type="button" className="btn btn-sm btn-primary mr-2 mb-1" onClick={startDrawing}>
                <i className="fas fa-pen mr-1" /> Draw boundary
              </button>
            )}
            {isDrawing && (
              <>
                <span className="badge badge-info py-2 px-3 mr-2 mb-1">
                  Click the map to add points ({draftPoints.length} placed, need at least 3)
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-success mr-2 mb-1"
                  onClick={finishDrawing}
                  disabled={draftPoints.length < 3}
                >
                  Finish polygon
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary mr-2 mb-1"
                  onClick={undoLastPoint}
                  disabled={draftPoints.length === 0}
                >
                  Undo point
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger mb-1" onClick={clearBoundary}>
                  Cancel
                </button>
              </>
            )}
            {hasPolygon && !isDrawing && (
              <>
                <span className="badge badge-success py-2 px-3 mr-2 mb-1">Boundary drawn — drag points to adjust</span>
                <button type="button" className="btn btn-sm btn-outline-primary mr-2 mb-1" onClick={startDrawing}>
                  Redraw boundary
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger mb-1" onClick={clearBoundary}>
                  Clear
                </button>
              </>
            )}
          </div>
          <div
            ref={mapRef}
            className="w-100 rounded border"
            style={{ height: `${height}px`, minHeight: 300, cursor: isDrawing ? 'crosshair' : undefined }}
            role="application"
            aria-label="Map to draw zone boundary"
          />
          <p className="mt-1 mb-0 small text-muted">
            {otherZones.length > 0 && (
              <span className="d-block">
                Gray areas show existing zones for reference. Your zone is drawn in blue.
              </span>
            )}
            {isDrawing
              ? 'Click on the map to place each corner of the zone. Use "Finish polygon" when you have at least 3 points.'
              : 'Use "Draw boundary" to outline the zone on the map.'}
          </p>
        </>
      )}
      {mapError && <span className="invalid-feedback d-block">{mapError}</span>}
    </div>
  )
}

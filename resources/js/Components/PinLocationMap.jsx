import { useState, useEffect, useRef } from 'react'

/**
 * PinLocationMap Component
 *
 * Displays a Google Map. User clicks to place a pin; reverse geocoding fills
 * address, city, postal code, latitude, and longitude. Uses GOOGLE_MAPS_API_KEY.
 *
 * Props:
 * - initialLat, initialLng: Optional initial center / pin position
 * - initialAddress, initialCity, initialProvince, initialPostalCode: Optional display values
 * - onLocationSelect: Callback when a location is pinned: ({ address, city, province, postal_code, latitude, longitude })
 * - apiKey: Optional; falls back to window.GOOGLE_MAPS_API_KEY
 * - height: Map container height (default: 320px)
 * - className: Extra CSS classes for the wrapper
 * - error: Error message to show below map
 * - zoneBoundaries: Optional array of polygon paths to draw on the map. Each path is an array of { lat, lng }.
 * - zones: Optional array of { name, boundary } to draw zone polygons with name labels in the center.
 * - shopLocations: Optional array of { id, shop_name, shop_lat, shop_long } to show shop markers on the map.
 */

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
  div.className = 'zone-label-overlay'
  div.textContent = zoneName
  div.style.cssText = [
    'position: absolute',
    'padding: 4px 10px',
    'background: rgba(25, 135, 84, 0.9)',
    'color: #fff',
    'font-size: 13px',
    'font-weight: 600',
    'border-radius: 4px',
    'white-space: nowrap',
    'pointer-events: none',
    'box-shadow: 0 1px 3px rgba(0,0,0,0.3)',
    'transform: translate(-50%, -50%)',
  ].join(';')

  class LabelOverlay extends window.google.maps.OverlayView {
    constructor() {
      super()
    }
    onAdd() {
      const panes = this.getPanes()
      if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(div)
      else if (panes?.overlayLayer) panes.overlayLayer.appendChild(div)
    }
    draw() {
      const pos = position
      const projection = this.getProjection()
      if (!projection) return
      const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(pos.lat, pos.lng))
      if (point) {
        div.style.left = point.x + 'px'
        div.style.top = point.y + 'px'
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

/** Shop name label below the marker (position = marker lat/lng). */
function createShopLabelOverlay(map, position, shopName) {
  if (!window.google?.maps?.OverlayView) return null
  const div = document.createElement('div')
  div.className = 'shop-label-overlay'
  div.textContent = shopName || 'Shop'
  div.style.cssText = [
    'position: absolute',
    'padding: 3px 8px',
    'background: rgba(13, 110, 253, 0.95)',
    'color: #fff',
    'font-size: 12px',
    'font-weight: 600',
    'border-radius: 4px',
    'white-space: nowrap',
    'max-width: 180px',
    'overflow: hidden',
    'text-overflow: ellipsis',
    'pointer-events: none',
    'box-shadow: 0 1px 3px rgba(0,0,0,0.3)',
    'transform: translate(-50%, 0)',
  ].join(';')

  const offsetY = 16 // pixels below marker center
  class ShopLabelOverlay extends window.google.maps.OverlayView {
    onAdd() {
      const panes = this.getPanes()
      if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(div)
      else if (panes?.overlayLayer) panes.overlayLayer.appendChild(div)
    }
    draw() {
      const projection = this.getProjection()
      if (!projection) return
      const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(position.lat, position.lng))
      if (point) {
        div.style.left = point.x + 'px'
        div.style.top = (point.y + offsetY) + 'px'
      }
    }
    onRemove() {
      if (div.parentNode) div.parentNode.removeChild(div)
    }
  }
  const overlay = new ShopLabelOverlay()
  overlay.setMap(map)
  return overlay
}

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 } // Manila area
const DEFAULT_ZOOM = 14

/** Avoid treating '' as 0 — empty form values must not become a fake pin at (0,0). */
function parseCoord(value) {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim())
  return Number.isFinite(n) ? n : null
}

export default function PinLocationMap({
  initialLat,
  initialLng,
  initialAddress = '',
  initialCity = '',
  initialProvince = '',
  initialPostalCode = '',
  onLocationSelect,
  apiKey,
  height = 320,
  className = '',
  error,
  zoneBoundaries = [],
  zones = [],
  shopLocations = [],
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const polygonsRef = useRef([])
  const zoneLabelOverlaysRef = useRef([])
  const shopMarkersRef = useRef([])
  const shopLabelOverlaysRef = useRef([])
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapError, setMapError] = useState(null)

  const onLocationSelectRef = useRef(onLocationSelect)
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
  }, [onLocationSelect])

  const getApiKey = () => apiKey || (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) || ''

  // Load Google Maps script
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

    const callbackName = `__agrifyPinMapReady_${Date.now()}`
    window[callbackName] = () => {
      window[callbackName] = null
      setIsGoogleLoaded(true)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=${callbackName}`
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

  function reverseGeocode(lat, lng) {
    if (!window.google?.maps?.Geocoder) return
    setIsGeocoding(true)
    setMapError(null)

    const geocoder = new window.google.maps.Geocoder()
    const latLng = { lat: Number(lat), lng: Number(lng) }

    geocoder.geocode({ location: latLng }, (results, status) => {
      setIsGeocoding(false)
      if (status !== 'OK' || !results || results.length === 0) {
        onLocationSelectRef.current?.({
          address: '',
          city: '',
          province: '',
          postal_code: '',
          latitude: lat,
          longitude: lng,
        })
        return
      }

      const r = results[0]
      let city = ''
      let province = ''
      let postal_code = ''

      if (r.address_components) {
        for (const comp of r.address_components) {
          if (comp.types.includes('locality')) {
            city = comp.long_name || comp.short_name || ''
          }
          if (comp.types.includes('postal_code')) {
            postal_code = comp.long_name || comp.short_name || ''
          }
          if (comp.types.includes('administrative_area_level_1')) {
            province = comp.long_name || comp.short_name || ''
          }
          if (!city && comp.types.includes('administrative_area_level_2')) {
            city = comp.long_name || comp.short_name || ''
          }
        }
      }

      const address = r.formatted_address || ''

      onLocationSelectRef.current?.({
        address,
        city,
        province,
        postal_code,
        latitude: lat,
        longitude: lng,
      })
    })
  }

  function attachMarkerDragEnd(marker) {
    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      if (pos) reverseGeocode(pos.lat(), pos.lng())
    })
  }

  // Initialize map when Google is loaded (zones/shops redraw). Do not depend on lat/lng — see sync effect below.
  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || !window.google?.maps) return

    const latP = parseCoord(initialLat)
    const lngP = parseCoord(initialLng)
    const hasInitial = latP != null && lngP != null
    const center = hasInitial ? { lat: latP, lng: lngP } : DEFAULT_CENTER

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

    if (hasInitial) {
      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Pinned location',
      })
      markerRef.current = marker
      attachMarkerDragEnd(marker)
    }

    // Click to place or move pin (polygon clickable:false so clicks reach the map)
    map.addListener('click', (e) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      if (markerRef.current) {
        markerRef.current.setPosition(e.latLng)
      } else {
        const marker = new window.google.maps.Marker({
          position: e.latLng,
          map,
          draggable: true,
          title: 'Pinned location',
        })
        markerRef.current = marker
        attachMarkerDragEnd(marker)
      }
      reverseGeocode(lat, lng)
    })

    // Draw zone boundaries (polygons) and zone name labels
    const polygons = []
    const labelOverlays = []
    const pathsToDraw = Array.isArray(zones) && zones.length > 0
      ? zones.map((z) => ({
          name: z.name,
          path: Array.isArray(z.boundary) ? z.boundary.map((p) => ({ lat: Number(p.lat ?? p.latitude ?? 0), lng: Number(p.lng ?? p.longitude ?? 0) })) : [],
        }))
      : (Array.isArray(zoneBoundaries) ? zoneBoundaries : []).map((path) => ({ name: null, path }))

    for (const { name, path } of pathsToDraw) {
      const rawPath = path.map((p) => ({ lat: Number(p.lat ?? p.latitude ?? 0), lng: Number(p.lng ?? p.longitude ?? 0) }))
      if (rawPath.length < 3) continue
      const polygon = new window.google.maps.Polygon({
        paths: rawPath,
        strokeColor: '#198754',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#198754',
        fillOpacity: 0.15,
        clickable: false,
        map,
      })
      polygons.push(polygon)
      if (name) {
        const centroid = getPolygonCentroid(rawPath)
        if (centroid) {
          const overlay = createZoneLabelOverlay(map, centroid, name)
          if (overlay) labelOverlays.push(overlay)
        }
      }
    }
    polygonsRef.current = polygons
    zoneLabelOverlaysRef.current = labelOverlays

    // Shop location markers and name labels
    const shopMarkers = []
    const shopLabelOverlays = []
    if (Array.isArray(shopLocations) && shopLocations.length > 0) {
      for (const shop of shopLocations) {
        const lat = Number(shop.shop_lat ?? shop.latitude)
        const lng = Number(shop.shop_long ?? shop.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue
        const position = { lat, lng }
        const marker = new window.google.maps.Marker({
          position,
          map,
          clickable: false,
          title: shop.shop_name ?? shop.name ?? 'Shop',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#0d6efd',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        })
        shopMarkers.push(marker)
        const nameLabel = createShopLabelOverlay(map, position, shop.shop_name ?? shop.name ?? 'Shop')
        if (nameLabel) shopLabelOverlays.push(nameLabel)
      }
    }
    shopMarkersRef.current = shopMarkers
    shopLabelOverlaysRef.current = shopLabelOverlays

    return () => {
      polygonsRef.current.forEach((p) => p.setMap(null))
      polygonsRef.current = []
      zoneLabelOverlaysRef.current.forEach((o) => o.setMap(null))
      zoneLabelOverlaysRef.current = []
      shopMarkersRef.current.forEach((m) => m.setMap(null))
      shopMarkersRef.current = []
      shopLabelOverlaysRef.current.forEach((o) => o.setMap(null))
      shopLabelOverlaysRef.current = []
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
    }
  }, [isGoogleLoaded, zoneBoundaries, zones, shopLocations])

  // Keep marker/center in sync when lat/lng are edited in the form (without remounting the whole map).
  useEffect(() => {
    if (!isGoogleLoaded || !window.google?.maps || !mapInstanceRef.current) return

    const lat = parseCoord(initialLat)
    const lng = parseCoord(initialLng)
    const map = mapInstanceRef.current

    const latEmpty = initialLat === '' || initialLat == null
    const lngEmpty = initialLng === '' || initialLng == null
    if (latEmpty && lngEmpty) {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      return
    }

    // Incomplete pair (typing) — don't move or remove the pin yet
    if (lat == null || lng == null) {
      return
    }

    const latLng = new window.google.maps.LatLng(lat, lng)
    if (markerRef.current) {
      markerRef.current.setPosition(latLng)
    } else {
      const marker = new window.google.maps.Marker({
        position: latLng,
        map,
        draggable: true,
        title: 'Pinned location',
      })
      markerRef.current = marker
      attachMarkerDragEnd(marker)
    }
    map.panTo(latLng)
  }, [initialLat, initialLng, isGoogleLoaded])

  return (
    <div className={className}>
      {!getApiKey() ? (
        <div
          className="border rounded bg-light d-flex align-items-center justify-content-center text-muted"
          style={{ height: `${height}px` }}
        >
          <span><i className="fas fa-map-marker-alt mr-2"></i>Configure Google Maps API key to use the map.</span>
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
            style={{ height: `${height}px`, minHeight: 200 }}
            role="application"
            aria-label="Map to pin location"
          />
          {isGeocoding && (
            <small className="form-text text-muted mt-1">
              <i className="fas fa-spinner fa-spin mr-1"></i> Getting address...
            </small>
          )}
          <p className="mt-1 mb-0 small text-muted">
            Click on the map to pin the location. City, Postal Code, and Address will be filled automatically.
          </p>
        </>
      )}
      {(mapError || error) && (
        <span className="invalid-feedback d-block">{mapError || error}</span>
      )}
    </div>
  )
}

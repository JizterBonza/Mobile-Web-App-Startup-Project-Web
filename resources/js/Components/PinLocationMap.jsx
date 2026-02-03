import { useState, useEffect, useRef } from 'react'

/**
 * PinLocationMap Component
 *
 * Displays a Google Map. User clicks to place a pin; reverse geocoding fills
 * address, city, postal code, latitude, and longitude. Uses GOOGLE_MAPS_API_KEY.
 *
 * Props:
 * - initialLat, initialLng: Optional initial center / pin position
 * - initialAddress, initialCity, initialPostalCode: Optional display values
 * - onLocationSelect: Callback when a location is pinned: ({ address, city, postal_code, latitude, longitude })
 * - apiKey: Optional; falls back to window.GOOGLE_MAPS_API_KEY
 * - height: Map container height (default: 320px)
 * - className: Extra CSS classes for the wrapper
 * - error: Error message to show below map
 */
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 } // Manila area
const DEFAULT_ZOOM = 14

export default function PinLocationMap({
  initialLat,
  initialLng,
  initialAddress = '',
  initialCity = '',
  initialPostalCode = '',
  onLocationSelect,
  apiKey,
  height = 320,
  className = '',
  error,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapError, setMapError] = useState(null)

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

  // Initialize map and marker when Google is loaded
  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || !window.google?.maps) return

    const hasInitial = initialLat != null && initialLng != null && !isNaN(initialLat) && !isNaN(initialLng)
    const center = hasInitial
      ? { lat: Number(initialLat), lng: Number(initialLng) }
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

    // Initial marker if we have coordinates
    if (hasInitial) {
      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Pinned location',
      })
      markerRef.current = marker

      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        if (pos && onLocationSelect) {
          reverseGeocode(pos.lat(), pos.lng())
        }
      })
    }

    // Click to place or move pin
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
        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (pos && onLocationSelect) reverseGeocode(pos.lat(), pos.lng())
        })
      }
      if (onLocationSelect) {
        reverseGeocode(lat, lng)
      }
    })

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapInstanceRef.current = null
    }
  }, [isGoogleLoaded, initialLat, initialLng])

  function reverseGeocode(lat, lng) {
    if (!window.google?.maps?.Geocoder) return
    setIsGeocoding(true)
    setMapError(null)

    const geocoder = new window.google.maps.Geocoder()
    const latLng = { lat: Number(lat), lng: Number(lng) }

    geocoder.geocode({ location: latLng }, (results, status) => {
      setIsGeocoding(false)
      if (status !== 'OK' || !results || results.length === 0) {
        // Still pass coordinates; address fields may be empty
        onLocationSelect?.({
          address: '',
          city: '',
          postal_code: '',
          latitude: lat,
          longitude: lng,
        })
        return
      }

      const r = results[0]
      let city = ''
      let postal_code = ''

      if (r.address_components) {
        for (const comp of r.address_components) {
          if (comp.types.includes('locality')) {
            city = comp.long_name || comp.short_name || ''
          }
          if (comp.types.includes('postal_code')) {
            postal_code = comp.long_name || comp.short_name || ''
          }
          if (!city && comp.types.includes('administrative_area_level_2')) {
            city = comp.long_name || comp.short_name || ''
          }
        }
      }

      const address = r.formatted_address || ''

      onLocationSelect?.({
        address,
        city,
        postal_code,
        latitude: lat,
        longitude: lng,
      })
    })
  }

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

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * AddressAutocomplete Component
 *
 * A reusable address input using Google Places API (New) with
 * google.maps.places.AutocompleteSuggestion for suggestions.
 * Provides address suggestions and optionally auto-fills latitude/longitude.
 *
 * Props:
 * - value: Current address value
 * - onChange: Callback when address changes (receives address string)
 * - onPlaceSelect: Callback when a place is selected (receives { address, lat, lng, placeDetails })
 * - placeholder: Input placeholder text
 * - className: Additional CSS classes
 * - error: Error message to display
 * - disabled: Whether input is disabled
 * - id: Input element ID
 * - apiKey: Google Maps API key (optional, falls back to window.GOOGLE_MAPS_API_KEY)
 * - countryRestriction: Restrict results to country code (e.g., 'PH' for Philippines)
 * - inputComponent: 'input' or 'textarea' (default: 'input')
 * - rows: Number of rows for textarea (default: 2)
 */
export default function AddressAutocomplete({
  value = '',
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address',
  className = '',
  error,
  disabled = false,
  id,
  apiKey,
  countryRestriction = 'PH', // Default to Philippines
  inputComponent = 'input',
  rows = 2,
}) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)

  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const sessionTokenRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const placesLibraryRef = useRef(null)

  // Get API key from props or window
  const getApiKey = () => apiKey || window.GOOGLE_MAPS_API_KEY || ''

  // Load Google Maps script (use callback so importLibrary is available when we run)
  useEffect(() => {
    const key = getApiKey()
    if (!key) {
      console.warn('AddressAutocomplete: No Google Maps API key provided. Autocomplete will be disabled.')
      return
    }

    let cancelled = false
    let pollInterval

    const initPlaces = () => {
      if (cancelled) return
      if (!window.google?.maps?.importLibrary) return false
      window.google.maps.importLibrary('places').then((lib) => {
        if (cancelled) return
        placesLibraryRef.current = lib
        setIsGoogleLoaded(true)
      }).catch((err) => {
        if (!cancelled) console.error('Failed to load Places library', err)
      })
      return true
    }

    // Already loaded
    if (window.google?.maps?.importLibrary) {
      initPlaces()
      return () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      }
    }

    // Script tag already on page (e.g. loaded by another component) — poll until ready
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      pollInterval = setInterval(() => {
        if (initPlaces()) clearInterval(pollInterval)
      }, 100)
      return () => {
        cancelled = true
        if (pollInterval) clearInterval(pollInterval)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      }
    }

    // Load script with callback so Google calls us when API is ready (importLibrary available)
    const callbackName = `__agrifyMapsReady_${Date.now()}`
    window[callbackName] = function gmApiReady() {
      window[callbackName] = null
      if (cancelled) return
      initPlaces()
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      window[callbackName] = null
      if (!cancelled) console.error('Failed to load Google Maps script')
    }
    document.head.appendChild(script)

    return () => {
      cancelled = true
      window[callbackName] = null
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [apiKey])

  // Initialize session token when places library is loaded
  useEffect(() => {
    const lib = placesLibraryRef.current
    if (lib?.AutocompleteSessionToken) {
      sessionTokenRef.current = new lib.AutocompleteSessionToken()
    }
  }, [isGoogleLoaded])

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Fetch suggestions using AutocompleteSuggestion.fetchAutocompleteSuggestions
  const fetchSuggestions = useCallback(async (searchText) => {
    const lib = placesLibraryRef.current
    if (!searchText || searchText.length < 3 || !lib?.AutocompleteSuggestion) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)

    const request = {
      input: searchText,
      sessionToken: sessionTokenRef.current,
      ...(countryRestriction ? { includedRegionCodes: [countryRestriction] } : {}),
    }

    try {
      const { suggestions: result } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      setSuggestions(result || [])
      setShowSuggestions(!!(result && result.length > 0))
      setSelectedIndex(-1)
    } catch (err) {
      const msg = err?.message ?? String(err)
      if (/Places API \(New\) has not been used|Places API \(New\).*disabled|places\.googleapis\.com/.test(msg)) {
        console.warn(
          'AddressAutocomplete: Places API (New) is not enabled for your Google Cloud project. ' +
          'Enable it at https://console.developers.google.com/apis/api/places.googleapis.com/overview ' +
          'then retry. If you just enabled it, wait a few minutes.',
          err
        )
      } else {
        console.warn('AutocompleteSuggestion fetch failed', err)
      }
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [countryRestriction])

  // Debounced input change handler
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange?.(newValue)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  // Get display text from PlacePrediction (AutocompleteSuggestion.placePrediction)
  const getSuggestionDisplayText = (suggestion) => {
    const pred = suggestion?.placePrediction
    if (!pred) return ''
    // PlacePrediction has text (FormattableText), mainText, secondaryText
    if (pred.text?.text) return pred.text.text
    const main = pred.mainText?.text ?? ''
    const secondary = pred.secondaryText?.text ?? ''
    return secondary ? `${main}, ${secondary}` : main
  }

  const getSuggestionMainText = (suggestion) => {
    const pred = suggestion?.placePrediction
    return pred?.mainText?.text ?? pred?.text?.text?.split(',')[0] ?? ''
  }

  const getSuggestionSecondaryText = (suggestion) => {
    const pred = suggestion?.placePrediction
    return pred?.secondaryText?.text ?? pred?.text?.text ?? ''
  }

  // Handle place selection (use placePrediction.toPlace() and fetchFields)
  const handleSelectPlace = async (suggestion) => {
    const pred = suggestion?.placePrediction
    if (!pred) return

    const displayAddress = getSuggestionDisplayText(suggestion)
    setInputValue(displayAddress)
    onChange?.(displayAddress)
    setSuggestions([])
    setShowSuggestions(false)

    try {
      const place = pred.toPlace()
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      })

      const loc = place.location
      const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat
      const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng

      onPlaceSelect?.({
        address: place.formattedAddress ?? displayAddress,
        lat,
        lng,
        placeDetails: {
          name: place.displayName,
          formattedAddress: place.formattedAddress,
        },
      })

      // New session token for next search
      const lib = placesLibraryRef.current
      if (lib?.AutocompleteSessionToken) {
        sessionTokenRef.current = new lib.AutocompleteSessionToken()
      }
    } catch (err) {
      console.warn('Place fetchFields failed', err)
      onPlaceSelect?.({
        address: displayAddress,
        lat: undefined,
        lng: undefined,
        placeDetails: {},
      })
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectPlace(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const inputProps = {
    ref: inputRef,
    id,
    value: inputValue,
    onChange: handleInputChange,
    onKeyDown: handleKeyDown,
    onFocus: () => {
      if (suggestions.length > 0) {
        setShowSuggestions(true)
      }
    },
    placeholder,
    disabled,
    className: `form-control ${error ? 'is-invalid' : ''} ${className}`,
    autoComplete: 'off',
  }

  const InputComponent = inputComponent === 'textarea' ? 'textarea' : 'input'

  return (
    <div className="position-relative">
      <div className="input-group">
        <InputComponent
          {...inputProps}
          {...(inputComponent === 'textarea' ? { rows } : { type: 'text' })}
        />
        <div className="input-group-append">
          <span className="input-group-text">
            {isLoading ? (
              <span className="spinner-border spinner-border-sm" role="status">
                <span className="sr-only">Loading...</span>
              </span>
            ) : (
              <i className="fas fa-map-marker-alt"></i>
            )}
          </span>
        </div>
      </div>

      {/* Suggestions dropdown (AutocompleteSuggestion list) */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="position-absolute w-100 mt-1 shadow-lg rounded bg-white border"
          style={{
            zIndex: 1060,
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.placePrediction?.placeId ?? index}
              className={`px-3 py-2 cursor-pointer ${
                index === selectedIndex ? 'bg-primary text-white' : 'hover:bg-light'
              }`}
              style={{
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? '#007bff' : undefined,
                color: index === selectedIndex ? '#fff' : undefined,
              }}
              onClick={() => handleSelectPlace(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="d-flex align-items-start">
                <i
                  className="fas fa-map-marker-alt mr-2 mt-1"
                  style={{
                    color: index === selectedIndex ? '#fff' : '#6c757d',
                    fontSize: '0.875rem',
                  }}
                ></i>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div
                    className="font-weight-medium"
                    style={{
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getSuggestionMainText(suggestion)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      opacity: 0.8,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getSuggestionSecondaryText(suggestion)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div
            className="px-3 py-1 text-muted text-center border-top"
            style={{ fontSize: '0.7rem' }}
          >
            <img
              src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
              alt="Powered by Google"
              style={{ height: '14px' }}
            />
          </div>
        </div>
      )}

      {!getApiKey() && (
        <small className="form-text text-muted">
          <i className="fas fa-info-circle mr-1"></i>
          Address autocomplete is disabled. Configure Google Maps API key to enable.
        </small>
      )}

      {error && <span className="invalid-feedback d-block">{error}</span>}
    </div>
  )
}

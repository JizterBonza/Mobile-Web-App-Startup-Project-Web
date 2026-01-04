import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * AddressAutocomplete Component
 * 
 * A reusable address input with Google Places Autocomplete integration.
 * Provides exact address suggestions and optionally auto-fills latitude/longitude.
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
  const autocompleteServiceRef = useRef(null)
  const placesServiceRef = useRef(null)
  const sessionTokenRef = useRef(null)
  const debounceTimerRef = useRef(null)

  // Get API key from props or window
  const getApiKey = () => apiKey || window.GOOGLE_MAPS_API_KEY || ''

  // Load Google Maps script
  useEffect(() => {
    const key = getApiKey()
    if (!key) {
      console.warn('AddressAutocomplete: No Google Maps API key provided. Autocomplete will be disabled.')
      return
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true)
      return
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsGoogleLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)
      return () => clearInterval(checkLoaded)
    }

    // Load the script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setIsGoogleLoaded(true)
    script.onerror = () => console.error('Failed to load Google Maps script')
    document.head.appendChild(script)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [apiKey])

  // Initialize services when Google is loaded
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      // Create a temporary div for PlacesService (required by the API)
      const tempDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(tempDiv)
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [isGoogleLoaded])

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Fetch suggestions
  const fetchSuggestions = useCallback((searchText) => {
    if (!searchText || searchText.length < 3 || !autocompleteServiceRef.current) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)

    const request = {
      input: searchText,
      sessionToken: sessionTokenRef.current,
      componentRestrictions: countryRestriction ? { country: countryRestriction } : undefined,
      types: ['address', 'establishment', 'geocode'],
    }

    autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
      setIsLoading(false)
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions)
        setShowSuggestions(true)
        setSelectedIndex(-1)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    })
  }, [countryRestriction])

  // Debounced input change handler
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange?.(newValue)

    // Debounce API calls
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  // Handle place selection
  const handleSelectPlace = (prediction) => {
    if (!placesServiceRef.current) return

    setInputValue(prediction.description)
    onChange?.(prediction.description)
    setSuggestions([])
    setShowSuggestions(false)

    // Get place details for coordinates
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'formatted_address', 'address_components', 'name'],
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const lat = place.geometry?.location?.lat()
          const lng = place.geometry?.location?.lng()
          
          onPlaceSelect?.({
            address: prediction.description,
            lat,
            lng,
            placeDetails: {
              name: place.name,
              formattedAddress: place.formatted_address,
              addressComponents: place.address_components,
            },
          })

          // Create new session token for next search
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
        }
      }
    )
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

  // Common input props
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

      {/* Suggestions dropdown */}
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
              key={suggestion.place_id}
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
                    {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
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
                    {suggestion.structured_formatting?.secondary_text || suggestion.description}
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

      {/* No API key warning */}
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


/**
 * Browser geolocation for map centering.
 * Resolves to { lat, lng } or rejects when permission is denied or unavailable.
 */
export function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is unavailable'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          reject(new Error('Invalid coordinates'))
          return
        }
        resolve({ lat, lng })
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

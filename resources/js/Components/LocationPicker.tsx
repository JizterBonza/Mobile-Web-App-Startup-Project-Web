import { useState, useRef, useEffect } from "react";
import { MapPin, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerProps {
  onLocationSelect: (address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
    lat: number;
    lng: number;
  }) => void;
  initialPosition?: [number, number];
}

export function LocationPicker({ onLocationSelect, initialPosition }: LocationPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const defaultCenter: [number, number] = initialPosition || [14.5995, 120.9842]; // Manila, Philippines

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize the map
    const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Handle map clicks
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Remove existing marker if any
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      markerRef.current = L.marker([lat, lng]).addTo(map);

      // Fetch address
      await handleLocationClick(lat, lng);
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleLocationClick = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use OpenStreetMap Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Klasmeyt-Store-Registration",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();
      
      // Check if address data exists
      if (!data || !data.address) {
        throw new Error("No address data found");
      }
      
      const address = data.address;

      // Extract address components with fallbacks
      const street = address.road || address.street || address.pedestrian || address.highway || "";
      const barangay = address.suburb || address.neighbourhood || address.village || address.hamlet || "";
      const city = address.city || address.town || address.municipality || address.county || "";
      const province = address.state || address.province || address.region || "";
      const zipCode = address.postcode || "";

      onLocationSelect({
        street,
        barangay,
        city,
        province,
        zipCode,
        lat,
        lng,
      });
    } catch (err) {
      setError("Failed to get address. Please try again or enter manually.");
      console.error("Geocoding error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a location to search");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Use OpenStreetMap Nominatim for forward geocoding (search)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=1`,
        {
          headers: {
            "User-Agent": "Klasmeyt-Store-Registration",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search location");
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setError("Location not found. Please try a different search term.");
        setIsSearching(false);
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // Remove existing marker if any
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      if (mapRef.current) {
        markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
        // Center map on the location with a nice zoom level
        mapRef.current.setView([lat, lng], 16);
      }

      // Now reverse geocode to get detailed address
      await handleLocationClick(lat, lng);
    } catch (err) {
      setError("Failed to search location. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#E20E28]" />
        <p className="text-xs text-[#6B7280]">
          Search for your location or click on the map to drop a pin
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="w-full px-4 py-2.5 pr-24 text-sm bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#244693] transition-all"
            placeholder="Search location (e.g., Lipa City, Batangas)"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="absolute right-1.5 top-1.5 px-4 py-1.5 text-xs font-semibold bg-[#E20E28] hover:bg-[#C00D24] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            {isSearching ? "..." : "Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-600">Fetching address...</p>
        </div>
      )}

      <div 
        ref={mapContainerRef}
        className="relative rounded-lg overflow-hidden border-2 border-[#E5E7EB]"
        style={{ height: "400px", width: "100%" }}
      />

      <p className="text-xs text-[#9CA3AF] mt-2">
        Tip: You can zoom in/out and pan the map to find your exact location
      </p>
    </div>
  );
}
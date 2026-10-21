"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationData {
  latitude: number;
  longitude: number;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface UseLocationButtonProps {
  onLocationFound: (data: LocationData) => void;
}

export function UseLocationButton({ onLocationFound }: UseLocationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
              latitude +
              "&lon=" +
              longitude +
              "&zoom=18&addressdetails=1",
            { headers: { "Accept-Language": "en" } }
          );

          if (!res.ok) throw new Error("Failed to fetch address");

          const data = await res.json();
          const addr = data.address || {};

          onLocationFound({
            latitude,
            longitude,
            line1:
              [addr.road, addr.suburb, addr.neighbourhood]
                .filter(Boolean)
                .join(", ") || undefined,
            city:
              addr.city ||
              addr.town ||
              addr.village ||
              addr.county ||
              undefined,
            state: addr.state || addr.division || undefined,
            postalCode: addr.postcode || undefined,
            country: addr.country || "Bangladesh",
          });

          toast.success("Location detected!");
        } catch {
          onLocationFound({ latitude, longitude });
          toast.success("Location detected (coordinates only)");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out");
            break;
          default:
            toast.error("Failed to get location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleUseLocation}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Getting location...</>
      ) : (
        <><MapPin className="h-3.5 w-3.5 mr-1" /> Use my current location</>
      )}
    </Button>
  );
}
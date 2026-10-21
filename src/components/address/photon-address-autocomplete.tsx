"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export type PhotonAddressSuggestion = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  district: string;
  division: string;
  thana: string;
  suburb: string;
  houseNumber: string;
  street: string;
};

type Feature = {
  properties?: Record<string, unknown>;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: PhotonAddressSuggestion) => void;
  placeholder?: string;
};

function field(p: Record<string, unknown>, key: string): string {
  const value = p[key];
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const cleaned = value.trim();
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function parseAddress(feature: Feature): PhotonAddressSuggestion {
  const p = feature.properties ?? {};

  const name = field(p, "name");
  const number = field(p, "housenumber");
  const street = field(p, "street");
  const suburb =
    field(p, "suburb") ||
    field(p, "neighbourhood") ||
    field(p, "locality");

  const district =
    field(p, "district") ||
    field(p, "city_district");

  const city =
    field(p, "city") ||
    field(p, "town") ||
    field(p, "village") ||
    field(p, "municipality");

  const state = field(p, "state") || field(p, "region");

  const line1 = unique([
    number && street ? `${number} ${street}` : "",
    !street && !number ? name : "",
    street && name && name.toLowerCase() !== street.toLowerCase()
      ? name
      : "",
  ]).join(", ");

  const line2 = unique([
    suburb,
    district,
    city,
  ]).filter((value) => value.toLowerCase() !== name.toLowerCase())
    .join(", ");

  return {
    line1: line1 || name || street,
    line2,
    city: city || district,
    state,
    postalCode: field(p, "postcode"),
    country: field(p, "country"),
    district,
    division: state,
    thana: field(p, "locality") || field(p, "city_district"),
    suburb,
    houseNumber: number,
    street,
  };
}

function getLabel(feature: Feature): string {
  const p = feature.properties ?? {};

  const name = field(p, "name");
  const number = field(p, "housenumber");
  const street = field(p, "street");

  return unique([
    number && street ? `${number} ${street}` : "",
    name,
    street,
    field(p, "suburb"),
    field(p, "neighbourhood"),
    field(p, "district"),
    field(p, "city_district"),
    field(p, "city") ||
      field(p, "town") ||
      field(p, "village"),
    field(p, "state"),
    field(p, "postcode"),
    field(p, "country"),
  ]).join(", ");
}

export function PhotonAddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Type house, building, road, area or postcode",
}: Props) {
  const [results, setResults] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();

    const query = value.trim();

    if (query.length < 3) {
      setResults([]);
      setLoading(false);
      setMessage("");
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const requestController = new AbortController();
      controller.current = requestController;

      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/address-search?q=${encodeURIComponent(query)}`,
          {
            signal: requestController.signal,
            headers: { Accept: "application/json" },
          }
        );

        if (!response.ok) throw new Error("Address search failed");

        const data = await response.json();

        const features: Feature[] = Array.isArray(data.features)
          ? data.features
          : [];

        setResults(features.filter((feature) => getLabel(feature).length > 0));
        setOpen(true);

        if (features.length === 0) {
          setMessage(
            "No matching address found. Enter your house number and address manually."
          );
        }
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setResults([]);
          setOpen(true);
          setMessage("Address search unavailable. You can enter the address manually.");
        }
      } finally {
        if (!requestController.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
    };
  }, [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);

    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={root}>
      <Input
        autoComplete="street-address"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 3) setOpen(true);
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && (loading || results.length > 0 || message) && (
        <div
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-lg"
          role="listbox"
          aria-label="Address suggestions"
        >
          {loading && (
            <p className="px-3 py-2 text-sm text-gray-500">
              Searching addresses...
            </p>
          )}

          {!loading && results.map((feature, index) => {
            const address = parseAddress(feature);
            const label = getLabel(feature);

            return (
              <button
                key={`${label}-${index}`}
                type="button"
                role="option"
                aria-selected="false"
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                onClick={() => {
                  onSelect(address);
                  setOpen(false);
                  setResults([]);
                  setMessage("");
                }}
              >
                <span className="block font-medium">{label}</span>

                <span className="mt-1 block text-xs text-gray-500">
                  {[
                    address.city,
                    address.state,
                    address.postalCode,
                    address.country,
                  ].filter(Boolean).join(" · ")}
                </span>
              </button>
            );
          })}

          {!loading && message && (
            <p className="px-3 py-2 text-sm text-gray-500">{message}</p>
          )}

          <p className="border-t px-3 py-1.5 text-[11px] text-gray-400">
            Address data © OpenStreetMap contributors · Photon
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Geocoding service with multi-tier providers:
 * 1. Primary: Photon (OSM-based autocomplete engine, high-speed, excellent POI & business coverage)
 * 2. Fallback: OpenStreetMap Nominatim
 * 3. Fallback: postcodes.io (for specific UK postcodes)
 */

function classifyType(properties = {}) {
  const { osm_key, osm_value, type } = properties;
  if (osm_value === "postcode" || (osm_key === "place" && osm_value === "postcode")) {
    return "Postcode";
  }
  if (
    osm_key === "building" ||
    ["commercial", "office", "retail", "industrial"].includes(osm_value)
  ) {
    return "Business";
  }
  if (["amenity", "shop", "tourism", "leisure"].includes(osm_key)) {
    return "Point of Interest";
  }
  if (osm_key === "highway") {
    return "Street";
  }
  if (
    ["city", "town", "village", "suburb", "hamlet", "county", "state", "country"].includes(
      osm_value
    )
  ) {
    return "Area";
  }
  if (type === "house") {
    return "Address";
  }
  return "Location";
}

export async function searchAddress(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmed = query.trim();

  // 1. Primary: Photon API
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&lang=en&limit=8`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const results = data.features.map((f) => {
          const p = f.properties || {};
          const streetAddress = [p.housenumber, p.street]
            .filter(Boolean)
            .join(" ");
          const name =
            p.name ||
            streetAddress ||
            p.city ||
            p.town ||
            p.district ||
            trimmed;

          const subParts = [];
          if (streetAddress && streetAddress !== name) {
            subParts.push(streetAddress);
          }
          if (p.district && p.district !== name) {
            subParts.push(p.district);
          }
          const place = p.city || p.town || p.village;
          if (place && place !== name) {
            subParts.push(place);
          }
          if (p.county && p.county !== name && p.county !== place) {
            subParts.push(p.county);
          }
          if (p.state && p.state !== name && p.state !== p.county) {
            subParts.push(p.state);
          }
          if (p.postcode) {
            subParts.push(p.postcode);
          }
          if (p.country) {
            subParts.push(p.country);
          }

          const subtitle = [...new Set(subParts)].join(", ");
          const fullAddress =
            name && subtitle ? `${name}, ${subtitle}` : name || subtitle;

          return {
            name,
            subtitle: subtitle || fullAddress,
            address: fullAddress,
            type: classifyType(p),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          };
        });

        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch (err) {
    console.warn("Photon lookup failed, trying fallback:", err);
  }

  // 2. Fallback: OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&addressdetails=1&limit=8`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RackieApp/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => {
          const parts = (item.display_name || "")
            .split(",")
            .map((s) => s.trim());
          const name = item.name || parts[0] || trimmed;
          const subtitle = parts.slice(1).join(", ") || parts[0];
          return {
            name,
            subtitle,
            address: item.display_name,
            type: item.type === "postcode" ? "Postcode" : "Location",
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
      }
    }
  } catch (err) {
    console.warn("Nominatim lookup failed, trying fallback:", err);
  }

  // 3. Fallback: postcodes.io for UK postcodes (e.g. 'TQ12 6TQ', 'SW1A 1AA')
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i;
  if (ukPostcodeRegex.test(trimmed)) {
    try {
      const clean = trimmed.replace(/\s+/g, "");
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 200 && data.result) {
          const r = data.result;
          const subtitle = [
            r.parish,
            r.admin_district,
            r.admin_county,
            r.country,
          ]
            .filter(Boolean)
            .join(", ");
          return [
            {
              name: r.postcode,
              subtitle,
              address: `${r.postcode}, ${subtitle}`,
              type: "Postcode",
              lat: r.latitude,
              lng: r.longitude,
            },
          ];
        }
      }
    } catch (err) {
      console.warn("postcodes.io lookup failed:", err);
    }
  }

  return [];
}

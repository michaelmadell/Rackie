const MAPTILER_KEY = "5QIzD0yJGQmiB2p50Aah";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    query
  )}.json?key=${MAPTILER_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Address search failed");
  }

  const data = await res.json();
  return (data.features || []).map((feature) => ({
    address: feature.place_name,
    lat: feature.center[1],
    lng: feature.center[0],
  }));
}

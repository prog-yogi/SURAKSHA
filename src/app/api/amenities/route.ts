import { NextResponse } from "next/server";

export interface AmenityItem {
  id: string;
  lat: number;
  lng: number;
  type: "police" | "hospital" | "hotel";
  name: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseInt(searchParams.get("radius") || "5000", 10);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Missing or invalid coordinates" }, { status: 400 });
  }

  // Construct Overpass QL Query
  // Searches for nodes within the radius that match specific tags.
  // We use out center to get the central lat/lng if the result is a polygon (way/relation).
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](around:${radius},${lat},${lng});
      way["amenity"="police"](around:${radius},${lat},${lng});
      node["amenity"~"hospital|clinic"](around:${radius},${lat},${lng});
      way["amenity"~"hospital|clinic"](around:${radius},${lat},${lng});
      node["tourism"~"hotel|guest_house|motel"](around:${radius},${lat},${lng});
      way["tourism"~"hotel|guest_house|motel"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with ${response.status}`);
    }

    const data = await response.json();

    const amenities: AmenityItem[] = [];

    if (data.elements && Array.isArray(data.elements)) {
      for (const el of data.elements) {
        // Extract lat/lng (could be el.lat/el.lon for nodes, or el.center for ways)
        const elementLat = el.lat || el.center?.lat;
        const elementLng = el.lon || el.center?.lon;
        if (!elementLat || !elementLng) continue;

        // Parse tags to determine type
        let type: "police" | "hospital" | "hotel" | null = null;
        let typeStr = "";
        
        const tags = el.tags || {};
        if (tags.amenity === "police" || (tags.name && tags.name.toLowerCase().includes("police"))) {
          type = "police";
        } else if (tags.amenity === "hospital" || tags.amenity === "clinic") {
          type = "hospital";
        } else if (tags.tourism === "hotel" || tags.tourism === "guest_house" || tags.tourism === "motel") {
          type = "hotel";
        }

        if (!type) continue;
        
        let name = tags.name;
        if(!name) {
             name = type.charAt(0).toUpperCase() + type.slice(1); // fallback
        }

        amenities.push({
          id: `${el.type}-${el.id}`,
          lat: elementLat,
          lng: elementLng,
          type,
          name,
        });
      }
    }

    return NextResponse.json({ amenities });

  } catch (error: any) {
    console.error("Overpass API error:", error);
    return NextResponse.json({ error: "Failed to fetch amenities from OpenStreetMap" }, { status: 500 });
  }
}

async function test() {
  const lat = 30.268901;
  const lng = 77.993286;
  const radius = 10000;
  
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](around:${radius},${lat},${lng});
      node["name"~"police|Police|POLICE"](around:${radius},${lat},${lng});
      way["name"~"police|Police|POLICE"](around:${radius},${lat},${lng});
      way["amenity"="police"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  const data = await res.json();
  const elements = data.elements.map(e => ({
    name: e.tags.name || e.tags.amenity,
    tags: e.tags,
    lat: e.lat || e.center?.lat
  }));
  console.log("Found POLICE:", elements);
}

test();

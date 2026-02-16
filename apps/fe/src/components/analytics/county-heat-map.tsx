import "mapbox-gl/dist/mapbox-gl.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Popup, Source, type MapRef } from "react-map-gl/mapbox";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

type CountyData = { value: string; _count: { value: number } };

type GeocodedCounty = {
  name: string;
  count: number;
  lng: number;
  lat: number;
};

async function geocodeCounty(
  county: string,
  token: string
): Promise<[number, number] | null> {
  const query = encodeURIComponent(`${county} County`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=district&country=us&limit=1&access_token=${token}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const center = data.features?.[0]?.center as [number, number] | undefined;
    return center ?? null;
  } catch {
    return null;
  }
}

export default function CountyHeatMap({
  counties,
}: {
  counties: CountyData[];
}) {
  const mapRef = useRef<MapRef | null>(null);
  const geocodeCache = useRef<Map<string, [number, number] | null>>(
    new Map<string, [number, number] | null>()
  );
  const [points, setPoints] = useState<GeocodedCounty[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<GeocodedCounty | null>(null);

  // Geocode all counties on data change
  useEffect(() => {
    if (!counties?.length) {
      setPoints([]);
      return;
    }

    let cancelled = false;

    async function resolve() {
      const results: GeocodedCounty[] = [];

      await Promise.all(
        counties.map(async (c) => {
          const name = c.value;
          if (!name) return;

          let coords = geocodeCache.current.get(name);
          if (coords === undefined) {
            coords = await geocodeCounty(name, MAPBOX_TOKEN);
            geocodeCache.current.set(name, coords);
          }

          if (coords) {
            results.push({
              name,
              count: c._count.value,
              lng: coords[0],
              lat: coords[1],
            });
          }
        })
      );

      if (!cancelled) setPoints(results);
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [counties]);

  // Fit bounds when points change
  useEffect(() => {
    if (points.length === 0) return;
    const map = mapRef.current;
    if (!map) return;

    if (points.length === 1) {
      map.flyTo({ center: [points[0].lng, points[0].lat], zoom: 8 });
      return;
    }

    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    for (const p of points) {
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, maxZoom: 10 }
    );
  }, [points]);

  // Build GeoJSON
  const geojson = useMemo(() => {
    const maxCount = Math.max(...points.map((p) => p.count), 1);
    return {
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.lng, p.lat],
        },
        properties: {
          name: p.name,
          count: p.count,
          normalized: p.count / maxCount,
        },
      })),
    };
  }, [points]);

  const handleMouseEnter = useCallback((e: mapboxgl.MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const { name, count } = feature.properties as {
      name: string;
      count: number;
    };
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [
      number,
      number,
    ];
    setHoveredPoint({ name, count, lng, lat });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  if (!counties?.length) {
    return (
      <div className="flex h-[450px] items-center justify-center text-gray-400">
        No county data available
      </div>
    );
  }

  return (
    <div className="h-[450px] w-full rounded-lg overflow-hidden">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: -95.7,
          latitude: 37.1,
          zoom: 4,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={["county-circles"]}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseEnter}
      >
        <Source id="counties" type="geojson" data={geojson}>
          <Layer
            id="county-circles"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "normalized"],
                0,
                8,
                1,
                40,
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "normalized"],
                0,
                "#22c55e",
                0.5,
                "#eab308",
                1,
                "#ef4444",
              ],
              "circle-opacity": 0.75,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>

        {hoveredPoint && (
          <Popup
            longitude={hoveredPoint.lng}
            latitude={hoveredPoint.lat}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={15}
          >
            <div className="px-1 py-0.5 text-sm">
              <p className="font-semibold">{hoveredPoint.name}</p>
              <p className="text-gray-600">
                {hoveredPoint.count} referral
                {hoveredPoint.count !== 1 ? "s" : ""}
              </p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}

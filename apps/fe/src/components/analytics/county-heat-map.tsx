import "maplibre-gl/dist/maplibre-gl.css";

import { axiosClient } from "@/lib/axios-client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Layer,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";

const AWS_REGION = import.meta.env.VITE_AWS_REGION as string;
const AWS_LOCATION_API_KEY = import.meta.env
  .VITE_AWS_LOCATION_API_KEY as string;

const MAP_STYLE = `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/Standard/descriptor?key=${AWS_LOCATION_API_KEY}&color-scheme=Light`;

// Shared across mounts so a county is geocoded at most once per session
const geocodeCache = new Map<string, [number, number] | null>();

type CountyData = { value: string; _count: { value: number } };

type GeocodedCounty = {
  name: string;
  count: number;
  lng: number;
  lat: number;
};

// Geocoding runs on the API so the Amazon Location credentials stay server side.
async function geocodeCounty(county: string): Promise<[number, number] | null> {
  try {
    const { data } = await axiosClient.get("/api/places/county-center", {
      params: { county },
    });
    return [data.lng, data.lat];
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
  const [hoveredPoint, setHoveredPoint] = useState<GeocodedCounty | null>(null);

  const { data: points = [] } = useQuery({
    queryKey: ["county-geocode", counties.map((c) => c.value)],
    queryFn: async () => {
      const results: GeocodedCounty[] = [];

      await Promise.all(
        counties.map(async (c) => {
          const name = c.value;
          if (!name) return;

          let coords = geocodeCache.get(name);
          if (coords === undefined) {
            coords = await geocodeCounty(name);
            geocodeCache.set(name, coords);
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

      return results;
    },
    enabled: counties.length > 0,
    staleTime: Infinity,
  });

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

  const handleMouseEnter = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const { name, count } = feature.properties as {
      name: string;
      count: number;
    };
    const [lng, lat] = feature.geometry.coordinates as [number, number];
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
        mapStyle={MAP_STYLE}
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
                ["coalesce", ["get", "normalized"], 0],
                0,
                8,
                1,
                40,
              ],
              // Brand sequential ramp, light for sparse counties, navy for dense.
              "circle-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["get", "normalized"], 0],
                0,
                "#64d1f4",
                0.33,
                "#2c86d9",
                0.66,
                "#0d3185",
                1,
                "#01184d",
              ],
              "circle-opacity": 0.85,
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

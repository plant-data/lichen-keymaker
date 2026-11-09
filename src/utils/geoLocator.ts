/**
 * Geo locator for the "pick region / ecoregion on a map" filter.
 *
 * Both layers are derived from the ITALIC ecoregions GeoPackage
 * (plant-data/ritalic, inst/extdata/ecoregions.gpkg), dissolved and simplified
 * to static GeoJSON served from `public/geo/`:
 *   - regions.geojson    : 20 administrative regions (ITALIC `code` + `name`)
 *   - ecoregions.geojson  : 9 biogeographic ecoregions (ITALIC `code` + `name`)
 *
 * A point (from a map click or the browser geolocation) is resolved to:
 *   - the administrative region whose polygon contains it (or null, i.e. outside Italy)
 *   - the ecoregion whose polygon contains it, falling back to the NEAREST ecoregion
 *     when the point sits in a gap between polygons / near a simplified border.
 *
 * NOTE: the official geometry treats Friuli–Venezia Giulia as a single region, so a
 * point there resolves to `Frl` (Friuli); the ITALIC `VG` (Venezia Giulia) sub-area
 * cannot be distinguished from this geometry and must be chosen manually if needed.
 */
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import polygonToLine from '@turf/polygon-to-line'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { point } from '@turf/helpers'
import type { Feature, FeatureCollection, Polygon, MultiPolygon, Point } from 'geojson'

/** `{ value, text }`-ready match: ITALIC filter code + human-readable label. */
export interface GeoMatch {
  code: string
  name: string
}

export interface GeoLocation {
  /** Administrative region, or null when the point is outside the Italian regions. */
  region: GeoMatch | null
  /** Ecoregion (containing polygon, else nearest). Null only when the point is outside Italy. */
  ecoregion: GeoMatch | null
  /** True when no administrative region contains the point (point is outside Italy). */
  outsideItaly: boolean
}

type AreaProps = { code: string; name: string }
type AreaFeature = Feature<Polygon | MultiPolygon, AreaProps>
type AreaCollection = FeatureCollection<Polygon | MultiPolygon, AreaProps>

export interface GeoData {
  regions: AreaCollection
  ecoregions: AreaCollection
}

const geoUrl = (name: string) => `${import.meta.env.BASE_URL}geo/${name}`

let cache: Promise<GeoData> | null = null

/** Fetch and cache the region / ecoregion GeoJSON (loaded once per session). */
export function loadGeoData(): Promise<GeoData> {
  if (!cache) {
    cache = Promise.all([
      fetch(geoUrl('regions.geojson')).then((r) => r.json()),
      fetch(geoUrl('ecoregions.geojson')).then((r) => r.json())
    ])
      .then(([regions, ecoregions]) => ({ regions, ecoregions }) as GeoData)
      .catch((err) => {
        cache = null // allow a retry on a later open
        throw err
      })
  }
  return cache
}

function containingFeature(pt: Feature<Point>, fc: AreaCollection): AreaFeature | null {
  for (const feature of fc.features) {
    if (feature.geometry && booleanPointInPolygon(pt, feature as AreaFeature)) {
      return feature as AreaFeature
    }
  }
  return null
}

/** Min great-circle distance (km) from a point to a polygon's boundary. */
function distanceToFeature(pt: Feature<Point>, feature: AreaFeature): number {
  const line = polygonToLine(feature)
  const lines = line.type === 'FeatureCollection' ? line.features : [line]
  let min = Infinity
  for (const l of lines) {
    const snapped = nearestPointOnLine(l as never, pt, { units: 'kilometers' })
    const dist = snapped.properties?.dist
    if (typeof dist === 'number' && dist < min) min = dist
  }
  return min
}

function nearestFeature(pt: Feature<Point>, fc: AreaCollection): AreaFeature | null {
  let best: AreaFeature | null = null
  let bestDist = Infinity
  for (const feature of fc.features) {
    if (!feature.geometry) continue
    const dist = distanceToFeature(pt, feature as AreaFeature)
    if (dist < bestDist) {
      bestDist = dist
      best = feature as AreaFeature
    }
  }
  return best
}

const toMatch = (f: AreaFeature | null): GeoMatch | null =>
  f ? { code: f.properties.code, name: f.properties.name } : null

/**
 * Resolve a lon/lat point to its administrative region and ecoregion.
 * Ecoregion uses the containing polygon, else the nearest one.
 */
export function locatePoint(lng: number, lat: number, data: GeoData): GeoLocation {
  const pt = point([lng, lat])

  const region = containingFeature(pt, data.regions)
  const outsideItaly = region === null

  // Ecoregion: containing polygon first, nearest as the fallback the product asked for.
  let ecoregion = containingFeature(pt, data.ecoregions)
  if (!ecoregion) ecoregion = nearestFeature(pt, data.ecoregions)

  return {
    region: toMatch(region),
    ecoregion: outsideItaly ? null : toMatch(ecoregion),
    outsideItaly
  }
}

/** Read the browser geolocation as a [lng, lat] pair. */
export function getCurrentPosition(options?: PositionOptions): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
    )
  })
}

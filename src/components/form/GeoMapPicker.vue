<template>
  <div>
    <!-- Trigger button -->
    <button
      type="button"
      class="flex items-center gap-2 rounded-full border border-surface-300 bg-surface-0 px-4 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:bg-surface-100 disabled:text-surface-400 disabled:hover:bg-surface-100"
      :disabled="disabled"
      @click="openModal"
    >
      <i class="pi pi-map" :class="disabled ? 'text-surface-400' : 'text-surface-600'"></i>
      or choose on the map
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition>
        <div
          v-if="isModalOpen"
          class="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-2"
          @click="closeModal"
          @keydown.esc="closeModal"
        >
          <div
            ref="modalRef"
            class="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white"
            tabindex="-1"
            @click.stop
            @keydown="handleTabKey"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-surface-200 p-4">
              <h2 class="text-xl font-semibold">Choose region &amp; ecoregion on the map</h2>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-100"
                aria-label="Close"
                @click="closeModal"
              >
                <i class="pi pi-times text-surface-700"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="flex flex-grow flex-col gap-2 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                  :class="
                    pickMode
                      ? 'border-primary bg-primary text-primary-inverse'
                      : 'border-surface-300 bg-surface-0 hover:bg-surface-100'
                  "
                  @click="togglePick"
                >
                  <i class="pi pi-map-marker"></i>
                  Pick a point
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded border border-surface-300 bg-surface-0 px-3 py-2 text-sm hover:bg-surface-100 disabled:opacity-60"
                  :disabled="locating"
                  @click="useMyLocation"
                >
                  <i class="pi" :class="locating ? 'pi-spin pi-spinner' : 'pi-compass'"></i>
                  {{ locating ? 'Locating…' : 'Use your location' }}
                </button>
              </div>

              <!-- Status / result -->
              <p
                v-if="message"
                class="text-sm"
                :class="error ? 'text-red-600' : 'text-surface-700'"
              >
                {{ message }}
              </p>
              <p v-else-if="pickMode" class="text-sm text-surface-500">
                Click on the map to set the administrative region and ecoregion.
              </p>

              <!-- Map -->
              <div
                ref="mapEl"
                class="min-h-[280px] w-full flex-grow overflow-hidden rounded border border-surface-300"
                :class="{ 'pick-active': pickMode }"
              ></div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-3 border-t border-surface-200 p-4">
              <button
                type="button"
                class="rounded-full border border-surface-300 bg-surface-500 px-6 py-2 text-surface-0 hover:bg-surface-600"
                @click="closeModal"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, nextTick, onUnmounted } from 'vue'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, CircleMarker } from 'leaflet'
import { useScrollLock } from '@/composables/useScrollLock'
import {
  loadGeoData,
  locatePoint,
  getCurrentPosition,
  type GeoData,
  type GeoLocation
} from '@/utils/geoLocator'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ (e: 'select', value: GeoLocation): void }>()

const { blockScroll, unblockScroll } = useScrollLock()

const mapEl = ref<HTMLElement | null>(null)
const modalRef = ref<HTMLElement | null>(null)
const isModalOpen = ref(false)
const pickMode = ref(true)
const locating = ref(false)
const message = ref('')
const error = ref(false)

// Non-reactive Leaflet handles.
const map = shallowRef<LeafletMap | null>(null)
let L: typeof import('leaflet') | null = null
let geoData: GeoData | null = null
let regionLayer: LeafletGeoJSON | null = null
let marker: CircleMarker | null = null
let lastFocused: HTMLElement | null = null

async function ensureGeoData(): Promise<GeoData> {
  if (!geoData) geoData = await loadGeoData()
  return geoData
}

async function initMap() {
  if (map.value || !mapEl.value) return
  // Lazy-load Leaflet + CSS only when the map is first opened.
  L = (await import('leaflet')).default ?? (await import('leaflet'))
  await import('leaflet/dist/leaflet.css')
  const data = await ensureGeoData()

  const instance = L.map(mapEl.value, { scrollWheelZoom: true }).setView([42, 12.5], 5)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(instance)

  regionLayer = L.geoJSON(data.regions as never, {
    style: { color: '#2563eb', weight: 1, fillOpacity: 0.05 }
  }).addTo(instance)

  instance.on('click', (e) => {
    if (!pickMode.value) return
    handlePoint(e.latlng.lng, e.latlng.lat, false)
  })
  map.value = instance
  // The modal animates in, so re-measure once it has settled.
  setTimeout(() => instance.invalidateSize(), 50)
  setTimeout(() => instance.invalidateSize(), 300)
}

function destroyMap() {
  marker?.remove()
  regionLayer?.remove()
  map.value?.remove()
  marker = null
  regionLayer = null
  map.value = null
}

async function openModal() {
  if (props.disabled) return
  lastFocused = document.activeElement as HTMLElement
  isModalOpen.value = true
  message.value = ''
  error.value = false
  blockScroll()
  await nextTick()
  try {
    await initMap()
  } catch {
    error.value = true
    message.value = 'Could not load the map data. Please try again.'
  }
  modalRef.value?.focus()
}

function closeModal() {
  isModalOpen.value = false
  unblockScroll()
  destroyMap()
  lastFocused?.focus()
}

function togglePick() {
  pickMode.value = !pickMode.value
}

function placeMarker(lng: number, lat: number) {
  if (!L || !map.value) return
  if (marker) marker.remove()
  marker = L.circleMarker([lat, lng], {
    radius: 7,
    color: '#dc2626',
    fillColor: '#dc2626',
    fillOpacity: 0.9,
    weight: 2
  }).addTo(map.value)
}

async function handlePoint(lng: number, lat: number, recenter: boolean) {
  const data = await ensureGeoData()
  const result = locatePoint(lng, lat, data)

  if (map.value) {
    placeMarker(lng, lat)
    if (recenter) map.value.setView([lat, lng], 8)
  }

  error.value = false
  if (result.outsideItaly) {
    message.value = 'That point is outside the Italian regions — pick a location within Italy.'
    return
  }
  message.value = `Region: ${result.region?.name ?? '—'}  ·  Ecoregion: ${
    result.ecoregion?.name ?? '—'
  }`
  emit('select', result)
}

async function useMyLocation() {
  locating.value = true
  error.value = false
  message.value = ''
  try {
    const [lng, lat] = await getCurrentPosition()
    await handlePoint(lng, lat, true)
  } catch (err) {
    error.value = true
    const code = (err as GeolocationPositionError)?.code
    message.value =
      code === 1
        ? 'Location permission denied. You can still pick a point on the map.'
        : 'Could not get your location. You can still pick a point on the map.'
  } finally {
    locating.value = false
  }
}

// Focus trap (mirrors the app's FilterModal behaviour).
function handleTabKey(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const focusable = modalRef.value?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable || focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    last.focus()
    e.preventDefault()
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus()
    e.preventDefault()
  }
}

onUnmounted(() => {
  unblockScroll()
  destroyMap()
})
</script>

<style scoped>
/* Crosshair cursor while "Pick a point" is active. */
.pick-active :deep(.leaflet-grab),
.pick-active :deep(.leaflet-interactive) {
  cursor: crosshair;
}
</style>

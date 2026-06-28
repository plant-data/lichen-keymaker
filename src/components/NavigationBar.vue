<template>
  <nav class="max-w container-fluid relative z-50 flex flex-1 items-center justify-between">
    <!-- logo -->
    <div class="flex items-center gap-2">
      <div
        class="flex flex-shrink-0 items-center overflow-hidden rounded-full border border-surface-900"
      >
        <img class="h-10 w-10" src="/general/banner-key.jpg" alt="Your Company" />
      </div>
      <span
        class="homepage relative hidden min-w-[300px] text-2xl font-semibold text-primary-950 sm:block"
        :class="{ 'is-home': isHomePage }"
        >ITALIC - THE KEYMAKER</span
      >
      <span
        class="homepage relative block min-w-[300px] text-2xl font-semibold text-primary-950 sm:hidden"
        :class="{ 'is-home': isHomePage }"
        >ITALIC KEYMAKER</span
      >
    </div>

    <!-- Desktop menu -->
    <div class="hidden md:ml-6 md:block">
      <div class="flex space-x-4">
        <RouterLink
          v-for="item in navigation"
          :key="item.route.name"
          :to="item.route.name"
          :class="[
            'flex items-center justify-center text-center text-surface-800 hover:text-primary-500',
            'rounded-md px-0 py-2 text-sm font-medium lg:px-3'
          ]"
          :exact-active-class="item.route.name === '/' ? '!text-primary-500' : ''"
          :active-class="item.route.name !== '/' ? '!text-primary-500' : ''"
          :aria-current="item.current ? 'page' : undefined"
        >
          {{ item.name }}
        </RouterLink>
      </div>
    </div>
  </nav>

  <!-- Mobile menu button -->
  <button
    @click="toggleMobileMenu"
    type="button"
    class="absolute right-4 top-4 z-[1002] inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-primary-500 focus:outline-none md:hidden"
    aria-controls="mobile-menu"
    :aria-expanded="mobileMenuOpen"
  >
    <span class="sr-only">Toggle main menu</span>
    <svg
      class="h-6 w-6"
      :class="{ hidden: mobileMenuOpen, block: !mobileMenuOpen }"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
    <svg
      class="h-6 w-6"
      :class="{ block: mobileMenuOpen, hidden: !mobileMenuOpen }"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>

  <!-- Mobile menu, show/hide based on menu state -->
  <div
    class="fixed inset-0 z-[1000] block transition-all duration-300 ease-in-out md:hidden"
    :class="{
      'pointer-events-none opacity-0 backdrop-blur-none': !mobileMenuOpen,
      'pointer-events-auto bg-black/50 opacity-100 backdrop-blur-sm': mobileMenuOpen
    }"
    @click="toggleMobileMenu"
  >
    <div
      class="fixed bottom-0 right-0 top-0 w-[300px] max-w-[75vw] bg-white shadow-xl transition-transform duration-300 ease-in-out"
      :class="{ 'translate-x-0': mobileMenuOpen, 'translate-x-full': !mobileMenuOpen }"
      @click.stop
    >
      <div class="mt-16 space-y-4 p-4">
        <!-- Menu items -->
        <RouterLink
          v-for="item in navigation"
          :key="item.route.name"
          :to="item.route.name"
          :class="[
            'text-surface-800 hover:text-primary-500',
            'block rounded-md px-3 py-2 text-base font-medium'
          ]"
          :exact-active-class="item.route.name === '/' ? 'bg-primary-500/80 text-white' : ''"
          :active-class="item.route.name !== '/' ? 'bg-primary-500/80 text-white' : ''"
          :aria-current="item.current ? 'page' : undefined"
          @click="toggleMobileMenu"
        >
          {{ item.name }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const mobileMenuOpen = ref(false)
const isHomePage = computed(() => route.path === '/')
const navigation = [
  { name: 'Home', route: { name: '/' } },
  { name: 'Filters', route: { name: '/filters' } },
  { name: 'Free choice of species', route: { name: '/filter-species' } },
  { name: 'Info', route: { name: '/info' } },
  { name: 'How to cite', route: { name: '/how-to-cite' } }
]

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}
</script>

<style scoped>
.container-fluid {
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  max-width: 1400px;
  padding-left: 1rem;
  padding-right: 1rem;
}
.is-home::after {
  content: 'M. Conti, S. Martellos, P.L. Nimis';
  position: absolute;
  font-size: 0.5em;
  left: 2px;
  top: 22px;
  z-index: -1;
  white-space: nowrap;
}
</style>

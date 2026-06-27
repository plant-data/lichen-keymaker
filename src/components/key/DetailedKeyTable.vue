<template>
  <table class="w-full table-fixed rounded-md bg-white text-sm">
    <thead class="-top-1 z-10 bg-white">
      <tr class="hidden bg-slate-100 lg:flex">
        <th class="w-[10%] border-b px-1 py-2 sm:w-[5%]">Couplet</th>
        <th class="w-[80%] border-b px-1 py-2 sm:w-[85%] md:w-[70%]">Lead Text</th>
        <th class="w-[10%] border-b px-1 py-2 md:w-[25%]">Lead to</th>
      </tr>
      <tr class="items-center bg-slate-100 lg:hidden">
        <th class="w-[100px] border-b px-1 py-2">Couplet</th>
        <th class="w-[80%] border-b px-1 py-2">Lead Text</th>
        <th class="w-[100px] border-b px-1 py-2">Lead to</th>
      </tr>
    </thead>
  </table>
  <table class="w-full table-fixed rounded-md bg-white text-sm">
    <!--    <thead class="sticky -top-1 z-10 bg-white">
      <tr class="bg-slate-100">
        <th class="w-[10%] border-b p-1 sm:w-[5%]">Couplet</th>
        <th class="w-[80%] border-b p-1 sm:w-[85%] md:w-[70%]">Lead Text</th>
        <th class="w-[10%] border-b p-1 md:w-[25%]">Lead to</th>
      </tr>
    </thead>-->
    <tbody>
      <template v-for="(item, index) in visibleSteps" :key="item.leadId">
        <tr
          :class="[{ 'border-b': !item.italicId }, index % 4 < 2 ? 'bg-white' : 'bg-primary-500/5']"
        >
          <td
            class="w-[10%] px-1 py-2 text-center font-semibold sm:w-[5%]"
            :id="`couplet${item.parentId}`"
          >
            {{ item.parentId }}
          </td>
          <td class="w-[80%] px-1 py-2 font-semibold tracking-wide sm:w-[85%] md:w-[70%]">
            <div v-html="item.leadText"></div>
            <img
              v-if="showLeadImages && item.leadImage"
              :src="leadImageToUrl(item.leadImage)"
              alt="Lead figure"
              loading="lazy"
              class="mt-2 h-auto max-h-[220px] w-auto max-w-full rounded-md object-contain sm:max-h-[280px]"
            />
          </td>
          <td class="w-[10%] px-1 py-2 font-medium md:w-[25%]">
            <a
              class="hidden text-sm text-blue-600 hover:underline md:block"
              v-if="item.italicId"
              :href="`${props.taxonUrl}${item.italicId}`"
              target="_blank"
            >
              {{ item.leadId }}
            </a>
            <a
              v-else
              @click.prevent="$emit('scroll-to-anchor', item.leadId)"
              href="#"
              class="text-sm text-blue-600 hover:underline"
              >{{ item.leadId }}</a
            >
          </td>
        </tr>
        <!-- default -->
        <tr
          v-if="item.species_description"
          class="hidden lg:table-row"
          :class="index % 4 < 2 ? 'bg-white' : 'bg-primary-500/5'"
        >
          <td class="w-[2%] border-b p-1"></td>
          <td class="w-[65%] border-b p-1">
            <span class="text-xs"><b>Description:</b></span>
            <span class="text-xs" v-html="item.species_description"> </span>
          </td>
          <td class="w-[10%] border-b p-1">
            <img
              v-if="item.speciesImage"
              :src="imageUrlToThumbNailUrl(item.speciesImage)"
              alt="Species Image"
              loading="lazy"
              class="h-auto max-h-[250px] min-h-[250px] w-full min-w-full rounded-md object-cover"
            />
          </td>
        </tr>
        <!--mobile-->
        <tr
          v-if="item.species_description"
          class="md:hidden"
          :class="index % 4 < 2 ? 'bg-white' : 'bg-primary-500/5'"
        >
          <td colspan="3" class="border-b p-1 text-right">
            <a
              class="text-sm font-medium text-blue-600 hover:underline"
              v-if="item.italicId"
              :href="`${props.taxonUrl}${item.italicId}`"
              target="_blank"
            >
              {{ item.leadId }}
            </a>
          </td>
        </tr>
        <tr
          v-if="item.species_description"
          class="lg:hidden"
          :class="index % 4 < 2 ? 'bg-white' : 'bg-primary-500/5'"
        >
          <td colspan="3" class="border-b p-1">
            <div class="flex items-center justify-center pb-1">
              <img
                v-if="item.speciesImage"
                :src="imageUrlToThumbNailUrl(item.speciesImage)"
                alt="Species Image"
                loading="lazy"
                class="h-auto max-h-[300px] min-h-[300px] w-[350px] min-w-[350px] max-w-full rounded-md object-cover"
              />
            </div>
            <span class="text-xs"><b>Description:</b></span>
            <span class="text-xs" v-html="item.species_description"> </span>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import type { KeyLead } from '@/types'
import { imageUrlToThumbNailUrl, leadImageToUrl } from '@/utils/imageUtils'

const props = defineProps<{
  visibleSteps: KeyLead[]
  taxonUrl: string
  showLeadImages?: boolean
}>()

defineEmits(['scroll-to-anchor'])
</script>

<template>
  <div class="flex w-full flex-col">
    <h1 class="text-title mb-8 mt-4 hidden text-center">ITALIC - THE KEYMAKER</h1>
    <div class="mt-8 [&>h2]:font-bold [&>p]:mb-4">
      <!--      <p>M. Conti, S. Martellos, P.L. Nimis</p>-->
      <div class="mb-8">
        <p class="">
          This tool generates keys to subsets of species defined by their distribution, traits and
          ecological requirements. The keys are obtained from
          <a
            href="https://dryades.units.it/home/index.php?procedure=ext_key_home&key_type=lic&key_id=1692"
            target="_blank"
            class="text-blue-600 hover:underline"
            >the general key to the lichens of Italy by P.L. Nimis</a
          >, by eliminating all species which do not share the specified characters. There are 3
          main filters:
        </p>
        <ul class="mb-4 pl-2">
          <li class="mt-2">
            <span class="font-semibold">1) General Filter:</span> filtering by some general
            characters (including/excluding species not known for Italy, or non-lichenized species,
            filtering by administrative region and/or ecoregion, commonness/rarity, genus or
            family).
          </li>
          <li>
            <span class="font-semibold">2) Trait Filter:</span> filtering by some morphological or
            chemical traits.
          </li>
          <li>
            <span class="font-semibold">3) Ecological Filter:</span> filtering by substrate-type,
            and by ecological indicator values.
          </li>
        </ul>
        Once a query is completed, the system produces a photo gallery of the filtered species, and
        a key to those species in 4 different formats. The option “Free choice of species” permits
        to select any subset of species to be included in a key. Before using the tool, reading the
        <RouterLink to="/info" class="text-blue-600 hover:underline">Info box</RouterLink> is
        advised.
      </div>
      <div class="flex justify-center">
        <RouterLink
          to="/filters/general"
          class="mb-8 grid h-10 w-full max-w-xl place-items-center rounded-md bg-primary-500 font-semibold text-surface-0 hover:bg-primary-600"
          >Generate a Key</RouterLink
        >
      </div>
      <p>
        The tool is still in the phase of testing. We would be grateful for feedback from users –
        write to nimis@units.it
      </p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
<style scoped>
.text-title {
  font-size: clamp(38px, 9vw, 50px);
  line-height: 1;
  /*  letter-spacing: -0.02em;*/
}
</style>

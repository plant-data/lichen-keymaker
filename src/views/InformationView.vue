<template>
  <div class="flex w-full flex-col">
    <h1 class="text-title mb-8 mt-4 hidden text-center">ITALIC KEYMAKER</h1>
    <div class="mt-8 [&>h2]:font-bold [&>p]:mb-4">
      <!--  start info here    -->

      <p class="mb-6">
        This tool generates keys to subsets of species defined by their distribution, traits and
        ecological requirements. The keys are obtained from
        <a
          href="https://dryades.units.it/home/index.php?procedure=ext_key_home&key_type=lic&key_id=1692"
          target="_blank"
          class="text-blue-600 hover:underline"
          >the general key to the lichens of Italy by P.L. Nimis</a
        >, by eliminating all species which do not share the specified characters. There are 3 main
        filters:
      </p>

      <h2 class="mb-[12px] mt-8 text-2xl font-semibold text-zinc-900">General Filter</h2>
      <div class="mb-12 space-y-3">
        <p>
          <span class="font-semibold">Taxa to work on:</span> the general key includes both the
          species actually known from Italy, and those known from neighbouring countries, whose
          presence in Italy is possible. If you have collected your lichen outside Italy, or if you
          are a professional lichenologists eager to discover species which are new to Italy, the
          first option is advised. Of course, with that option you cannot filter the species by
          administrative region, ecoregion, and commonness/rarity.
        </p>
        <p>
          <span class="font-semibold">Administrative region:</span> Italy has 20 administrative
          regions, but, following Nimis (2016), the region Friuli Venezia Giulia has been split into
          two separate Operational Geographic Units (Friuli and Venezia Giulia). A list and a map of
          the administrative regions is
          <a
            href="https://italic.units.it/index.php?procedure=base&t=59&c=60#distribution"
            class="text-blue-600 hover:underline"
            target="_blank"
            >here</a
          >
        </p>
        <p>
          <span class="font-semibold">Ecoregion:</span> nine ecoregions are distinguished within
          Italy, based on several tematic maps (elevation, precipitation etc.), and also taking into
          account the difference between the Tyrrhenian (humid) and Adriatic (dry) part of the
          Peninsula, which is relevant in influencing lichen distribution in the country. A map of
          the ecoregions is
          <a
            href="https://italic.units.it/index.php?procedure=base&t=59&c=60#commonness"
            class="text-blue-600 hover:underline"
            target="_blank"
            >here</a
          >
        </p>
        <p>
          <span class="font-semibold">Commonness / Rarity:</span> the related concepts of
          "commonness" and "rarity" are difficult to define, and hence intrinsically fuzzy ones. A
          given species might be fairly "common" in a narrow area, while it may be extremely rare
          when the area is made broader. For example, <i>Cetraria islandica</i> is fairly common in
          the Alps, rare along the Apennines, extremely rare in the mountains of Sicily, and
          certainly absent in the Po-Plain. As there is obviously no sense in specifying the
          "commonness" of a species nationwide, a commonness-rarity value was assigned to each
          species for each of the 9 ecoregions, on the basis of three main criteria : a) number of
          samples in the TSB lichen herbarium (% on the total for each phytoclimatic area), b)
          number of citations in the literature, c) an expert assessment used in particular cases
          (e.g. that of recently-described taxa). Commonness-rarity is expressed on a 8-class scale,
          from “extremely rare” to “extremely common”. Filtering the species by commonness/rarity
          may be useful e.g. for teachers who want to produce a key to the most common species of a
          given area.
        </p>
        <p>
          <span class="font-semibold">Non-lichenized species:</span> non-lichenized species are
          included only when: a) they are frequently treated by lichenologists because of their
          resemblance to lichenized species (e.g. <i>Chaenothecopsis</i>), b) they belong to genera
          with lichenized representatives (e.g. <i>Arthonia</i>). This option permits to
          include/exclude non-lichenized species from the query.
        </p>
        <p>
          <span class="font-semibold">Genus:</span> here you can ask for a key to species of a given
          genus. If combined with the following trait and ecological filters, you can ask for things
          like “a key of all silicicolous species of <i>Rinodina</i> with a K+ yellow thallus
          occurring below the alpine belt in Lombardy”. Generic delimitations strictly follow those
          adopted in ITALIC and are being continuously updated.
        </p>
        <p><span class="font-semibold">Family:</span> The same as before, but at family level.</p>
      </div>

      <h2 class="mb-[12px] mt-8 text-2xl font-semibold text-zinc-900">Trait Filter</h2>
      <p class="mb-12">
        Here, species can be filtered by some important morphological and chemical traits. In the
        future, further traits will be added. Notice that some species with ambiguous morphology or
        chemistry may appear under two contrasting options, e.g. some species of
        <i>Acarospora</i> appear both among those with a crustose thallus and among those with a
        squamulose thallus. The last option of this filter requires some attention by first-time
        users: it should be used for crustose phycolichens only, to include/exclude sterile crusts.
      </p>

      <h2 class="mb-[12px] mt-8 text-2xl font-semibold text-zinc-900">Ecological Filter</h2>
      <p class="mb-4">
        Using this filter, by combining different ecological parameters, you can define "virtual
        habitats" and obtain keys to the species which are most likely to occur there.
      </p>
      <ul class="mb-12 list-none space-y-3">
        <li>
          <span class="font-semibold">Substrata:</span> the substrata are:
          <ul class="list-disc pl-6">
            <li>bark and wood</li>
            <li>rocks (incl. artificial substrata such as glass and mortar)</li>
            <li>soil, terricolous mosses, and plant debris</li>
            <li>living leaves (foliicolous lichens)</li>
          </ul>
          The substrata are tailored to the ecological behaviour of the species in Italy. In
          strongly oceanic or strongly continental areas (hardly present in Italy) substrate shifts
          are common.
        </li>
        <li>
          <span class="font-semibold">Ecological indicator values:</span> these are expert
          assessments that qualitatively express the ecological range of species with respect to
          different factors. Those used here were originally proposed by Nimis (2016) and are being
          continuously updated in ITALIC: they specify, for each factor and for each species, a
          range on a 5-class ordinal scale, as follows:
          <ul class="mt-2 space-y-2 pl-4">
            <li>
              <span class="font-semibold">pH of the substratum</span>
              <ul class="pl-6">
                <li>
                  1 - on very acid substrata, such as lignum, conifer bark and very acid siliceous
                  rocks (quartzite, rhyolite, etc.)
                </li>
                <li>
                  2 - on acid substrata, such on non-eutrophicated bark of <i>Quercus</i>, and acid
                  siliceous rocks (granite, non-calciferous sandstones, etc.)
                </li>
                <li>
                  3 - on subneutral substrata, such as the bark of <i>Sambucus</i>, and base-rich
                  siliceous rocks (basalt, weakly calciferous siliceous rocks, etc.)
                </li>
                <li>
                  4 - on slightly basic substrata, such as dust-covered bark, strongly calciferous
                  siliceous rocks (schists, sandstones, etc.)
                </li>
                <li>
                  5 - on basic substrata, mostly calcareous soil and rocks (pure limestone, mortar,
                  etc.)
                </li>
              </ul>
            </li>
            <li>
              <span class="font-semibold">Light (solar irradiation)</span>
              <ol class="pl-6">
                <li>1 - in very shaded situations, e.g. deep gorges, closed evergreen forests</li>
                <li>
                  2 - in shaded situations, such in close-canopied deciduous forests, or in rather
                  open evergreen forests
                </li>
                <li>
                  3 - in sites with plenty of diffuse light but scarce direct solar irradiation,
                  such as in rather open-canopied deciduous woodlands, and north-facing surfaces in
                  exposed sites
                </li>
                <li>
                  4 - in sun-exposed sites, but avoiding extreme solar irradiation, such as on
                  horizontal surfaces in exposed sites.
                </li>
                <li>
                  5 - in sites with very high direct solar irradiation, such as on the southern side
                  of exposed surfaces.
                </li>
              </ol>
            </li>
            <li>
              <span class="font-semibold">Xerophytism (aridity)</span>
              <ol class="pl-6">
                <li>
                  1 - hydro- and hygrophytic, in aquatic or marine situations, or in sites with a
                  very high frequency of fog
                </li>
                <li>2 - rather hygrophytic, intermediate between 1 and 2</li>
                <li>3 - mesophytic</li>
                <li>4 - xerophytic, but absent from extremely arid stands</li>
                <li>5 - very xerophytic.</li>
              </ol>
            </li>
            <li>
              <span class="font-semibold"
                >Eutrophication (incl. deposition of dust and nitrogen compounds):</span
              >
              <ol class="pl-6">
                <li>1 - not resistant to eutrophication</li>
                <li>2 - resistant to a very weak eutrophication</li>
                <li>3 - resistant to a weak eutrophication</li>
                <li>4 - occurring in rather eutrophicated situations</li>
                <li>5 - occurring in highly eutrophicated situations.</li>
              </ol>
            </li>
          </ul>
        </li>
        <li>
          The predictivity of these values may vary considerably among species, depending on the
          degree of knowledge on their ecology. For poorly known species the values are tentative,
          and mostly based on information available in the literature. For species known from the
          type collection only, they are based on the info contained in the protologue or on the
          envelope of the type material. We suggest to use the indicator values with prudence, until
          you have understood how they work. They may be, however, particularly useful to
          differentiate between different rock types such as limestone and acid siliceous rocks, or
          between shaded and very sunny habitats.
        </li>
        <li>
          <span class="font-semibold">Poleotolerance:</span> this value points to the tendency of a
          lichen to occur in areas with different degrees of human disturbance. It is expressed on 4
          classes, as follows:
          <ol class="pl-6">
            <li>3 - species present in heavily disturbed areas, incl. large towns</li>
            <li>
              2 - species present in moderately disturbed areas (agricultural areas, small
              settlements etc.)
            </li>
            <li>1 - species present in natural or semi-natural habitats</li>
            <li>
              0 - species which exclusively occur on old trees in ancient, undisturbed forests.
            </li>
          </ol>
          Contrary to the other values, the value "0" has been assigned to epiphytic species only,
          since it is useful to point out indicators of long ecological continuity of forests.
          Poleotolerance values can be used to obtain keys to e.g. lichens occurring in large towns.
        </li>
        <li>
          <span class="font-semibold">Altitudinal distribution:</span> This value reflects the
          distribution of species along an altitudinal gradient, mainly defined by potential
          vegetation. It can be used as a proxy of the ecoregions, if you have chosen to include in
          the query also the species not actually known from Italy. The altitudinal belts are:
          <ol class="pl-6">
            <li>
              1 - eu-Mediterranean belt (potential vegetation: evergreen <i>Quercus ilex</i> forest)
            </li>
            <li>2 - submediterranean belt (deciduous <i>Quercus-Carpinus</i> forests)</li>
            <li>3 - montane belt (<i>Fagus</i> forests, marking treeline in the Apennines)</li>
            <li>
              4 - subalpine and oroboreal belts of the Alps (natural <i>Picea abies</i>, and
              <i>Larix-Pinus cembra</i> stands)
            </li>
            <li>5 - above treeline (both Alpine and oromediterranean)</li>
            <li>6 - nival belt of the Alps.</li>
          </ol>
          For Sardegna, which hosts a very peculiar vegetation somehow resembling that of parts of
          the Iberian peninsula, where the beech belt is missing, the altitudinal subdivision was
          adjusted to the local situation. The altitudinal range of species reflects their behaviour
          in Italy. If you have collected your lichen in other parts of Europe, consider that the
          situation in your area may be quite different.
        </li>
        <li>
          <span class="font-semibold">Special requirements for water:</span>
          <ul class="pl-6">
            <li>u – species growing on surfaces rarely wetted by rain (e.g. under overhangs)</li>
            <li>
              w – species growing on otherwise dry surfaces with short periods of water seepage
              after rain
            </li>
            <li>l – species which are periodically submerged (e.g. in creeks)</li>
          </ul>
        </li>
        <li>
          <span class="font-semibold">Species of metal-rich substrata:</span> you can limit your
          query to species growing on metal-rich siliceous rocks, or exclude these species from the
          query.
        </li>
        <li>
          <span class="font-semibold">Phytoclimatic range:</span>
          <ul class="pl-6">
            <li>oc - restricted to humid-warm, oceanic areas</li>
            <li>
              suboc - most common in areas with a humid-warm climate (e.g. most of Tyrrhenian Italy)
            </li>
            <li>
              subc - subcontinental: restricted to areas with a dry-subcontinental climate (e.g. dry
              Alpine valleys, parts of Mediterranean Italy)
            </li>
          </ul>
        </li>
        <li>
          <span class="font-semibold">Costal species:</span> you can limit your query to species
          bound to coastal-maritime situation, or exclude these species from the query. If you use
          this parameter to define a "virtual habitat" consider however that the system will produce
          a key only to strictly coastal species, while coastal habitats also host many other
          species with a much broader ecology.
        </li>
        <li>
          <span class="font-semibold">Parasitic species:</span> you can limit your query to species
          growing on other lichens, or exclude these species from the query. If you want to limit
          your query to lichenicolous lichens, remember to exclude non-lichenized species in the
          general filter.
        </li>
      </ul>

      <h2 class="mb-[12px] mt-8 text-2xl font-semibold text-zinc-900">The Output</h2>
      Once a query is completed, the system produces:
      <div class="mb-12">
        <ul class="mb-2 space-y-1 pl-6">
          <li>
            A) A photo gallery of the species resulting from the query. Clicking on an image you may
            see more pictures of the species, if available.
          </li>
          <li>
            B) A list of the species resulting from the query. Clicking on a species name, you are
            redirected to the corresponding taxon page in ITALIC.
          </li>
          <li>
            C) A key in 4 different formats (the first 3 are printable):
            <ul class="list-disc pl-6">
              <li>Illustrated (with pictures of species and descriptions),</li>
              <li>Not illustrated (with descriptions only),</li>
              <li>Plain (only the dichotomous skeleton, without pictures and descriptions),</li>
              <li>Interactive (also including pictures of characters).</li>
            </ul>
          </li>
        </ul>
        <p>
          Clicking on a species name in any type of key, you are redirected to the corresponding
          taxon page of ITALIC. The function “adjust key” permits to delete some species from a key:
          it may be useful e.g. for teachers who want to produce a printable key, for example to the
          epiphytic lichens of a given city, excluding species that they have never found in their
          area, or which make the key too difficult for their students.
        </p>
        <p class="mt-2">
          Every key is conserved by the system: if you intend to use a given key several times, just
          copy-paste its URL. You can also incorporate that URL into an external, dedicated web page
          (e.g. on the lichens of a Natural Park, or on a school project of biomonitoring).
        </p>
      </div>

      <h2 class="mb-[12px] mt-8 text-2xl font-semibold text-zinc-900">Exemples of queries</h2>
      <ul class="mb-6 list-disc space-y-1 pl-6">
        <li>A key to all species potentially occurring in Italy (c. 3,300 species)</li>
        <li>A key to all epiphytic lichens occurring in the beech forests of Calabria</li>
        <li>A key to lichenicolous lichens on siliceous rocks in the alpine belt of Lombardy</li>
        <li>
          A key to epiphytic lichens occurring on isolated wayside trees in the plains of the Veneto
          region
        </li>
        <li>
          A key to all epiphytic crustose <i>Teloschistaceae</i> with a yellow thallus reacting K+
          red occurring in Sicily
        </li>
        <li>A key to all silicicolous lichens with apothecia and muriform, brown ascospores</li>
        <li>
          A key to all calcicolous crustose, sterile phycolichens with a Trentepohlioid photobiont
          occurring below treeline
        </li>
        <li>
          A key to all epiphytic <i>Rinodina</i> species with a K+ yellow thallus occurring in
          Tyrrhenian Italy
        </li>
        <li>A key to all sorediate, foliose, epiphytic lichens occurring near Trieste</li>
        <li>
          A key to all lichens occurring in the alpine belt, including those known only from
          neighbouring countries
        </li>
        <li>
          A key to all silicicolous pyrenocarpous lichens with septate ascospores occurring in
          Mediterranean Italy
        </li>
      </ul>
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

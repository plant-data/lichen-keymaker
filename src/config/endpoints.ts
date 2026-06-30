export const endpoints = {
  fullKey: import.meta.env.VITE_FULL_KEY_API,
  speciesList: import.meta.env.VITE_SPECIES_API,
  generaList: import.meta.env.VITE_GENERA_API,
  familiesList: import.meta.env.VITE_FAMILIES_API,
  matchName: import.meta.env.VITE_MATCH_API,
  recordsFromKey: import.meta.env.VITE_RECORDS_FROM_KEY_API,
  keyFromFilters: import.meta.env.VITE_KEY_FROM_FILTERS_API,
  keyFromRecords: import.meta.env.VITE_KEY_FROM_RECORDS_API,
  keyFromSpecies: import.meta.env.VITE_KEY_FROM_SPECIES_API
}

export const paths = {
  imagesPath: import.meta.env.VITE_IMAGES_PATH,
  taxonPagePath: import.meta.env.VITE_TAXON_PAGE_PATH
}

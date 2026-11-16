/**
 * Where every number comes from. The "How we calculate" panel lists these so families can
 * check the science behind each recommendation.
 */

/** One cited source and what the app uses it for. */
export interface Source {
  id: string;
  usedFor: string;
  citation: string;
  url: string;
}

export const SOURCES: readonly Source[] = [
  {
    id: 'open-meteo',
    usedFor: 'Live and forecast PM2.5, PM10, NO₂, ozone, AQI and boundary-layer height',
    citation: 'Open-Meteo Air Quality API (Copernicus CAMS forecasts)',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  {
    id: 'epa-aqi',
    usedFor: 'AQI bands and the guidance for each',
    citation: 'US EPA AirNow, AQI Basics',
    url: 'https://www.airnow.gov/aqi/aqi-basics/',
  },
  {
    id: 'cigarettes',
    usedFor: 'Cigarettes-equivalent: 22 µg/m³ of PM2.5 for a day ≈ one cigarette',
    citation: 'Muller & Muller, Air Pollution and Cigarette Equivalence, Berkeley Earth (2015)',
    url: 'https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/',
  },
  {
    id: 'breathing',
    usedFor: 'Breathing two to four times faster during light and moderate activity',
    citation: 'US EPA Exposure Factors Handbook, chapter 6: inhalation rates (2011)',
    url: 'https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6',
  },
  {
    id: 'mass-balance',
    usedFor: 'Indoor PM2.5 model and purifier sizing by clean air delivery rate (CADR)',
    citation: 'US EPA, Guide to Air Cleaners in the Home (2018)',
    url: 'https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home',
  },
  {
    id: 'diy-box',
    usedFor: 'About 1000 m³/h from a box fan with four MERV-13 filters',
    citation:
      'Dal Porto et al., Characterizing the performance of a DIY box fan air filter, Aerosol Science and Technology (2022)',
    url: 'https://doi.org/10.1080/02786826.2022.2054674',
  },
  {
    id: 'household-fuel',
    usedFor: 'Kitchen smoke from biomass, kerosene, LPG and electric cooking',
    citation: 'WHO guidelines for indoor air quality: household fuel combustion (2014)',
    url: 'https://www.who.int/publications/i/item/9789241548885',
  },
  {
    id: 'co2-factors',
    usedFor: 'CO₂ per passenger-kilometre for each way of commuting',
    citation: 'UK DESNZ, Greenhouse gas reporting: conversion factors (2024)',
    url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
  },
  {
    id: 'mosquito-coils',
    usedFor: 'One mosquito coil ≈ 75–137 cigarettes of fine particulate',
    citation:
      'Liu et al., Mosquito coil emissions and health implications, Environmental Health Perspectives (2003)',
    url: 'https://doi.org/10.1289/ehp.6286',
  },
  {
    id: 'plants',
    usedFor: 'Why houseplants do not clean indoor air',
    citation: 'Cummings & Waring, Potted plants do not improve indoor air quality, JESEE (2020)',
    url: 'https://doi.org/10.1038/s41370-019-0175-9',
  },
];

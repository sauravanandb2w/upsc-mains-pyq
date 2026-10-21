/**
 * Mistake Book — edit this file when you add errors from PYQs or mocks.
 * subject keys: polity | history | geography | economy | environment | science | culture | current | misc
 */
window.MISTAKE_BOOK = {
  pyq: {
    polity: [],
    history: [],
    geography: [
      {
        exam: "UPSC CSE Prelims",
        year: 2025,
        qref: "Geography — countries with most time zones (paraphrased)",
        wrong: "Ranked by mainland size only (e.g. assumed Russia alone is #1) or ignored overseas territories / Pacific & Caribbean dependencies when counting zones.",
        correct: "TOP 10 (zone count includes territories):\n• France — 13 (largest: global overseas — Society, Austral, Tuamotu at UTC−10; spans UTC−12 to east)\n• Russia — 11 (wide east–west; Kaliningrad separated from core)\n• United States — 11 (4 contiguous + Alaska + Hawaii + 5 from Pacific/Caribbean territories; Baker/Howland UTC−12, Wake UTC+12)\n• Australia — 9 (mainland UTC+8 to +10; Heard/McDonald +5, Christmas +7, Norfolk +11; Tasmania separate landmass)\n• United Kingdom — 9 (Pitcairn UTC−8 to BIOT UTC+6; London UTC±0)\n• Canada — 6 (BC/Yukon west to Newfoundland; DST shifts many zones seasonally)\n• Denmark — 5 (metropolitan UTC+1; Greenland has most of the rest, Pituffik UTC−4)\n• New Zealand — 5 (main + Cook + Chatham; Niue vs Tokelau date-line split)\n• Brazil — 4 (UTC−2 atoll east to UTC−5 Amazonas west)\n• Mexico — 4 (Quintana Roo −5, most −6, Baja Sur belt −7, Baja Cal −8)",
        note: "UTC global range about UTC−12 to UTC+14; zones are political not neat meridians. GMT = UTC in practice. China uses ONE zone (Beijing time) despite geographic span — contrast question trap."
      },
      {
        exam: "UPSC CSE Prelims",
        year: 2025,
        qref: "Geography — multi-zone countries (table revision)",
        wrong: "Forgot smaller multi-zone states when options listed Chile, Indonesia, Kiribati, etc.",
        correct: "Also 3 zones: Chile, Indonesia, Kiribati.\n2 zones each: DRC, Ecuador, Micronesia, Kazakhstan, Netherlands (Kingdom), Mongolia, PNG, Portugal, South Africa, Spain.\nMemorize top-5 ladder: France 13 → Russia/US 11 → Australia/UK 9 → Canada 6 → Denmark/NZ 5.",
        note: "1884 conference placed much of the date line in the Pacific. France #1 is overseas empire footprint, not metropolitan area vs Russia."
      }
    ],
    economy: [],
    environment: [],
    science: [],
    culture: [],
    current: [],
    misc: []
  },
  mock: {
    polity: [],
    history: [],
    geography: [],
    economy: [],
    environment: [],
    science: [],
    culture: [],
    current: [],
    misc: []
  }
};

/* Example entry (delete or replace when you add real mistakes):
{
  exam: "UPSC CSE Prelims",
  year: 2024,
  qref: "Q62",
  wrong: "What you believed / chose",
  correct: "Fact that fixes it",
  note: "Optional one-line trap or mnemonic"
}
*/

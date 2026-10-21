/**
 * Mistake Book — one entry per question.
 * Rich text in wrong / correct / note:
 *   **bold**  *italic*  __underline__
 *   [red]…[/red] [forest] [navy] [amber] [teal] [coral] — coloured emphasis
 */
window.MISTAKE_BOOK = {
  pyq: {
    polity: [],
    history: [],
    geography: [
      {
        exam: "UPSC CSE Prelims",
        year: 2025,
        qref: "Geography — countries with most time zones",
        wrong: "Ranked by **mainland size only** (e.g. Russia #1) or ignored __overseas territories__ when counting zones.",
        correct: "**TOP 10** (official zone count **includes territories**):\n\n• [coral]France — 13[/coral] — overseas global footprint (Society, Austral, Tuamotu UTC−10; among last to welcome New Year)\n• [navy]Russia — 11[/navy] — east–west span; Kaliningrad exclave\n• [navy]United States — 11[/navy] — 4 contiguous + Alaska + Hawaii + 5 Pacific/Caribbean (Baker/Howland UTC−12, Wake UTC+12)\n• Australia — 9 — mainland UTC+8…+10; Heard/McDonald +5, Christmas +7, Norfolk +11\n• United Kingdom — 9 — Pitcairn UTC−8 → BIOT UTC+6; London UTC±0\n• Canada — 6 — Pacific to Newfoundland; many regions use DST\n• Denmark — 5 — metro UTC+1; **Greenland** (Pituffik UTC−4, etc.)\n• New Zealand — 5 — main + Cook + Chatham; Niue / Tokelau date-line split\n• Brazil — 4 — UTC−2 (atolls) to UTC−5 (Amazonas)\n• Mexico — 4 — Quintana Roo −5, bulk −6, Baja belts −7 / −8\n\n**Also 3 zones:** Chile, Indonesia, Kiribati.\n**2 zones each:** DRC, Ecuador, Micronesia, Kazakhstan, Netherlands (Kingdom), Mongolia, PNG, Portugal, South Africa, Spain.\n\n**Ladder:** [gold]13 → 11 → 9 → 6 → 5[/gold] (France → Rus/US → Aus/UK → Canada → Den/NZ).",
        note: "UTC ≈ [teal]UTC−12 to UTC+14[/teal]; zones are *political*, not neat meridians. **GMT = UTC** in practice. *China = one zone* (Beijing time) despite width — classic trap. 1884 date line mostly in Pacific."
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

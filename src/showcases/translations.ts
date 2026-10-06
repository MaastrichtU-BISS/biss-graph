/**
 * Dutch texts for the showcases' title cards and captions, keyed by showcase id and scene.
 * Anything missing falls back to the English in the showcase itself; text drawn inside the
 * animations stays English.
 */
export type ShowcaseTexts = {
  eyebrow?: string;
  tagline?: string;
  outro?: string;
  captions?: Record<string, string>;
};

export const NL: Record<string, ShowcaseTexts> = {
  "case-law-explorer": {
    eyebrow: "Onderdeel van Juridische onderzoekssoftware bij BISS",
    tagline: "Ontdek precedenten in een netwerk van rechterlijke uitspraken",
    outro: "Open source, gebouwd bij BISS voor juridische onderzoekers en praktijkjuristen.",
    captions: {
      cite: "Elke rechterlijke uitspraak verwijst naar eerdere uitspraken.",
      gather: "Case Law Explorer verzamelt uitspraken van Nederlandse en Europese rechters…",
      hubs: "…en verbindt ze in één citatienetwerk. De meest geciteerde uitspraken springen eruit.",
      search: "Zoek een rechtsgebied en volg de precedenten terug naar de bron.",
      time: "En zie hoe de rechtspraak zich in de tijd ontwikkelt.",
    },
  },
  lawnotation: {
    eyebrow: "Onderdeel van Juridische onderzoekssoftware bij BISS",
    tagline: "Samen juridische teksten annoteren",
    outro: "Open source en gratis, gebouwd bij BISS voor juridische onderzoekers en praktijkjuristen.",
    captions: {
      docs: "Upload juridische documenten: uitspraken, contracten, wetgeving. Als PDF, HTML of platte tekst.",
      assign: "Wijs ze toe aan een team van annotatoren, en laat Lawnotation het werk verdelen.",
      annotate: "Annotatoren markeren wat er in de tekst toe doet.",
      agree: "Vergelijk hun werk: Lawnotation meet hoe goed annotatoren het eens zijn.",
      publish: "Exporteer de annotaties als JSON, of publiceer ze zodat anderen ze kunnen vinden en hergebruiken.",
    },
  },
  digimach: {
    eyebrow: "Een BISS-project gefinancierd door Interreg Maas-Rijn",
    tagline: "Slimme, duurzame en verbonden maakindustrie",
    outro: "BISS bouwt het meertalige DigiMach-platform, dat maakbedrijven over de grens verbindt.",
    captions: {
      region: "In de grensregio van Nederland, België en Duitsland werken veel kleine maakbedrijven.",
      challenge: "Zelf digitaliseren is lastig: welke tools, wat kost het, wie leidt het personeel op?",
      hub: "DigiMach verbindt ze in één grensoverschrijdende innovatiehub, samen met universiteiten en overheden.",
      platform: "BISS bouwt het DigiMach-platform: tools beoordelen, personeel trainen en ervaringen delen, in je eigen taal.",
      transform: "Zo worden maakbedrijven in de regio concurrerender, weerbaarder en duurzamer.",
    },
  },
  benedrone: {
    eyebrow: "Een BISS-project gefinancierd door Interreg Vlaanderen-Nederland",
    tagline: "Medische drones over de Nederlands-Belgische grens",
    outro: "Zuid-Nederland en Vlaanderen voorbereiden op verantwoorde, grensoverschrijdende medische drones.",
    captions: {
      emergency: "Een noodgeval, net over de grens.",
      road: "Over de weg moet hulp zich een weg banen. Elke minuut telt.",
      drone: "Een medische drone vliegt er rechtstreeks heen, over de grens.",
      cargo: "Met wat levens redt: defibrillatoren, bloed, zelfs organen.",
      rules: "Maar welke regels gelden er in de lucht? BeNeDrone zoekt uit hoe je veilig, legaal en verantwoord vliegt.",
      scale: "Een model voor andere Europese grensregio's, klaar voor de nieuwe Europese droneregels.",
    },
  },
};

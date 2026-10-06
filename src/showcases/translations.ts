import { lang } from "../i18n";

/**
 * Dutch texts for every showcase title card and caption, keyed by showcase id and scene.
 */
export type ShowcaseTexts = {
  title?: string;
  eyebrow?: string;
  tagline?: string;
  outro?: string;
  captions?: Record<string, string>;
};

export const NL: Record<string, ShowcaseTexts> = {
  "case-law-explorer": {
    eyebrow: "Onderdeel van Software voor juridisch onderzoek bij BISS",
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
    eyebrow: "Onderdeel van Software voor juridisch onderzoek bij BISS",
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
      drone: "Een medische drone kan een directe route over de grens nemen.",
      cargo: "Ze vervoeren levensreddende middelen: AED's, bloed en zelfs organen.",
      rules: "Een vlucht vraagt meer dan een route: ook de regels, logistiek en het draagvlak moeten kloppen.",
      scale: "BeNeDrone ontwikkelt een model dat andere grensregio's kunnen gebruiken.",
    },
  },
  better: {
    eyebrow: "Een BISS-project, gefinancierd door Horizon Europa",
    tagline: "Verantwoorde data-analyse in de zorg",
    outro: "Privacyvriendelijk gezondheidsonderzoek in Europa: 14 partners, 8 landen en 3 toepassingen voor zeldzame ziekten.",
    captions: {
      problem: "Voor onderzoek naar zeldzame ziekten zijn gegevens van veel ziekenhuizen nodig. Patiëntgegevens kun je niet zomaar samenvoegen.",
      train: "Daarom brengt BETTER de analyse naar de gegevens: de Personal Health Train.",
      local: "Elk ziekenhuis voert de analyse zelf uit. Patiëntdossiers verlaten het ziekenhuis niet.",
      results: "Alleen samengevoegde resultaten gaan terug, ook over de grens.",
      ethics: "BISS neemt ethische, juridische en maatschappelijke vragen mee in elke stap van de data-analyse.",
    },
  },
  fair4ai: {
    eyebrow: "Een BISS-project voor slimme zorg",
    tagline: "AI-modellen bruikbaar maken in de praktijk",
    outro: "Vindbare, toegankelijke, interoperabele en herbruikbare AI-modellen, te beginnen in de zorg.",
    captions: {
      papers: "Veel AI-modellen voor de zorg zijn moeilijk te vinden, uit te voeren of opnieuw te gebruiken.",
      describe: "FAIRmodels.org beschrijft elk model met gestandaardiseerde, machineleesbare metadata.",
      find: "Zo kunnen mensen én software een model en de bijbehorende beschrijving vinden.",
      pack: "Elk model krijgt een container met dezelfde REST-API, zodat het overal kan draaien.",
      validate: "FAIVOR haalt een model op en test het met gegevens van het ziekenhuis. Die gegevens blijven daar.",
      report: "De testresultaten gaan terug naar de modelcatalogus, zodat het volgende ziekenhuis ze kan bekijken.",
    },
  },
  "flying-forward": {
    eyebrow: "Een BISS-project, gefinancierd door EU Horizon 2020",
    tagline: "Drones die zelfstandig en volgens de regels vliegen",
    outro: "Flying Forward maakt droneregels machineleesbaar, zodat autonome drones zich overal aan de regels kunnen houden.",
    captions: {
      missions: "Zelfvliegende drones kunnen pakketten, maaltijden en AED's bezorgen of gebouwen inspecteren.",
      layers: "Maar welke regels gelden? Die van de regio, het land én de EU, allemaal tegelijk.",
      code: "Flying Forward vertaalt droneregels naar instructies die een machine kan lezen en uitvoeren.",
      fly: "Zo controleert de drone zelf de regels en plant hij een toegestane route.",
      labs: "Getest in proeftuinen in vijf Europese steden.",
    },
  },
  biss: {
    title: "Wat is BISS?",
    eyebrow: "Brightlands Institute for Smart Society van de Universiteit Maastricht",
    tagline: "Mensgerichte AI en datawetenschap voor een slimme, inclusieve samenleving",
    outro: "Waar wetenschap en verantwoorde innovatie samenkomen. Al tien jaar, en we gaan door.",
    captions: {
      map: "BISS is een instituut van de Universiteit Maastricht op de Brightlands Data & AI Campus in Heerlen, Limburg.",
      team: "Het team verenigt ethiek, recht, privacy, consumentengedrag, neurowetenschap en datawetenschap.",
      decade: "BISS werd opgericht in 2016 en telt na tien jaar 24 projecten en 35 partners.",
      domains: "Die projecten raken aan zorg, financiën, recht, publieke dienstverlening, mobiliteit en industrie.",
      how: "Vraagstuk, team, prototype, resultaat: samen met Sittard-Geleen maakt BISS de bijstandsaanvraag duidelijker.",
      partners: "BISS werkt samen met partners in Nederland en elders in Europa.",
      funders: "BISS-projecten krijgen ook steun van NWO en de Europese Unie.",
    },
  },
};

/** Visible labels painted into the films' canvases. Names, brands and code stay as supplied. */
const CANVAS_NL: Record<string, string> = {
  // About BISS
  "AMSTERDAM": "AMSTERDAM", "ROTTERDAM": "ROTTERDAM", "EINDHOVEN": "EINDHOVEN",
  "DÜSSELDORF": "DÜSSELDORF", "COLOGNE": "KEULEN", "AACHEN": "AKEN",
  "HASSELT": "HASSELT", "BRUSSELS": "BRUSSEL", "LIÈGE": "LUIK",
  London: "Londen", Berlin: "Berlijn", Paris: "Parijs", Milan: "Milaan",
  "Recognising sound": "Geluid herkennen", "AI customer support": "AI-klantenservice",
  "Livestock feed": "Diervoeding", "Automated financial advice": "Geautomatiseerd financieel advies",
  "Legal research software": "Software voor juridisch onderzoek", "Clear welfare application": "Duidelijke bijstandsaanvraag",
  "VR: financial pressure": "VR: financiële druk", "Prevent factory shutdowns": "Fabrieksstilstand voorkomen",
  "Health and the brain": "Gezondheid en het brein", Finance: "Financiën", Law: "Recht",
  "Public services": "Publieke dienstverlening", Mobility: "Mobiliteit",
  "Industry and business": "Industrie en bedrijfsleven", "European Union": "Europese Unie",
  "Province of Limburg": "Provincie Limburg", "Ministry of BZK": "Ministerie van BZK",
  "European Union (Horizon Europe)": "Europese Unie (Horizon Europa)",
  "European Union (Horizon 2020)": "Europese Unie (Horizon 2020)",
  "European Union (Interreg Meuse-Rhine)": "Europese Unie (Interreg Maas-Rijn)",
  "Interreg Flanders–Netherlands (ERDF)": "Interreg Vlaanderen-Nederland (EFRO)",
  "Walloon Region": "Waals Gewest", "Ministry of Economic Affairs": "Ministerie van Economische Zaken",
  "University of Valencia": "Universiteit van Valencia",
  "Maastricht University": "Universiteit Maastricht", Challenge: "Vraagstuk", Team: "Team",
  Prototype: "Prototype", Impact: "Resultaat", "Data science & AI": "Datawetenschap en AI",
  Ethics: "Ethiek", Privacy: "Privacy", "Consumer behaviour": "Consumentengedrag",
  Neuroscience: "Neurowetenschap", "BISS is founded": "BISS wordt opgericht",
  "KennisAs grant, Province of Limburg": "KennisAs-subsidie, Provincie Limburg",
  "Scientific Director 2016–2018": "Wetenschappelijk directeur 2016–2018",
  "Scientific Lead 2019–2021": "Wetenschappelijk leider 2019–2021",
  "10 years of BISS": "10 jaar BISS", "An independent institute": "Een zelfstandig instituut",
  projects: "projecten", partners: "partners", presentations: "presentaties", people: "mensen",
  PROJECTS: "PROJECTEN", PARTNERS: "PARTNERS", PRESENTATIONS: "PRESENTATIES",
  "Municipality of Sittard-Geleen": "Gemeente Sittard-Geleen", EUROPE: "EUROPA", "FUNDED BY": "GEFINANCIERD DOOR",
  "R = 100 km": "R = 100 km",
  "Applying for welfare means many documents and proofs. Sittard-Geleen asked BISS to make it easier.":
    "Een bijstandsaanvraag vraagt veel documenten en bewijsstukken. Sittard-Geleen vroeg BISS het eenvoudiger te maken.",
  "Data science and behavioural science, working closely with the municipality.":
    "Datawetenschap en gedragswetenschap, in nauwe samenwerking met de gemeente.",
  "Customer journey mapped, a blueprint, then a prototype of the new application process.":
    "Eerst de klantreis in kaart, daarna een blauwdruk en een prototype voor de nieuwe aanvraag.",
  "“We were able to truly take steps toward a simpler, clearer, and more accessible application process.”":
    "“Samen hebben we stappen gezet naar een eenvoudiger, duidelijker en toegankelijker aanvraagproces.”",
  // BeNeDrone
  "MAASTRICHT · NL": "MAASTRICHT · NL", "FLANDERS · BE": "VLAANDEREN · BE",
  DEFIBRILLATOR: "AED", BLOOD: "BLOED", "DONOR ORGAN": "DONORORGAAN",
  LEGAL: "JURIDISCH", LOGISTICAL: "LOGISTIEK", SOCIETAL: "MAATSCHAPPELIJK",
  "Airspace and permits": "Luchtruim en vergunningen", "Reliable delivery": "Betrouwbare levering",
  "Public trust": "Publiek vertrouwen", "RESTRICTED AIRSPACE": "BEPERKT LUCHTRUIM",
  // BETTER
  Ethical: "Ethisch", Legal: "Juridisch", Societal: "Maatschappelijk",
  FIREWALL: "FIREWALL", Researcher: "Onderzoeker", Aggregator: "Samenvoegen",
  "One central data pool": "Eén centrale gegevensbron", "not allowed across borders": "niet toegestaan over de grens",
  "Personal Health Train": "Personal Health Train", "an analysis, packed in a container": "een analyse verpakt in een container",
  "Patient records": "Patiëntdossiers", "never leave the hospital": "verlaten het ziekenhuis niet",
  "Aggregated result": "Samengevoegd resultaat", "summary statistics only": "alleen samenvattende statistiek",
  "Combined insight": "Gezamenlijk inzicht", "not a single patient record moved": "geen enkel patiëntdossier verplaatst",
  "Data science lifecycle": "Cyclus van dataonderzoek",
  "with tools from the social sciences and humanities": "met inzichten uit de sociale en geesteswetenschappen",
  Question: "Onderzoeksvraag", Data: "Gegevens", Analysis: "Analyse", Model: "Model", Use: "Toepassing",
  // Case Law Explorer
  "Dutch courts": "Nederlandse rechters", "Court of Justice of the EU": "Hof van Justitie van de EU",
  "European Court of Human Rights": "Europees Hof voor de Rechten van de Mens",
  liability: "aansprakelijkheid", privacy: "privacy", employment: "arbeidsrecht", tax: "belastingrecht", migration: "migratierecht",
  // DigiMach
  Netherlands: "Nederland", Belgium: "België", Germany: "Duitsland",
  "Which tools?": "Welke hulpmiddelen?", "What does it cost?": "Wat kost het?",
  "Who trains our staff?": "Wie leidt ons personeel op?", Competitive: "Concurrerend",
  Resilient: "Weerbaar", Sustainable: "Duurzaam", Universities: "Universiteiten",
  Governments: "Overheden", "Training centres": "Opleidingscentra",
  "DigiMach platform": "DigiMach-platform", "Digital Innovation Hub": "Digitale innovatiehub",
  "Predictive maintenance": "Voorspellend onderhoud", "Robot welding basics": "Basis robotlassen",
  "Energy monitoring": "Energieverbruik volgen", "Our first cobot is running!": "Onze eerste cobot draait!",
  // FAIR4AI
  Findable: "Vindbaar", Accessible: "Toegankelijk", Interoperable: "Interoperabel", Reusable: "Herbruikbaar",
  "Which inputs?": "Welke invoer?", "Which version?": "Welke versie?", "How do I run it?": "Hoe voer ik het uit?",
  "Model name": "Modelnaam", "Model type": "Modeltype", Inputs: "Invoer", Output: "Uitvoer",
  "Intended use": "Beoogd gebruik", Performance: "Prestaties", License: "Licentie",
  "Example risk model": "Voorbeeld van een risicomodel", "Logistic regression": "Logistische regressie",
  "age, tumour stage, size": "leeftijd, tumorstadium, grootte",
  "Probability of the outcome": "Kans op de uitkomst", "Clinical decision support": "Ondersteuning bij klinische beslissingen",
  "AUC, as published": "AUC, zoals gepubliceerd", "Survival model": "Overlevingsmodel",
  Cardiology: "Cardiologie", "Toxicity model": "Toxiciteitsmodel", Oncology: "Oncologie",
  oncology: "oncologie",
  "Image classifier": "Beeldclassificatiemodel", Radiology: "Radiologie",
  "Readmission risk": "Risico op heropname", "Internal medicine": "Interne geneeskunde",
  "Sepsis alert": "Sepsiswaarschuwing", "Intensive care": "Intensive care",
  "Stroke outcome": "Uitkomst na een beroerte", Neurology: "Neurologie",
  "Dose prediction": "Dosisvoorspelling", "Kidney function": "Nierfunctie",
  Nephrology: "Nefrologie", "Fracture detector": "Breukdetectie",
  "Response model": "Responsmodel", "Heart failure risk": "Risico op hartfalen",
  "Model metadata": "Modelmetadata", "CEDAR template": "CEDAR-sjabloon",
  "Search models": "Modellen zoeken", "Same REST API for every model": "Dezelfde REST-API voor elk model",
  "Data in": "Gegevens in", "Prediction out": "Voorspelling uit",
  "Oncology, logistic regression": "Oncologie, logistische regressie",
  "FAIVOR runs inside the hospital": "FAIVOR draait binnen het ziekenhuis",
  "Patient data stays here": "Patiëntgegevens blijven hier", "Local data": "Lokale gegevens",
  "ROC curve": "ROC-curve", "Brier score": "Brier-score", "Calibration slope": "Kalibratiehelling",
  "Validation report": "Validatierapport",
  // Flying Forward
  Parcels: "Pakketten", Meals: "Maaltijden", "Building inspections": "Gebouwinspecties",
  Defibrillators: "AED's", "Stay below 120 m": "Blijf onder 120 m",
  "Altitude ≤ 120 m": "Hoogte ≤ 120 m", Country: "Land", Region: "Regio",
  "No-fly zone around the airport": "Vliegverbod rond de luchthaven",
  "Outside airport zone": "Buiten de luchthavenzone",
  "No drones over the city park": "Geen drones boven het stadspark",
  "Not over the park": "Niet boven het park", drone: "drone", "living labs": "proeftuinen",
  countries: "landen", "Example legal text": "Voorbeeld van een wettekst",
  "Machine-readable rule": "Machineleesbare regel", "Same rule in every language": "Dezelfde regel in elke taal",
  "Airport zone": "Luchthavenzone", "City park": "Stadspark",
  "Rule check before take-off": "Regelcontrole vóór vertrek",
  "Route approved": "Route toegestaan", "Re-checking": "Opnieuw controleren",
  "Route rejected, re-planning": "Route afgewezen, nieuwe route plannen",
  "Flying Forward 2020, funded by EU Horizon 2020": "Flying Forward 2020, gefinancierd door EU Horizon 2020",
  "rule": "regel", "applies to": "geldt voor", "limit": "limiet", "scope": "gebied",
  // Lawnotation
  Party: "Partij", Obligation: "Verplichting", Deadline: "Termijn", Penalty: "Boete",
  "Article 4.": "Artikel 4.", "The Seller": "De verkoper", "shall deliver the goods": "levert de goederen",
  "to": "aan", "the Buyer": "de koper", "no later than 1 March 2026.": "uiterlijk 1 maart 2026.",
  "If the Seller fails to do so, it shall pay": "Als de verkoper dat niet doet, betaalt hij",
  "a penalty of €500 for each day of delay.": "een boete van € 500 per dag vertraging.",
  "Annotator 1": "Annotator 1", "Annotator 2": "Annotator 2", agreement: "overeenstemming",
  Publish: "Publiceren", "Published just now": "Zojuist gepubliceerd",
  "Published annotation tasks, open for anyone to discover": "Gepubliceerde annotatietaken, voor iedereen vindbaar",
  "Tenancy judgments": "Uitspraken over huurrecht", "GDPR fines": "AVG-boetes",
  "Employment contracts": "Arbeidsovereenkomsten", "Asylum decisions": "Asielbesluiten",
  "Supply agreements": "Leveringsovereenkomsten", "Tax rulings": "Belastinguitspraken",
};

export function canvasText(value: string): string {
  if (lang.value !== "nl") return value;
  if (CANVAS_NL[value]) return CANVAS_NL[value];
  if (/^Hospital [A-F]$/.test(value)) return `Ziekenhuis ${value.slice(-1)}`;
  if (/^\d+ models$/.test(value)) return value.replace("models", "modellen");
  if (/^\d+ documents$/.test(value)) return value.replace("documents", "documenten");
  if (/^\d+ annotations$/.test(value)) return value.replace("annotations", "annotaties");
  if (value.startsWith("Validated at ")) return `Gevalideerd bij ${canvasText(value.slice(13))}`;
  return value;
}

<template>
    <div class="about">
        <ShowcaseStage ref="stage" theme="light" :scene="scene" :captions="captions"
            eyebrow="Brightlands Institute for Smart Society at Maastricht University" title="What is BISS?"
            tagline="Human-centred AI and data science for a smart, inclusive society"
            outro="Where science meets responsible innovation. Ten years and counting." url="biss-institute.com"
            :members="members" />
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import { ease, easeOut, FONT, Frame, lerp, mulberry32, progress, sceneAt, text, useCanvasTimeline } from "../shared/anim";

const props = defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

/** Seconds into the animation at which each part starts. */
const T = { map: 3.5, team: 11.5, decade: 17.5, domains: 24.5, how: 31.5, partners: 38.5, outro: 45, end: 51 };

type Scene = "intro" | "map" | "team" | "decade" | "domains" | "how" | "partners" | "outro";
const captions: Record<string, string> = {
    map: "BISS is a Maastricht University institute on the Brightlands Smart Services Campus in Heerlen, one of four Brightlands campuses in Limburg.",
    team: "Its team brings together ethics, law, privacy, consumer behaviour, neuroscience and data science.",
    decade: "Founded in 2016, BISS counts 24 projects and 35 partners after ten years.",
    domains: "Those projects reach into health, finance, law, public services, mobility and industry.",
    how: "A real challenge, an interdisciplinary team, a prototype and impact: here, a clearer welfare application with Sittard-Geleen.",
    partners: "Every project is done with partners from science, government and industry, and funders such as NWO and the European Union.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

//#region Palette: Brightlands-like accents on white

const INK = "#0b1020";
const GREY = "#5b6170";
const HAIR = "#e1e4ea";
const MAGENTA = "#9b00a5";
const PINK = "#e6003c";
const ORANGE = "#ff7d00";
const YELLOW = "#ffc000";
const GREEN = "#02a528";
const CYAN = "#00bee6";
const LINE_PINK = "rgba(230, 0, 60, 0.35)";

//#endregion

//#region Geography (Natural Earth 1:10m borders and CBS province outline, simplified; lon/lat × 100)

const GEO: { coast: number[][]; border: number[][]; limburg: number[][] } = {"coast":[[213,5102,252,5109],[719,5325,723,5327,723,5330,725,5332,737,5330,730,5333,704,5335,702,5338,702,5345,706,5352,712,5352,714,5354,709,5359,723,5367,731,5368,746,5370,750,5368,795,5372,803,5371,802,5367,805,5364,813,5359,812,5357,817,5355,816,5353,806,5350,808,5347,810,5345,815,5345,821,5341,826,5341,832,5347,832,5351,829,5353,823,5353,825,5359,827,5361,833,5362,839,5358,855,5354,849,5349,849,5340,850,5336,850,5347,856,5352,857,5355,848,5368,856,5383],[680,5360,672,5359,676,5356,668,5358,666,5360,678,5362,680,5360],[687,5367,709,5369,687,5367],[713,5371,723,5373,735,5372,713,5371],[737,5373,744,5373,737,5373],[812,5372,815,5374,820,5373,812,5372],[752,5376,763,5375,751,5375,751,5373,748,5373,747,5376,752,5376],[766,5376,769,5378,781,5378,775,5376,766,5376],[787,5378,785,5378,788,5379,796,5378,788,5379,787,5378],[252,5109,312,5133,335,5138],[422,5137,430,5130,430,5127,433,5130,429,5131,428,5135,426,5137],[426,5137,423,5142,420,5141,411,5141,402,5145,396,5146,390,5140,383,5139,369,5145,361,5145,354,5146,345,5155,356,5159,385,5161,391,5157,387,5155,402,5153,406,5151,410,5145,428,5145,430,5147,427,5151,409,5154,399,5159,407,5161,416,5161,421,5159,419,5162,414,5162,411,5164,411,5167,418,5169,407,5172,403,5178,398,5181,387,5179,386,5182,396,5185,405,5183,408,5184,403,5188,404,5191,402,5199,414,5201,428,5211,451,5234,460,5251,467,5280,471,5286,475,5297,482,5297,481,5293,487,5290,508,5295,531,5308,538,5310,545,5322,559,5330,598,5341,627,5341,631,5340,649,5344,673,5346,683,5345,687,5343,690,5335,702,5331,709,5331,707,5330,708,5327,719,5325],[335,5138,354,5142,376,5135,383,5134,396,5137,398,5141,412,5136,416,5136,418,5138,422,5137],[404,5169,410,5167,410,5165,407,5164,398,5162,390,5164,389,5167,381,5170,377,5168,369,5169,369,5173,381,5175,396,5174,404,5169],[489,5311,491,5310,489,5308,480,5300,473,5300,471,5303,473,5308,485,5319,489,5318,491,5313,489,5311],[488,5322,499,5329,505,5331,510,5331,504,5329,491,5321,488,5322],[542,5343,559,5345,556,5343,548,5343,548,5341,547,5341,521,5335,517,5337,518,5339,525,5341,542,5343],[567,5347,591,5347,595,5346,568,5343,564,5345,564,5346,567,5347],[621,5351,631,5351,634,5350,615,5347,613,5345,612,5348,621,5351],[644,5356,651,5354,644,5356]],"border":[[252,5109,256,5100,261,5096,261,5094,258,5091,260,5087,259,5085,262,5082,269,5081,279,5072,289,5070,297,5076,313,5078,319,5072,323,5070,324,5067,323,5066,327,5053,336,5049,348,5052,350,5051,349,5049,350,5049,361,5048,364,5045,366,5032,370,5030,376,5035,384,5035,390,5033,400,5034,410,5029,413,5026,414,5025,416,5027,420,5026,420,5024,415,5020,413,5013,418,5013,421,5006,414,5003,413,4997,420,4995,428,4996,446,4994,466,4999,468,5008,479,5015,482,5016,482,5015,486,5015,486,5008,485,5009,483,5006,483,5004,478,4996,486,4991,483,4985,486,4979,497,4980,508,4975,517,4969,526,4969,530,4966,530,4961,533,4963,540,4960,545,4955,546,4950,555,4952,560,4951,564,4954,571,4953,575,4955,579,4954,584,4950,593,4948,596,4944,608,4945,611,4948,614,4949,614,4950,619,4950,633,4946,640,4947,651,4942,652,4940,658,4936,656,4935,656,4933,664,4927,668,4921,670,4921,671,4920],[683,4920,684,4921,691,4921,699,4918],[635,4946,635,4957,642,4964,640,4966,650,4971,649,4973,650,4980,640,4981,633,4984,630,4983,629,4986,622,4989,617,4996,616,4994,610,5005,613,5013,612,5016,617,5018,615,5021,627,5027,629,5030,637,5032,634,5037,635,5043,632,5047,634,5048,626,5049,621,5049,618,5051,619,5052,617,5052,618,5053,616,5054,623,5059,625,5061,616,5062,615,5064,616,5064,608,5071,601,5071,601,5074,597,5078,597,5079,600,5080,601,5084,606,5085,606,5091,600,5093,600,5097,587,5097,586,5102,585,5104,588,5105,594,5103,598,5107,615,5115,613,5116,616,5118,613,5118,608,5116,606,5117,606,5121,615,5132,619,5134,621,5139,619,5140,621,5146,619,5151,609,5160,610,5164,601,5168,602,5171,601,5172,594,5173,596,5178,593,5181,608,5185,616,5184,609,5189,613,5190,623,5186,626,5187,629,5185,634,5184,634,5182,638,5183,638,5186,646,5185,663,5190,672,5190,681,5196,681,5198,678,5200,668,5203,667,5205,675,5210,683,5211,688,5216,703,5223,701,5228,705,5237,697,5245,690,5243,671,5246,670,5248,667,5254,674,5256,670,5258,670,5262,674,5263,687,5264,702,5263,704,5265,706,5282,716,5293,719,5300,717,5314,720,5318,719,5325],[579,4954,584,4956,585,4958,583,4958,589,4964,585,4967,585,4971,581,4972,578,4977,573,4980,573,4986,576,4986,572,4989,576,4995,581,4998,580,5000,584,5002,584,5005,586,5007,587,5010,594,5013,596,5017,600,5017,604,5015,608,5016,612,5012],[335,5138,335,5129,339,5125,350,5124,351,5128,361,5129,378,5125,378,5122,381,5121,395,5121,412,5127,421,5133,422,5137],[426,5137,441,5136,442,5137,438,5141,439,5143,438,5144,448,5147,453,5148,452,5143,454,5142,463,5142,473,5149,478,5150,482,5148,482,5141,478,5143,476,5141,491,5139,496,5141,503,5148,508,5144,507,5137,512,5131,520,5131,521,5129,522,5126,539,5126,549,5129,554,5126,555,5122,557,5121,566,5118,573,5118,578,5115,583,5116,584,5114,582,5112,585,5110,580,5110,580,5106,577,5106,576,5104,578,5102,572,5096,576,5096,572,5091,562,5085,562,5083,570,5080,569,5076,571,5075,575,5077,579,5075,599,5075]],"limburg":[[595,5175,592,5175,589,5178,587,5178,586,5176,588,5175,588,5173,596,5171,596,5166,602,5162,603,5160,604,5158,603,5155,600,5157,591,5155,584,5157,587,5145,593,5138,588,5135,567,5132,563,5127,562,5123,557,5122,565,5120,566,5118,577,5118,578,5115,582,5117,586,5114,581,5112,583,5110,580,5109,580,5108,579,5106,577,5106,576,5103,578,5102,577,5100,572,5096,576,5096,572,5091,570,5091,568,5089,564,5087,564,5085,566,5082,569,5081,570,5078,568,5076,570,5076,572,5076,574,5076,575,5077,578,5078,581,5076,589,5077,589,5076,592,5075,597,5076,602,5075,603,5077,598,5080,598,5081,600,5080,602,5081,602,5085,608,5086,609,5087,608,5089,608,5092,602,5094,602,5098,597,5098,596,5099,590,5098,591,5100,588,5102,588,5104,591,5107,594,5104,597,5105,597,5106,601,5109,604,5110,609,5114,618,5116,614,5117,618,5119,616,5119,608,5117,607,5122,609,5122,607,5124,612,5128,617,5133,623,5136,620,5140,622,5148,621,5151,616,5157,609,5161,612,5166,604,5167,603,5171,604,5172,599,5174,596,5174,595,5175]]};

/** Brightlands' four campuses in Limburg; BISS sits on the Smart Services Campus in Heerlen. */
const CAMPUSES = [
    { name: "Campus Greenport Venlo", lon: 6.13, lat: 51.4, from: YELLOW, to: ORANGE, side: 1 },
    { name: "Chemelot Campus", lon: 5.79, lat: 50.97, from: GREEN, to: "#00c08b", side: -1 },
    { name: "Maastricht Health Campus", lon: 5.71, lat: 50.84, from: PINK, to: "#ff5a1f", side: -1 },
    { name: "Smart Services Campus", lon: 5.979, lat: 50.887, from: CYAN, to: MAGENTA, side: 1 },
];
const HEERLEN = CAMPUSES[3];
const CITIES = [
    { name: "AMSTERDAM", lon: 4.9, lat: 52.37, side: 1 },
    { name: "ROTTERDAM", lon: 4.48, lat: 51.92, side: -1 },
    { name: "EINDHOVEN", lon: 5.48, lat: 51.44, side: -1 },
    { name: "DÜSSELDORF", lon: 6.78, lat: 51.23, side: 1 },
    { name: "COLOGNE", lon: 6.96, lat: 50.94, side: 1 },
    { name: "AACHEN", lon: 6.08, lat: 50.78, side: 1 },
    { name: "LIÈGE", lon: 5.57, lat: 50.63, side: -1 },
    { name: "HASSELT", lon: 5.34, lat: 50.93, side: -1 },
    { name: "BRUSSELS", lon: 4.35, lat: 50.85, side: -1 },
];
/** Distances as on Brightlands' own "Brightlands in Limburg" map. */
const CAPITALS = [
    { name: "London", km: "420 km", arrow: "←", at: { x: 0.03, y: 0.36 }, align: "left" as const },
    { name: "Berlin", km: "550 km", arrow: "→", at: { x: 0.97, y: 0.2 }, align: "right" as const },
    { name: "Paris", km: "340 km", arrow: "↓", at: { x: 0.03, y: 0.86 }, align: "left" as const },
];
const COUNTRY_LABELS = [
    { id: "NL", lon: 5.75, lat: 52.15 },
    { id: "BE", lon: 4.75, lat: 50.45 },
    { id: "DE", lon: 7.55, lat: 51.55 },
];

//#endregion

//#region Projects, domains and partners (biss-institute.com project pages)

type Project = { id: string; title: string; status: "in progress" | "finished"; domains: string[] };
const PROJECTS: Project[] = [
    { id: "better", title: "BETTER", status: "in progress", domains: ["health"] },
    { id: "sound", title: "Recognising sound", status: "in progress", domains: ["health"] },
    { id: "fair4ai", title: "FAIR4AI", status: "finished", domains: ["health"] },
    { id: "support", title: "AI customer support", status: "in progress", domains: ["industry"] },
    { id: "feed", title: "Livestock feed", status: "finished", domains: ["industry"] },
    { id: "advice", title: "Automated financial advice", status: "finished", domains: ["finance"] },
    { id: "benedrone", title: "BeNeDrone", status: "in progress", domains: ["mobility"] },
    { id: "legal", title: "Legal research software", status: "in progress", domains: ["law"] },
    { id: "digimach", title: "DigiMach", status: "in progress", domains: ["industry"] },
    { id: "welfare", title: "Clear welfare application", status: "finished", domains: ["public"] },
    { id: "vr", title: "VR: financial pressure", status: "in progress", domains: ["finance"] },
    { id: "flying", title: "Flying Forward", status: "finished", domains: ["mobility"] },
    { id: "shutdowns", title: "Prevent factory shutdowns", status: "finished", domains: ["industry"] },
    { id: "priceless", title: "Priceless Assets of Subversion", status: "in progress", domains: ["finance", "law"] },
];
const DOMAINS = [
    { id: "health", label: "Health and the brain", color: PINK },
    { id: "finance", label: "Finance", color: ORANGE },
    { id: "law", label: "Law", color: MAGENTA },
    { id: "public", label: "Public services", color: GREEN },
    { id: "mobility", label: "Mobility", color: CYAN },
    { id: "industry", label: "Industry and business", color: YELLOW },
];
const domainColor = (p: Project) => DOMAINS.find((d) => d.id === p.domains[0])!.color;

/** One pill per project per domain it touches. */
const PILLS = DOMAINS.flatMap((d) =>
    PROJECTS.map((p, index) => ({ p, index, domain: d.id })).filter((x) => x.p.domains.includes(d.id))
).map((x, n, all) => ({ ...x, slot: all.filter((y, m) => m < n && y.domain === x.domain).length }));

/** Partners and funders as listed on each project page. */
const LINKED = [
    { id: "better", title: "BETTER", partners: ["datrix", "uniklinik-koln", "politecnico-di-milano", "university-of-valencia"], funders: ["european-union"] },
    { id: "fair4ai", title: "FAIR4AI", partners: ["escience-center"], funders: ["nwo"] },
    { id: "sound", title: "Recognising sound", partners: [], funders: ["nwo"] },
    { id: "priceless", title: "Priceless Assets", partners: ["avans-hogeschool", "fiod", "universiteit-van-amsterdam"], funders: ["nwo"] },
    { id: "advice", title: "Financial advice", partners: ["afm", "apg", "asr", "ortec"], funders: ["netspar"] },
    { id: "vr", title: "VR: financial pressure", partners: ["nibud", "the-barn"], funders: ["bzk", "clicknl"] },
];
const ORG_NAMES: Record<string, string> = {
    datrix: "Datrix",
    "uniklinik-koln": "Uniklinik Köln",
    "politecnico-di-milano": "Politecnico di Milano",
    "university-of-valencia": "University of Valencia",
    "escience-center": "Netherlands eScience Center",
    "avans-hogeschool": "Avans Hogeschool",
    fiod: "FIOD",
    "universiteit-van-amsterdam": "Universiteit van Amsterdam",
    afm: "AFM",
    apg: "APG",
    asr: "a.s.r.",
    ortec: "Ortec",
    nibud: "Nibud",
    "the-barn": "The Barn",
    "european-union": "European Union",
    nwo: "NWO",
    netspar: "Netspar",
    bzk: "Ministry of BZK",
    clicknl: "CLICKNL",
};
const FUNDER_IDS = [...new Set(LINKED.flatMap((l) => l.funders))];

/** The worked example: "Working towards a clear and simple welfare application". */
const EXAMPLE_TEAM = ["johan van soest", "lisa bruggen", "minou van der werf", "chris van der lans"];
const STATIONS = [
    { label: "Challenge", color: PINK, body: "Applying for welfare means many documents and proofs. Sittard-Geleen asked BISS to make it easier." },
    { label: "Team", color: ORANGE, body: "Data science and behavioural science, working closely with the municipality." },
    { label: "Prototype", color: CYAN, body: "Customer journey mapped, a blueprint, then a prototype of the new application process." },
    { label: "Impact", color: GREEN, body: "Measuring whether applying becomes easier and more understandable for citizens." },
];

const DISCIPLINES = ["Data science & AI", "Ethics", "Law", "Privacy", "Consumer behaviour", "Neuroscience"];
const DISCIPLINE_COLORS = [MAGENTA, PINK, ORANGE, GREEN, CYAN, YELLOW];

const MILESTONES = [
    { year: 2016, title: "BISS is founded", sub: "KennisAs grant, Province of Limburg", up: true, color: MAGENTA },
    { year: 2017, title: "Rudolf Müller", sub: "Scientific Director 2016–2018", up: false, color: ORANGE },
    { year: 2020, title: "Lisa Brüggen", sub: "Scientific Lead 2019–2021", up: true, color: GREEN },
    { year: 2026, title: "10 years of BISS", sub: "An independent institute", up: false, color: PINK },
];
const STATS = [
    { value: 24, label: "projects" },
    { value: 35, label: "partners" },
    { value: 17, label: "presentations" },
];

//#endregion

//#region Images

const LOGO_URLS = import.meta.glob<string>("../../assets/images/partners/*.webp", { eager: true, import: "default" });
const LOGOS: Record<string, HTMLImageElement> = {};
for (const [path, url] of Object.entries(LOGO_URLS)) {
    const img = new Image();
    img.src = url;
    LOGOS[path.split("/").pop()!.replace(".webp", "")] = img;
}
const photos = new Map<string, HTMLImageElement>();
const photo = (url?: string) => {
    if (!url) return undefined;
    let img = photos.get(url);
    if (!img) {
        img = new Image();
        img.src = url;
        photos.set(url, img);
    }
    return img;
};
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

//#endregion

//#region Easing and drawing helpers

/** Springy overshoot, for things popping into place. */
const back = (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const c1 = 1.9;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const pop = (t: number, a: number, d = 0.55) => back(progress(t, a, a + d));
const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    ctx.fill();
};
const line = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, f = 1) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(lerp(x0, x1, f), lerp(y0, y1, f));
    ctx.stroke();
};
/** Scales everything drawn in `fn` around (x, y). */
const scaled = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fn: () => void) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);
    fn();
    ctx.restore();
};

/** Splits `value` into lines no wider than `maxWidth` at the current font. */
function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
    const lines: string[] = [];
    let current = "";
    for (const word of value.split(" ")) {
        const next = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(next).width > maxWidth) {
            lines.push(current);
            current = word;
        } else current = next;
    }
    if (current) lines.push(current);
    return lines;
}

/** A black pill with white capitals, like the city labels on Brightlands' map. */
function pill(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, size: number, alpha: number, align: "left" | "right" | "center" = "left", fill = INK) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(label).width + size * 1.5;
    const h = size * 1.9;
    const x0 = align === "left" ? x : align === "right" ? x - w : x - w / 2;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x0, y - h / 2, w, h, h / 2);
    ctx.fill();
    text(ctx, label, x0 + w / 2, y + size * 0.04, size, { color: "#fff", weight: 700 });
    ctx.restore();
}

/** A white card with an organisation's logo, or its name when there is no logo. */
function logoCard(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, k: number, alpha: number, accent?: string) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = "rgba(11,16,32,0.12)";
    ctx.shadowBlur = 18 * k;
    ctx.shadowOffsetY = 5 * k;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 10 * k);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (accent) {
        ctx.fillStyle = accent;
        ctx.fillRect(x - w / 2 + 12 * k, y + h / 2 - 3 * k, w - 24 * k, 3 * k);
    }
    const img = LOGOS[id];
    if (img && img.complete && img.naturalWidth > 0) {
        const s = Math.min((w - h * 0.34) / img.naturalWidth, (h * 0.66) / img.naturalHeight);
        const iw = img.naturalWidth * s;
        const ih = img.naturalHeight * s;
        ctx.drawImage(img, x - iw / 2, y - ih / 2, iw, ih);
    } else {
        text(ctx, ORG_NAMES[id] ?? id, x, y, h * 0.26, { color: INK, weight: 800, maxWidth: w - 20 * k });
    }
    ctx.restore();
}

/** A round portrait with a white ring; initials when there is no photo. */
function face(ctx: CanvasRenderingContext2D, url: string | undefined, name: string, x: number, y: number, r: number, k: number, alpha: number, ring = "#fff") {
    if (alpha <= 0.003 || r <= 0.5) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = "rgba(11,16,32,0.18)";
    ctx.shadowBlur = 10 * k;
    ctx.shadowOffsetY = 3 * k;
    dot(ctx, x, y, r + 3 * k, ring);
    ctx.shadowColor = "transparent";
    const img = photo(url);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (img && img.complete && img.naturalWidth > 0) {
        const s = (2 * r) / Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img, x - (img.naturalWidth * s) / 2, y - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    } else {
        dot(ctx, x, y, r, "#e9ebf1");
        const initials = name
            .replace(/^((dr|prof|mr|ms|ir)\.?\s+)+/i, "")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2);
        text(ctx, initials, x, y, r * 0.7, { color: INK, weight: 700 });
    }
    ctx.restore();
}

/** A glyph sampled into a dot matrix, like the dotted Brightlands wordmark. */
const glyphs = new Map<string, { x: number; y: number }[]>();
function dottedGlyph(char: string, cells: number) {
    const key = `${char}${cells}`;
    const cached = glyphs.get(key);
    if (cached) return cached;
    const size = 200;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const c = off.getContext("2d")!;
    c.font = `900 ${size * 0.86}px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(char, size / 2, size / 2 + size * 0.04);
    const data = c.getImageData(0, 0, size, size).data;
    const step = size / cells;
    const dots: { x: number; y: number }[] = [];
    for (let y = step / 2; y < size; y += step)
        for (let x = step / 2; x < size; x += step)
            if (data[(Math.floor(y) * size + Math.floor(x)) * 4 + 3] > 140) dots.push({ x: x / size - 0.5, y: y / size - 0.5 });
    glyphs.set(key, dots);
    return dots;
}

/** A Brightlands campus disc: a colour gradient with a dotted "B". */
function campusDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, from: string, to: string, alpha: number) {
    if (alpha <= 0.003 || r <= 0.5) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.shadowColor = hexA(to, 0.35);
    ctx.shadowBlur = r * 0.6;
    dot(ctx, x, y, r, g as unknown as string);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const glyph = dottedGlyph("B", 11);
    const s = r * 1.15;
    for (const d of glyph) {
        ctx.beginPath();
        ctx.arc(x + d.x * s, y + d.y * s, Math.max(0.6, r * 0.035), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

//#endregion

/** Decorative constellation behind everything, after Brightlands' map (illustrative). */
const STARS = (() => {
    const random = mulberry32(21);
    const pts = Array.from({ length: 26 }, () => ({ x: random(), y: random(), phase: random() * 6.28 }));
    const links: [number, number][] = [];
    pts.forEach((a, i) =>
        pts.forEach((b, j) => {
            if (j > i && Math.hypot(a.x - b.x, (a.y - b.y) * 0.6) < 0.16) links.push([i, j]);
        })
    );
    return { pts, links };
})();

const draw = ({ ctx, t, W, H, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const cy = safe.top + span / 2;

    //#region constellation backdrop
    {
        const p = (i: number) => {
            const s = STARS.pts[i];
            return { x: (s.x + Math.sin(t * 0.07 + s.phase) * 0.01) * W, y: (s.y + Math.cos(t * 0.06 + s.phase) * 0.012) * H };
        };
        ctx.save();
        ctx.strokeStyle = "rgba(230, 0, 60, 0.13)";
        ctx.lineWidth = 1;
        STARS.links.forEach(([a, b], n) => {
            const f = ease(progress(t, 0.3 + n * 0.05, 1.3 + n * 0.05));
            const A = p(a);
            const B = p(b);
            line(ctx, A.x, A.y, B.x, B.y, f);
        });
        STARS.pts.forEach((_, i) => {
            const A = p(i);
            ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 1.3 + STARS.pts[i].phase);
            dot(ctx, A.x, A.y, 2.2 * k, PINK);
        });
        ctx.restore();
    }
    //#endregion

    /** Each scene arrives with a small zoom and leaves with a quick zoom-out, like a camera cut. */
    const camera = (a: number, b: number, fn: (enter: number) => void, { zoomIn = 0.06, zoomOut = 0.05 } = {}) => {
        if (t < a || t >= b) return;
        const enter = easeOut(progress(t, a, a + 0.5));
        const leave = ease(progress(t, b - 0.45, b));
        const s = 1 + zoomIn * (1 - enter) - zoomOut * leave;
        ctx.save();
        ctx.globalAlpha = Math.min(enter * 1.5, 1) * (1 - leave);
        scaled(ctx, W / 2, cy, s, () => fn(enter));
        ctx.restore();
    };

    //#region map: Limburg, the four campuses, then into Heerlen
    if (t >= T.map && t < T.team + 0.2) {
        const m = t - T.map;
        const COS = Math.cos((51 * Math.PI) / 180);
        const s0 = Math.min((span * 0.47) / 0.95, (W * 0.44) / (1.45 * COS));
        const zoom = ease(progress(m, 4.3, 5.9));
        const dive = Math.pow(progress(t, T.team - 0.8, T.team + 0.2), 2);
        const cam = {
            lon: lerp(5.55, HEERLEN.lon, zoom),
            lat: lerp(51.45, HEERLEN.lat, zoom),
            s: s0 * Math.exp(Math.log(3.3) * zoom + 2.2 * dive),
        };
        const P = (lon: number, lat: number) => ({ x: W / 2 + (lon - cam.lon) * COS * cam.s, y: cy + (cam.lat - lat) * cam.s });
        const mapAlpha = easeOut(progress(m, 0, 0.4)) * (1 - progress(t, T.team - 0.5, T.team + 0.1));
        const details = 1 - ease(progress(m, 4.0, 4.6)); // cities and capitals step back for the zoom

        ctx.save();
        ctx.globalAlpha = mapAlpha;
        ctx.beginPath();
        ctx.rect(0, safe.top, W, span);
        ctx.clip();

        // line-art map: coasts solid, borders dashed, drawn in
        const drawIn = ease(progress(m, 0.1, 1.6));
        const poly = (pts: number[], f: number) => {
            const n = Math.max(2, Math.floor((pts.length / 2) * f));
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const q = P(pts[i * 2] / 100, pts[i * 2 + 1] / 100);
                if (i === 0) ctx.moveTo(q.x, q.y);
                else ctx.lineTo(q.x, q.y);
            }
        };
        const limburg = easeOut(progress(m, 0.8, 1.6));
        if (limburg > 0) {
            ctx.save();
            ctx.globalAlpha *= limburg;
            ctx.fillStyle = "#d6e8f6";
            GEO.limburg.forEach((pts) => {
                poly(pts, 1);
                ctx.closePath();
                ctx.fill();
            });
            ctx.restore();
        }
        ctx.strokeStyle = "rgba(11,16,32,0.75)";
        ctx.lineWidth = 1.4 * k;
        GEO.coast.forEach((pts) => {
            poly(pts, drawIn);
            ctx.stroke();
        });
        ctx.setLineDash([3 * k, 4 * k]);
        ctx.strokeStyle = "rgba(11,16,32,0.55)";
        GEO.border.forEach((pts) => {
            poly(pts, drawIn);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        COUNTRY_LABELS.forEach((c, i) => {
            const q = P(c.lon, c.lat);
            text(ctx, c.id, q.x, q.y, 44 * k, { color: "rgba(11,16,32,0.35)", weight: 800, alpha: progress(m, 1 + i * 0.15, 1.5 + i * 0.15) * details });
        });

        // the 100 km around Heerlen
        const h = P(HEERLEN.lon, HEERLEN.lat);
        const radius = easeOut(progress(m, 2.6, 3.8));
        if (radius > 0) {
            const r = 0.8993 * cam.s;
            ctx.save();
            ctx.strokeStyle = "rgba(11,16,32,0.4)";
            ctx.lineWidth = 1.3 * k;
            ctx.setLineDash([2 * k, 5 * k]);
            ctx.beginPath();
            ctx.arc(h.x, h.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * radius);
            ctx.stroke();
            ctx.restore();
            const lx = h.x + Math.cos(-0.5) * r;
            const ly = h.y + Math.sin(-0.5) * r;
            text(ctx, "R = 100 km", lx + 12 * k, ly, 16 * k, { color: INK, weight: 600, align: "left", alpha: progress(m, 3.4, 3.8) * details });
        }

        // cities pop in, with thin pink links to Heerlen
        CITIES.forEach((c, i) => {
            const a = pop(m, 1.2 + i * 0.12);
            if (a <= 0) return;
            const q = P(c.lon, c.lat);
            ctx.save();
            ctx.strokeStyle = LINE_PINK;
            ctx.lineWidth = 1 * k;
            ctx.globalAlpha *= details;
            line(ctx, h.x, h.y, q.x, q.y, ease(progress(m, 2.2 + i * 0.08, 3.0 + i * 0.08)));
            ctx.strokeStyle = INK;
            ctx.lineWidth = 1.5 * k;
            ctx.beginPath();
            ctx.arc(q.x, q.y, 4.5 * k * (1 + 0.3 * Math.sin(t * 4 + i)), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            scaled(ctx, q.x, q.y, a, () =>
                pill(ctx, c.name, q.x + c.side * 12 * k, q.y, 14 * k, Math.min(1, a) * details, c.side > 0 ? "left" : "right")
            );
        });

        // capitals, as outlined arrow boxes at the edges
        CAPITALS.forEach((c, i) => {
            const a = easeOut(progress(m, 2.0 + i * 0.2, 2.6 + i * 0.2)) * details;
            if (a <= 0.003) return;
            const x = c.at.x * W + (c.align === "left" ? -1 : 1) * (1 - a) * 60 * k;
            const y = safe.top + c.at.y * span;
            ctx.save();
            ctx.globalAlpha *= a;
            ctx.font = `600 ${20 * k}px ${FONT}`;
            const label = `${c.arrow}  ${c.name}`;
            const w = ctx.measureText(label).width + ctx.measureText(c.km).width * 0.8 + 40 * k;
            const bh = 44 * k;
            const x0 = c.align === "left" ? x : x - w;
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = INK;
            ctx.lineWidth = 2 * k;
            ctx.beginPath();
            ctx.rect(x0, y - bh / 2, w, bh);
            ctx.fill();
            ctx.stroke();
            text(ctx, label, x0 + 14 * k, y, 20 * k, { color: INK, weight: 600, align: "left" });
            text(ctx, c.km, x0 + w - 12 * k, y + 1 * k, 15 * k, { color: INK, weight: 600, align: "right" });
            ctx.restore();
        });

        // the four campuses
        CAMPUSES.forEach((c, i) => {
            const a = pop(m, 1.9 + i * 0.22, 0.6);
            if (a <= 0) return;
            const q = P(c.lon, c.lat);
            const isBiss = c === HEERLEN;
            const r = (22 + (isBiss ? 22 : 8) * zoom) * k * a * (isBiss ? 1 + 1.6 * dive : 1);
            if (isBiss && zoom > 0) {
                // pulsing rings: this is where BISS sits
                for (let n = 0; n < 3; n++) {
                    const ph = (t * 0.7 + n / 3) % 1;
                    ctx.save();
                    ctx.globalAlpha *= zoom * (1 - ph) * 0.6;
                    ctx.strokeStyle = MAGENTA;
                    ctx.lineWidth = 2 * k;
                    ctx.beginPath();
                    ctx.arc(q.x, q.y, r * (1 + ph * 1.4), 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            campusDisc(ctx, q.x, q.y, r, c.from, c.to, Math.min(1, a));
            // campus names once zoomed in
            const label = progress(m, 5.2 + i * 0.1, 5.6 + i * 0.1) * (1 - dive * 3);
            if (!isBiss) pill(ctx, c.name, q.x + c.side * (r + 10 * k), q.y, 14 * k, label, c.side > 0 ? "left" : "right", "rgba(11,16,32,0.85)");
        });

        // BISS, at the Smart Services Campus
        const card = pop(m, 5.6, 0.6) * (1 - Math.min(1, dive * 3));
        if (card > 0) {
            const r = (22 + 22 * zoom) * k;
            const x = h.x + r + 22 * k;
            const y = h.y - r - 30 * k;
            scaled(ctx, x, y + 40 * k, card, () => {
                ctx.save();
                ctx.globalAlpha *= Math.min(1, card);
                ctx.shadowColor = "rgba(11,16,32,0.18)";
                ctx.shadowBlur = 20 * k;
                ctx.shadowOffsetY = 6 * k;
                ctx.fillStyle = "#fff";
                const w = Math.min(430 * k, W - x - 20 * k);
                ctx.beginPath();
                ctx.roundRect(x, y - 44 * k, w, 92 * k, 12 * k);
                ctx.fill();
                ctx.shadowColor = "transparent";
                const g = ctx.createLinearGradient(x, 0, x + w, 0);
                g.addColorStop(0, CYAN);
                g.addColorStop(1, MAGENTA);
                ctx.fillStyle = g;
                ctx.fillRect(x, y - 44 * k, 6 * k, 92 * k);
                text(ctx, "BISS", x + 24 * k, y - 14 * k, 30 * k, { color: INK, weight: 800, align: "left" });
                text(ctx, "Brightlands Smart Services Campus, Heerlen", x + 24 * k, y + 22 * k, 17 * k, {
                    color: GREY,
                    weight: 600,
                    align: "left",
                    maxWidth: w - 40 * k,
                });
                ctx.restore();
            });
        }
        ctx.restore();

        // soft edges where the map meets the title and caption areas
        const fade = (y0: number, y1: number) => {
            const g = ctx.createLinearGradient(0, y0, 0, y1);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
        };
        fade(safe.top, safe.top + 40 * k);
        fade(safe.bottom, safe.bottom - 40 * k);
    }
    //#endregion

    //#region team: everyone flies in around BISS
    const people = props.members;
    camera(T.team, T.decade, () => {
        const m = t - T.team;
        const n = Math.max(1, people.length);
        const outer = span * 0.43;
        const c = outer / Math.sqrt(n + 2.6);
        const fr = Math.min(c * 0.78, 52 * k);
        const spin = m * 0.06;
        const hubR = c * 1.25;

        // discipline tags with pink links to the team (links first, under everything)
        const tags = DISCIPLINES.map((label, i) => {
            const right = i < 3;
            const row = i % 3;
            const angle = (right ? 0 : Math.PI) + (row - 1) * 0.55 * (right ? 1 : -1);
            const x = W / 2 + Math.cos(angle) * (outer + 70 * k) + (right ? 1 : -1) * 10 * k;
            const y = cy + Math.sin(angle) * outer * 0.95;
            return { label, x, y, right, color: DISCIPLINE_COLORS[i], at: 2.4 + i * 0.18 };
        });
        tags.forEach((g) => {
            const f = ease(progress(m, g.at, g.at + 0.5));
            if (f <= 0) return;
            ctx.save();
            ctx.strokeStyle = hexA(g.color, 0.5);
            ctx.lineWidth = 1.5 * k;
            line(ctx, g.x, g.y, W / 2, cy, f * 0.75);
            ctx.restore();
        });

        // hub
        const hub = pop(m, 0.05, 0.6);
        campusDisc(ctx, W / 2, cy, hubR * hub, CYAN, MAGENTA, Math.min(1, hub));

        // faces: phyllotaxis, flying in from all sides
        const random = mulberry32(5);
        people.forEach((p, i) => {
            const from = random() * Math.PI * 2;
            const arrive = 0.3 + i * 0.06;
            const f = back(progress(m, arrive, arrive + 0.75));
            const leave = ease(progress(t, T.decade - 0.9 + (i % 7) * 0.03, T.decade - 0.4));
            if (f <= 0) return;
            const angle = i * 2.39996 + spin;
            const r = c * Math.sqrt(i + 2.6);
            const hx = W / 2 + Math.cos(angle) * r * 1.12;
            const hy = cy + Math.sin(angle) * r;
            const sx = W / 2 + Math.cos(from) * W * 0.7;
            const sy = cy + Math.sin(from) * H * 0.7;
            const x = lerp(lerp(sx, hx, f), W / 2, leave);
            const y = lerp(lerp(sy, hy, f), cy, leave);
            face(ctx, p.photo, p.title, x, y, fr * (0.6 + 0.4 * Math.min(f, 1)) * (1 - leave * 0.7), k, Math.min(1, f * 2) * (1 - leave));
        });

        // the count, in the hub
        const count = Math.round(people.length * ease(progress(m, 0.4, 0.4 + people.length * 0.06)));
        if (hub > 0.5 && people.length) {
            ctx.save();
            ctx.globalAlpha *= progress(m, 0.6, 1);
            dot(ctx, W / 2, cy, hubR * 0.62, "#fff");
            ctx.restore();
            text(ctx, String(count), W / 2, cy - hubR * 0.08, hubR * 0.5, { color: INK, weight: 800, alpha: progress(m, 0.6, 1) });
            text(ctx, "people", W / 2, cy + hubR * 0.32, hubR * 0.17, { color: GREY, weight: 700, alpha: progress(m, 0.6, 1) });
        }

        tags.forEach((g) => {
            const a = pop(m, g.at + 0.2);
            if (a <= 0) return;
            ctx.font = `700 ${22 * k}px ${FONT}`;
            const w = ctx.measureText(g.label).width + 50 * k;
            const room = g.right ? W - g.x - 12 * k : g.x - 12 * k;
            const scale = Math.min(1, room / w);
            const cx = g.right ? g.x + (w * scale) / 2 : g.x - (w * scale) / 2;
            scaled(ctx, cx, g.y, a * scale, () => {
                ctx.save();
                ctx.globalAlpha *= Math.min(1, a);
                ctx.shadowColor = "rgba(11,16,32,0.12)";
                ctx.shadowBlur = 14 * k;
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.roundRect(cx - w / 2, g.y - 22 * k, w, 44 * k, 22 * k);
                ctx.fill();
                ctx.shadowColor = "transparent";
                dot(ctx, cx - w / 2 + 20 * k, g.y, 6 * k, g.color);
                text(ctx, g.label, cx - w / 2 + 34 * k, g.y + 1 * k, 22 * k, { color: INK, weight: 700, align: "left" });
                ctx.restore();
            });
        });
    });
    //#endregion

    //#region decade: a timeline sweeps across while the projects pop in
    const grid = {
        x0: W * 0.08,
        w: W * 0.84,
        y0: safe.top + span * 0.43,
        cols: 7,
        gap: 14 * k,
        h: Math.min(span * 0.17, 110 * k),
    };
    const cardW = (grid.w - (grid.cols - 1) * grid.gap) / grid.cols;
    const cardAt = (i: number) => ({
        x: grid.x0 + (i % grid.cols) * (cardW + grid.gap) + cardW / 2,
        y: grid.y0 + Math.floor(i / grid.cols) * (grid.h + grid.gap) + grid.h / 2,
    });
    const projectCard = (p: Project, x: number, y: number, w: number, h: number, alpha: number, status: number) => {
        if (alpha <= 0.003) return;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.shadowColor = "rgba(11,16,32,0.12)";
        ctx.shadowBlur = 16 * k;
        ctx.shadowOffsetY = 4 * k;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 10 * k);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.save();
        ctx.clip();
        ctx.fillStyle = domainColor(p);
        ctx.fillRect(x - w / 2, y - h / 2, 6 * k, h);
        ctx.restore();
        const size = Math.min(19 * k, h * 0.3);
        const ty = status > 0 ? y - h * 0.14 : y;
        text(ctx, p.title, x - w / 2 + 18 * k, ty, size, { color: INK, weight: 800, align: "left", maxWidth: w - 28 * k });
        if (status > 0) {
            ctx.globalAlpha *= status;
            dot(ctx, x - w / 2 + 23 * k, y + h * 0.22, 4.5 * k, p.status === "finished" ? GREEN : ORANGE);
            text(ctx, p.status === "finished" ? "Finished" : "In progress", x - w / 2 + 34 * k, y + h * 0.22, 14 * k, {
                color: GREY,
                weight: 600,
                align: "left",
            });
        }
        ctx.restore();
    };

    camera(
        T.decade,
        T.domains,
        () => {
            const m = t - T.decade;
            // pans in from the right
            ctx.save();
            ctx.translate((1 - back(progress(m, 0, 0.8))) * W * 0.25, 0);
            const x0 = W * 0.08;
            const x1 = W * 0.92;
            const y = safe.top + span * 0.17;
            const xOf = (year: number) => lerp(x0, x1, (year - 2016) / 10);
            const head = ease(progress(m, 0.3, 2.8));
            const hx = lerp(x0, x1, head);
            ctx.save();
            ctx.strokeStyle = HAIR;
            ctx.lineWidth = 4 * k;
            line(ctx, x0, y, x1, y);
            const g = ctx.createLinearGradient(x0, 0, x1, 0);
            g.addColorStop(0, MAGENTA);
            g.addColorStop(1, PINK);
            ctx.strokeStyle = g;
            line(ctx, x0, y, hx, y);
            for (let year = 2016; year <= 2026; year++) dot(ctx, xOf(year), y, 4 * k, hx >= xOf(year) - 2 ? INK : HAIR);
            if (head < 1) dot(ctx, hx, y, 9 * k, PINK);
            ctx.restore();
            text(ctx, "2016", x0 - 14 * k, y, 18 * k, { color: INK, weight: 800, align: "right" });
            text(ctx, "2026", x1 + 14 * k, y, 18 * k, { color: INK, weight: 800, align: "left", alpha: progress(head, 0.95, 1) });

            MILESTONES.forEach((ms) => {
                const x = xOf(ms.year);
                const a = pop(hx, x - 100 * k, 100 * k);
                if (a <= 0) return;
                const dir = ms.up ? -1 : 1;
                ctx.save();
                ctx.strokeStyle = ms.color;
                ctx.lineWidth = 2 * k;
                line(ctx, x, y + dir * 10 * k, x, y + dir * 26 * k, Math.min(1, a));
                ctx.restore();
                dot(ctx, x, y, 10 * k * Math.min(1.2, a), ms.color);
                dot(ctx, x, y, 4 * k, "#fff");
                const align: CanvasTextAlign = x > W * 0.75 ? "right" : "left";
                const tx = x + (align === "left" ? -6 : 6) * k;
                const ty = ms.up ? y - 64 * k : y + 44 * k;
                scaled(ctx, tx, ty, 0.85 + 0.15 * a, () => {
                    text(ctx, ms.title, tx, ty, 22 * k, { color: INK, weight: 800, align, alpha: Math.min(1, a) });
                    text(ctx, ms.sub, tx, ty + 24 * k, 15 * k, { color: GREY, weight: 600, align, alpha: Math.min(1, a), maxWidth: W * 0.3 });
                });
            });
            ctx.restore();

            text(ctx, "PROJECTS ON BISS-INSTITUTE.COM", W / 2, grid.y0 - 26 * k, 15 * k, { color: GREY, weight: 700, alpha: progress(m, 0.8, 1.2) });

            // the numbers, counting up
            const sy = Math.min(safe.bottom - 24 * k, grid.y0 + 2 * (grid.h + grid.gap) + 40 * k);
            STATS.forEach((s, i) => {
                const x = W * (0.3 + i * 0.2);
                const a = pop(m, 2.8 + i * 0.2);
                if (a <= 0) return;
                const v = Math.round(s.value * ease(progress(m, 2.8 + i * 0.2, 4.2 + i * 0.2)));
                scaled(ctx, x, sy, Math.max(0, a), () => {
                    text(ctx, String(v), x - 6 * k, sy, 36 * k, { color: [MAGENTA, PINK, ORANGE][i], weight: 800, align: "right" });
                    text(ctx, s.label, x + 4 * k, sy + 4 * k, 18 * k, { color: GREY, weight: 700, align: "left" });
                });
            });
        },
        { zoomIn: 0, zoomOut: 0.02 }
    );
    //#endregion

    //#region project cards: pop into the grid, then fly out to their domains
    if (t >= T.decade && t < T.how) {
        const leave = ease(progress(t, T.how - 0.45, T.how));
        const cellW = W / 3;
        const cellH = span / 2;
        const domainAt = (i: number) => ({ x: cellW * (i % 3) + cellW / 2, y: safe.top + cellH * Math.floor(i / 3) });
        const pillH = Math.min(span * 0.068, 46 * k);
        const pillW = Math.min(cellW * 0.86, 380 * k);
        const pillY = (d: number, slot: number) => domainAt(d).y + cellH * 0.3 + slot * (pillH + span * 0.012) + pillH / 2;

        // domain headers and their links (under the pills)
        DOMAINS.forEach((d, i) => {
            const a = pop(t, T.domains + 0.1 + i * 0.12);
            if (a <= 0) return;
            const c = domainAt(i);
            const hy = c.y + cellH * 0.13;
            const r = Math.min(span * 0.045, 30 * k);
            ctx.save();
            ctx.globalAlpha *= 1 - leave;
            ctx.strokeStyle = hexA(d.color, 0.55);
            ctx.lineWidth = 1.5 * k;
            PILLS.filter((p) => p.domain === d.id).forEach((p) => {
                const landed = progress(t, T.domains + 0.9 + p.index * 0.12 + 0.8, T.domains + 0.9 + p.index * 0.12 + 1.2);
                const py = pillY(i, p.slot);
                line(ctx, c.x - pillW / 2 - 12 * k, hy, c.x - pillW / 2 - 12 * k, py, landed);
                if (landed > 0) line(ctx, c.x - pillW / 2 - 12 * k, py, c.x - pillW / 2, py, landed);
            });
            ctx.restore();
            ctx.save();
            ctx.globalAlpha *= 1 - leave;
            scaled(ctx, c.x - pillW / 2 - 12 * k, hy, Math.max(0, a), () => {
                dot(ctx, c.x - pillW / 2 - 12 * k, hy, r * 0.55, d.color);
                dot(ctx, c.x - pillW / 2 - 12 * k, hy, r * 0.22, "#fff");
            });
            text(ctx, d.label, c.x - pillW / 2 + 14 * k, hy, 25 * k, { color: INK, weight: 800, align: "left", alpha: Math.min(1, a), maxWidth: pillW });
            ctx.restore();
        });

        PILLS.forEach((x) => {
            const i = x.index;
            const appear = T.decade + 0.8 + i * 0.13;
            const a = back(progress(t, appear, appear + 0.5));
            if (a <= 0) return;
            const start = T.domains + 0.9 + i * 0.12 + (x.slot > 0 && x.p.domains.length > 1 ? 0.25 : 0);
            const fly = ease(progress(t, start, start + 0.8));
            const from = cardAt(i);
            const d = DOMAINS.findIndex((dd) => dd.id === x.domain);
            const to = { x: domainAt(d).x, y: pillY(d, x.slot) };
            const cx = lerp(from.x, to.x, fly);
            const cyy = lerp(from.y, to.y, fly) - Math.sin(fly * Math.PI) * 60 * k;
            const w = lerp(cardW, pillW, fly);
            const h = lerp(grid.h, pillH, fly);
            // only the first copy shows in the grid; the second appears as it flies
            const copy = x.p.domains.indexOf(x.domain) > 0;
            const alpha = (copy ? progress(fly, 0, 0.15) : 1) * (1 - leave);
            scaled(ctx, cx, cyy, fly > 0 ? 1 : Math.max(0, a), () =>
                projectCard(x.p, cx, cyy, w, h, Math.min(1, a) * alpha, 1 - progress(fly, 0, 0.4))
            );
        });
    }
    //#endregion

    //#region how: one real project travels from challenge to impact
    camera(T.how, T.partners, () => {
        const m = t - T.how;
        const xs = STATIONS.map((_, i) => W * (0.14 + 0.24 * i));
        const y = safe.top + span * 0.2;
        const R = 30 * k;
        const hop = (i: number) => 0.5 + i * 1.45;

        // rail
        ctx.save();
        ctx.strokeStyle = HAIR;
        ctx.lineWidth = 4 * k;
        line(ctx, xs[0], y, xs[xs.length - 1], y, ease(progress(m, 0, 0.6)));
        const g = ctx.createLinearGradient(xs[0], 0, xs[xs.length - 1], 0);
        g.addColorStop(0, PINK);
        g.addColorStop(1, GREEN);
        ctx.strokeStyle = g;
        const reached = lerp(xs[0], xs[xs.length - 1], ease(progress(m, hop(0), hop(STATIONS.length - 1))));
        line(ctx, xs[0], y, reached, y);
        ctx.restore();

        STATIONS.forEach((s, i) => {
            const a = pop(m, 0.1 + i * 0.12);
            const lit = progress(m, hop(i), hop(i) + 0.3);
            scaled(ctx, xs[i], y, Math.max(0, a), () => {
                dot(ctx, xs[i], y, R, lit > 0 ? s.color : "#fff");
                ctx.save();
                ctx.strokeStyle = s.color;
                ctx.lineWidth = 3 * k;
                ctx.beginPath();
                ctx.arc(xs[i], y, R, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                text(ctx, String(i + 1), xs[i], y + 1 * k, 24 * k, { color: lit > 0 ? "#fff" : INK, weight: 800 });
            });
            text(ctx, s.label, xs[i], y + R + 26 * k, 24 * k, { color: INK, weight: 800, alpha: Math.min(1, Math.max(0, a)) });

            // the detail card springs up as the project arrives
            const c = pop(m, hop(i) + 0.15, 0.6);
            if (c <= 0) return;
            const cw = Math.min(W * 0.215, 400 * k);
            const top = y + R + 52 * k;
            const ch = safe.bottom - top - 10 * k;
            scaled(ctx, xs[i], top, Math.max(0, c), () => {
                ctx.save();
                ctx.globalAlpha *= Math.min(1, c);
                ctx.shadowColor = "rgba(11,16,32,0.12)";
                ctx.shadowBlur = 18 * k;
                ctx.shadowOffsetY = 5 * k;
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.roundRect(xs[i] - cw / 2, top, cw, ch, 12 * k);
                ctx.fill();
                ctx.shadowColor = "transparent";
                ctx.fillStyle = s.color;
                ctx.fillRect(xs[i] - cw / 2, top, cw, 4 * k);
                // a concrete visual per step
                const vy = top + ch * 0.25;
                if (i === 0) logoCard(ctx, "gemeente-sittard-geleen", xs[i], vy, Math.min(cw * 0.8, 240 * k), Math.min(ch * 0.3, 80 * k), k, 1);
                if (i === 1) {
                    const team = EXAMPLE_TEAM.map((n) => props.members.find((p) => plain(p.title).includes(n)));
                    const fr = Math.min(cw / 10, ch * 0.12);
                    team.forEach((p, j) => {
                        const fa = pop(m, hop(1) + 0.3 + j * 0.12);
                        face(ctx, p?.photo, p?.title ?? EXAMPLE_TEAM[j], xs[i] + (j - 1.5) * fr * 2.3, vy, fr * Math.max(0, fa), k, Math.min(1, Math.max(0, fa)));
                    });
                }
                if (i === 2) {
                    // an illustrative form being simplified
                    const fw = cw * 0.6;
                    const rows = 3;
                    for (let j = 0; j < rows; j++) {
                        const ry = vy - ch * 0.08 + j * ch * 0.075;
                        const done = progress(m, hop(2) + 0.5 + j * 0.25, hop(2) + 0.7 + j * 0.25);
                        ctx.fillStyle = "#eef0f4";
                        ctx.beginPath();
                        ctx.roundRect(xs[i] - fw / 2 + 30 * k, ry - 8 * k, fw - 30 * k, 16 * k, 8 * k);
                        ctx.fill();
                        dot(ctx, xs[i] - fw / 2 + 10 * k, ry, 9 * k, done > 0 ? CYAN : "#dfe3ea");
                        if (done > 0) {
                            ctx.strokeStyle = "#fff";
                            ctx.lineWidth = 2.4 * k;
                            ctx.beginPath();
                            ctx.moveTo(xs[i] - fw / 2 + 5 * k, ry);
                            ctx.lineTo(xs[i] - fw / 2 + 9 * k, ry + 4 * k);
                            ctx.lineTo(xs[i] - fw / 2 + 15 * k, ry - 4 * k);
                            ctx.stroke();
                        }
                    }
                }
                if (i === 3) {
                    const f = ease(progress(m, hop(3) + 0.4, hop(3) + 1.4));
                    const bw = cw * 0.6;
                    const by = vy + ch * 0.06;
                    [0.85, 0.55].forEach((v, j) => {
                        const bh = ch * 0.22 * (j === 0 ? 1 : lerp(1, v, f));
                        ctx.fillStyle = j === 0 ? "#dfe3ea" : GREEN;
                        ctx.fillRect(xs[i] - bw / 4 + j * bw * 0.3 - bw * 0.12, by - bh, bw * 0.22, bh);
                    });
                    text(ctx, "effort before / after (illustrative)", xs[i], by + 14 * k, 12 * k, { color: GREY, weight: 600, maxWidth: cw - 20 * k });
                }
                // the step's text
                ctx.font = `600 ${17 * k}px ${FONT}`;
                const lines = wrap(ctx, s.body, cw - 36 * k);
                const lh = 23 * k;
                const ty = top + ch * 0.5 + 6 * k;
                lines.slice(0, Math.floor((top + ch - ty - 8 * k) / lh)).forEach((l, j) =>
                    text(ctx, l, xs[i] - cw / 2 + 18 * k, ty + j * lh + lh / 2, 17 * k, { color: "#1f2937", weight: 500, align: "left" })
                );
                ctx.restore();
            });
        });

        // the project token, hopping from station to station
        const pos = STATIONS.reduce((sum, _, i) => sum + (i === 0 ? 0 : back(progress(m, hop(i), hop(i) + 0.55))), 0);
        const seg = Math.min(STATIONS.length - 2, Math.floor(pos));
        const frac = pos - seg;
        const tx = lerp(xs[seg], xs[seg + 1], frac);
        const tyy = y - R - 30 * k - Math.sin(Math.min(1, Math.max(0, frac)) * Math.PI) * 34 * k;
        const ta = pop(m, 0.3);
        if (ta > 0) {
            ctx.font = `800 ${16 * k}px ${FONT}`;
            const label = "Clear welfare application";
            const w = ctx.measureText(label).width + 40 * k;
            const x = Math.min(Math.max(tx, w / 2 + 12 * k), W - w / 2 - 12 * k);
            scaled(ctx, x, tyy, Math.max(0, ta), () => {
                ctx.save();
                ctx.shadowColor = "rgba(11,16,32,0.2)";
                ctx.shadowBlur = 14 * k;
                ctx.fillStyle = INK;
                ctx.beginPath();
                ctx.roundRect(x - w / 2, tyy - 18 * k, w, 36 * k, 18 * k);
                ctx.fill();
                ctx.restore();
                dot(ctx, x - w / 2 + 16 * k, tyy, 5 * k, GREEN);
                text(ctx, label, x + 6 * k, tyy + 1 * k, 16 * k, { color: "#fff", weight: 800 });
            });
        }
    });
    //#endregion

    //#region partners: logos stream in and link to the projects they joined
    camera(T.partners, T.outro, () => {
        const m = t - T.partners;
        const cols = LINKED.length;
        const colW = (W * 0.94) / cols;
        const xOf = (i: number) => W * 0.03 + colW * (i + 0.5);
        const py = safe.top + span * 0.56;
        const pw = colW - 18 * k;
        const ph = Math.min(span * 0.1, 64 * k);
        const lh = Math.min(span * 0.085, 56 * k);
        const lw = Math.min(lh * 2.1, (colW - 30 * k) / 2);
        const fy = safe.top + span * 0.88;
        const fh = lh;
        const fw = Math.min(lh * 2.2, colW * 0.8);

        const partnerPos = (i: number, j: number, n: number) => {
            const row = Math.floor(j / 2);
            const inRow = Math.min(2, n - row * 2);
            const col = j % 2;
            return {
                x: xOf(i) + (inRow === 1 ? 0 : (col - 0.5) * (lw + 10 * k)),
                y: py - ph / 2 - 30 * k - lh / 2 - row * (lh + 12 * k),
            };
        };
        const funderX = (id: string) => {
            const users = LINKED.map((l, i) => (l.funders.includes(id) ? i : -1)).filter((i) => i >= 0);
            const base = users.reduce((a, b) => a + b, 0) / users.length;
            const shared = LINKED[users[0]].funders;
            const offset = users.length === 1 && shared.length > 1 ? (shared.indexOf(id) - (shared.length - 1) / 2) * (fw * 0.55 + 6 * k) : 0;
            return xOf(base) + offset;
        };
        const partnerAt = (i: number, j: number) => 0.6 + i * 0.25 + j * 0.12;
        const funderAt = (n: number) => 2.4 + n * 0.22;

        // links first, so they run under every card
        ctx.save();
        ctx.lineWidth = 1.6 * k;
        LINKED.forEach((l, i) => {
            l.partners.forEach((_, j) => {
                const q = partnerPos(i, j, l.partners.length);
                const f = ease(progress(m, partnerAt(i, j) + 0.4, partnerAt(i, j) + 0.8));
                ctx.strokeStyle = LINE_PINK;
                line(ctx, q.x, q.y, xOf(i), py, f);
            });
            l.funders.forEach((id) => {
                const n = FUNDER_IDS.indexOf(id);
                const f = ease(progress(m, funderAt(n) + 0.4, funderAt(n) + 0.9));
                ctx.strokeStyle = hexA(MAGENTA, 0.45);
                line(ctx, funderX(id), fy, xOf(i), py, f);
            });
        });
        // sparks travelling along the funder links
        LINKED.forEach((l, i) =>
            l.funders.forEach((id, j) => {
                const n = FUNDER_IDS.indexOf(id);
                if (m < funderAt(n) + 0.9) return;
                const q = ((t * 0.6 + i * 0.3 + j * 0.5) % 1);
                ctx.globalAlpha = Math.sin(q * Math.PI);
                dot(ctx, lerp(funderX(id), xOf(i), q), lerp(fy, py, q), 3.5 * k, MAGENTA);
            })
        );
        ctx.restore();

        // the projects
        LINKED.forEach((l, i) => {
            const a = pop(m, 0.1 + i * 0.1);
            if (a <= 0) return;
            const p = PROJECTS.find((pp) => pp.id === l.id)!;
            scaled(ctx, xOf(i), py, Math.max(0, a), () => projectCard({ ...p, title: l.title }, xOf(i), py, pw, ph, Math.min(1, a), 0));
        });

        // partners drop in from above
        LINKED.forEach((l, i) =>
            l.partners.forEach((id, j) => {
                const q = partnerPos(i, j, l.partners.length);
                const f = back(progress(m, partnerAt(i, j), partnerAt(i, j) + 0.6));
                if (f <= 0) return;
                const y = lerp(safe.top - lh, q.y, f);
                logoCard(ctx, id, q.x, y, lw, lh, k, Math.min(1, f * 1.5));
            })
        );

        // funders rise from below
        FUNDER_IDS.forEach((id, n) => {
            const f = back(progress(m, funderAt(n), funderAt(n) + 0.6));
            if (f <= 0) return;
            const y = lerp(safe.bottom + fh, fy, f);
            logoCard(ctx, id, funderX(id), y, fw, fh, k, Math.min(1, f * 1.5), MAGENTA);
        });

        text(ctx, "PARTNERS", W * 0.03, safe.top + 8 * k, 15 * k, { color: GREY, weight: 800, align: "left", alpha: progress(m, 0.4, 0.8) });
        text(ctx, "FUNDED BY", W * 0.03, fy - fh / 2 - 18 * k, 15 * k, { color: GREY, weight: 800, align: "left", alpha: progress(m, 2.2, 2.6) });
    });
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["map", T.map],
        ["team", T.team],
        ["decade", T.decade],
        ["domains", T.domains],
        ["how", T.how],
        ["partners", T.partners],
        ["outro", T.outro],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
<style scoped>
/* the player behind is dark navy; this showcase paints its own white backdrop */
.about {
    position: absolute;
    inset: 0;
    background: #fff;
}

/* the whole team is on the closing card: smaller faces that wrap */
.about :deep(.faces) {
    flex-wrap: wrap;
    justify-content: center;
    max-width: min(90vw, 70rem);
    row-gap: 0.6rem;
}

.about :deep(.faces img) {
    width: 3.6rem;
    height: 3.6rem;
    margin-right: -0.5rem;
}
</style>

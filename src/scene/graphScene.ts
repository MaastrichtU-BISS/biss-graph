import ForceGraph3D, { ForceGraph3DInstance } from "3d-force-graph";
import * as THREE from "three";
import { forceCollide } from "d3-force-3d";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { entities, graphData } from "../data/graph";
import { NodeType } from "../types/graph";

export const BACKGROUND = "#060914";

type SimNode = { id: string; x?: number; y?: number; z?: number };
type SimLink = { source?: string | number | SimNode; target?: string | number | SimNode };

type Visual = {
  root: THREE.Group;
  /** Every material whose opacity follows the node's fade. */
  materials: THREE.Material[];
  halo: THREE.Sprite;
  haloBase: number;
  /** World radius used for tap picking. */
  hitRadius: number;
  fade: number;
  fadeTarget: number;
  /** Extra scale for the node in focus, eased like the fade. */
  emphasis: number;
  phase: number;
  /** Photo or orb and label; drawn above dimmed nodes while highlighted. */
  drawn: THREE.Object3D[];
  label: THREE.Sprite;
  labelSize: THREE.Vector2;
  /** Radius of the photo or orb, for keeping labels off it. */
  bodyRadius: number;
  /** Places the label may sit, as screen-aligned offsets from the node, preferred first. */
  anchors: THREE.Vector2[];
  anchor: number;
  labelOffset: THREE.Vector2;
};

type Box = { x0: number; y0: number; x1: number; y1: number };

const boxOverlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Re-plan label positions every this many frames. */
const LABEL_PLAN_EVERY = 8;

export type FocusMode = "select" | "spotlight";

/** Area of the screen covered by UI, in 0..1 coordinates with y pointing down. */
export type ScreenRect = { x0: number; y0: number; x1: number; y1: number };

const overlap = (a: ScreenRect, b: ScreenRect) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

const PHOTO_SIZE = 13;
const LABEL_LINE = 2.8;
/** Project names longer than this many characters wrap onto more lines. */
const LABEL_WRAP = 26;
const PROJECT_CORE = 2.8;
/** Fingers wobble; anything shorter than this still counts as a tap. */
const TAP_SLOP_PX = 18;
const TAP_MAX_MS = 700;
const MIN_TAP_RADIUS_PX = 36;
/** Beyond this camera distance nodes scale up with distance. */
const FAR_SCALE_FROM = 260;
/**
 * three-forcegraph draws links at render order 10. Nodes come after and skip the depth
 * test, so a link pointing at the camera can never cut across a photo or label. Nodes
 * still sort among themselves back-to-front.
 */
const HALO_ORDER = 1;
const NODE_ORDER = 20;

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    // website photos are drawn to a canvas, which needs a CORS-clean image
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const canvasTexture = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

let glowTextureCache: THREE.Texture | undefined;
const glowTexture = () => {
  if (glowTextureCache) return glowTextureCache;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.55)");
  g.addColorStop(0.45, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTextureCache = canvasTexture(canvas);
  return glowTextureCache;
};

const initials = (title: string) =>
  title
    .replace(/^((dr|prof|mr|ms|ir)\.?\s+)+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

const photoTexture = (img: HTMLImageElement | null, title: string) => {
  const size = 512;
  const ring = 16;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - ring, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    // cover-fit, biased towards the top where faces usually are
    const s = Math.min(img.width, img.height);
    const sx = (img.width - s) / 2;
    const sy = Math.max(0, (img.height - s) * 0.2);
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
  } else {
    ctx.fillStyle = "#1b2347";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#dfe6ff";
    ctx.font = `600 170px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(title), r, r + 8);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(r, r, r - ring / 2, 0, Math.PI * 2);
  ctx.lineWidth = ring;
  ctx.strokeStyle = "rgba(235, 240, 255, 0.95)";
  ctx.stroke();

  return canvasTexture(canvas);
};

/** Greedy word wrap, for names that come from the website without line breaks. */
const wrap = (text: string, width: number) =>
  text.split(/\s+/).reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= width) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
    return lines;
  }, []);

/** Text label rendered to a sprite; returns the sprite and its world height. */
const labelSprite = (text: string, accent?: string, wrapAt?: number) => {
  const fontPx = 64;
  const lineHeight = fontPx * 1.22;
  const padX = 34;
  const padY = 20;
  const bar = accent ? 14 : 0;
  const lines = wrapAt && !text.includes("\n") ? wrap(text, wrapAt) : text.split("\n").map((l) => l.trim());

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `600 ${fontPx}px ${FONT}`;
  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  canvas.width = Math.ceil(textWidth + padX * 2 + bar);
  canvas.height = Math.ceil(lines.length * lineHeight + padY * 2);

  const radius = 26;
  ctx.fillStyle = "rgba(6, 9, 22, 0.72)";
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, radius);
  ctx.fill();
  if (accent) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, bar, canvas.height);
    ctx.restore();
  }

  ctx.font = `600 ${fontPx}px ${FONT}`;
  ctx.fillStyle = "#f4f6ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) =>
    ctx.fillText(l, bar + padX + textWidth / 2, padY + lineHeight * (i + 0.5) + 2)
  );

  const material = new THREE.SpriteMaterial({
    map: canvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const worldPerPx = LABEL_LINE / lineHeight;
  sprite.scale.set(canvas.width * worldPerPx, canvas.height * worldPerPx, 1);
  sprite.renderOrder = NODE_ORDER;
  return { sprite, height: canvas.height * worldPerPx };
};

const mix = (a: string, b: string, t: number) =>
  "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

const starfield = () => {
  const count = 1800;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tints = ["#ffffff", "#a9c1ff", "#ffd9b0", "#c9b8ff"].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const r = 1400 + Math.random() * 1800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.set(
      [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)],
      i * 3
    );
    const c = tints[i % tints.length].clone().multiplyScalar(0.35 + Math.random() * 0.65);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    fog: false,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
};

export class GraphScene {
  private graph!: ForceGraph3DInstance<SimNode, SimLink>;
  private visuals: Record<string, Visual> = {};
  private nodes: SimNode[] = [];
  private focusId: string | null = null;
  private focusMode: FocusMode = "select";
  private frame = 0;
  private tick = 0;
  private controlsTimer?: number;
  /** Whether the camera should drift on its own once no tween owns it. */
  private wantAutoRotate = false;
  private cleanup: (() => void)[] = [];

  constructor(
    private container: HTMLElement,
    private onTap: (id: string | null) => void
  ) {}

  async init() {
    await document.fonts.load(`600 64px ${FONT}`).catch(() => undefined);
    await this.buildVisuals();

    const data: { nodes: SimNode[]; links: SimLink[] } = {
      nodes: graphData.nodes.map((n) => ({ id: n.id })),
      links: graphData.links.map((l) => ({ source: l.source, target: l.target })),
    };

    const graph = new ForceGraph3D(this.container, { controlType: "orbit" }) as unknown as ForceGraph3DInstance<
      SimNode,
      SimLink
    >;
    this.graph = graph
      .backgroundColor("rgba(0,0,0,0)")
      .showNavInfo(false)
      .enableNodeDrag(false)
      // picking is done here: the built-in one drops taps that wobble by >1px
      .enablePointerInteraction(false)
      .nodeLabel(() => "")
      .nodeThreeObject((n: SimNode) => this.visuals[n.id].root)
      .linkOpacity(0.85)
      .linkDirectionalParticleSpeed(0.004)
      // settle the layout up front, then freeze it so nothing jitters
      .warmupTicks(300)
      .cooldownTicks(0);

    this.graph.d3Force("charge")?.strength(-110);
    this.graph.d3Force("link")?.distance(34);
    // keep room for a photo and its label around every node, so none sit on top of each other
    this.graph.d3Force(
      "collide",
      forceCollide<SimNode>((n) => (entities[n.id].group === NodeType.TEAM_MEMBER ? PHOTO_SIZE : PROJECT_CORE * 3.5))
        .strength(1)
        .iterations(2) as never
    );
    this.graph.graphData(data);
    this.nodes = data.nodes;
    this.applyLinkStyle();

    const scene = this.graph.scene();
    scene.add(starfield());
    scene.fog = new THREE.FogExp2(BACKGROUND, 0.0011);

    const renderer = this.graph.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = this.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.9;
    // keep the view pinned on its centre: one finger turns, two fingers only zoom
    controls.enablePan = false;
    controls.autoRotateSpeed = 0.18;
    controls.minDistance = 25;

    // the layout is computed on the next frames; framing needs real positions
    await this.layoutReady();
    this.overview(0);
    this.bindPointer();
    this.bindResize();
    this.animate();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.cleanup.forEach((fn) => fn());
    this.graph?._destructor();
  }

  private layoutReady() {
    return new Promise<void>((resolve) => {
      const started = performance.now();
      const check = () => {
        const placed = this.nodes.every((n) => n.x !== undefined);
        if (placed || performance.now() - started > 4000) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  private controls() {
    return this.graph.controls() as OrbitControls;
  }

  private async buildVisuals() {
    const images = await Promise.all(
      graphData.nodes.map((n) => {
        const photo = entities[n.id].photo;
        return photo ? loadImage(photo) : Promise.resolve(null);
      })
    );

    graphData.nodes.forEach((n, i) => {
      const e = entities[n.id];
      const root = new THREE.Group();
      const materials: THREE.Material[] = [];

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture(),
          color: e.color,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.renderOrder = HALO_ORDER;
      root.add(halo);

      let hitRadius: number;
      let haloBase: number;
      let label: ReturnType<typeof labelSprite>;
      let drawn: THREE.Object3D[];
      let bodyRadius: number;
      let anchors: THREE.Vector2[];

      if (e.group === NodeType.TEAM_MEMBER) {
        const photoMaterial = new THREE.SpriteMaterial({
          map: photoTexture(images[i], e.title),
          transparent: true,
          depthWrite: false,
          depthTest: false,
        });
        const photo = new THREE.Sprite(photoMaterial);
        photo.renderOrder = NODE_ORDER;
        photo.scale.set(PHOTO_SIZE, PHOTO_SIZE, 1);
        root.add(photo);
        materials.push(photoMaterial);

        label = labelSprite(e.title);
        root.add(label.sprite);
        materials.push(label.sprite.material);
        drawn = [photo, label.sprite];
        bodyRadius = PHOTO_SIZE / 2;
        const gap = PHOTO_SIZE / 2 + label.height / 2 + 0.5;
        anchors = [new THREE.Vector2(0, -gap), new THREE.Vector2(0, gap)];

        halo.scale.setScalar(PHOTO_SIZE * 2.4);
        haloBase = 0;
        hitRadius = PHOTO_SIZE * 0.62;
      } else {
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(PROJECT_CORE, 32, 16),
          new THREE.MeshBasicMaterial({
            color: mix(e.color, "#ffffff", 0.25),
            transparent: true,
            depthWrite: false,
            depthTest: false,
          })
        );
        core.renderOrder = NODE_ORDER;
        root.add(core);
        materials.push(core.material as THREE.Material);

        label = labelSprite(e.name, e.color, LABEL_WRAP);
        root.add(label.sprite);
        materials.push(label.sprite.material);
        drawn = [core, label.sprite];
        bodyRadius = PROJECT_CORE;
        const above = PROJECT_CORE + label.height / 2 + 1.4;
        const beside = PROJECT_CORE + label.sprite.scale.x / 2 + 1.4;
        anchors = [
          new THREE.Vector2(0, above),
          new THREE.Vector2(0, -above),
          new THREE.Vector2(beside, 0),
          new THREE.Vector2(-beside, 0),
        ];

        halo.scale.setScalar(PROJECT_CORE * 9);
        haloBase = 0.75;
        hitRadius = PROJECT_CORE * 2.6;
      }

      materials.forEach((m) => (m.userData.baseOpacity = m.opacity));
      this.visuals[n.id] = {
        root,
        materials,
        halo,
        haloBase,
        hitRadius,
        fade: 1,
        fadeTarget: 1,
        emphasis: 1,
        phase: Math.random() * Math.PI * 2,
        drawn,
        label: label.sprite,
        labelSize: new THREE.Vector2(label.sprite.scale.x, label.height),
        bodyRadius,
        anchors,
        anchor: 0,
        labelOffset: anchors[0].clone(),
      };
    });
  }

  //#region Focus

  focus(id: string | null, mode: FocusMode = "select") {
    this.focusId = id;
    this.focusMode = mode;
    const related = new Set(id ? [id, ...entities[id].connections] : []);
    const dim = mode === "spotlight" ? 0.14 : 0.12;
    for (const [nodeId, v] of Object.entries(this.visuals)) {
      v.fadeTarget = !id || related.has(nodeId) ? 1 : dim;
      // highlighted nodes always draw over dimmed ones
      v.drawn.forEach((o) => (o.renderOrder = related.has(nodeId) ? NODE_ORDER + 1 : NODE_ORDER));
    }
    this.applyLinkStyle();
  }

  private linkEnds(l: SimLink) {
    const id = (end: SimLink["source"]) => String(typeof end === "object" ? end.id : end);
    return [id(l.source), id(l.target)];
  }

  private linkColorOf(l: SimLink) {
    const [s, t] = this.linkEnds(l);
    const project = entities[s].group === NodeType.PROJECT ? entities[s] : entities[t];
    return project.color;
  }

  private isActive(l: SimLink) {
    return !!this.focusId && this.linkEnds(l).includes(this.focusId);
  }

  private applyLinkStyle() {
    const focused = !!this.focusId;
    this.graph
      .linkColor((l: SimLink) => {
        const c = this.linkColorOf(l);
        if (!focused) return mix(c, BACKGROUND, 0.45);
        return this.isActive(l) ? mix(c, "#ffffff", 0.15) : mix(c, BACKGROUND, 0.88);
      })
      .linkWidth((l: SimLink) => (!focused ? 0.35 : this.isActive(l) ? 1.1 : 0.2))
      .linkDirectionalParticles((l: SimLink) => (!focused ? 1 : this.isActive(l) ? 4 : 0))
      .linkDirectionalParticleWidth((l: SimLink) => (this.isActive(l) ? 1.4 : 0.9))
      .linkDirectionalParticleColor((l: SimLink) =>
        this.isActive(l) ? "#ffffff" : mix(this.linkColorOf(l), "#ffffff", 0.4)
      );
  }

  //#endregion

  //#region Camera

  private nodeById(id: string) {
    return this.nodes.find((n) => n.id === id);
  }

  private vec(n: SimNode) {
    return new THREE.Vector3(n.x ?? 0, n.y ?? 0, n.z ?? 0);
  }

  private moveCamera(position: THREE.Vector3, lookAt: THREE.Vector3, ms: number) {
    const controls = this.controls();
    // let the tween own the camera; controls fighting it causes the jumps
    controls.enabled = false;
    controls.autoRotate = false;
    this.graph.cameraPosition(position, lookAt, ms);
    window.clearTimeout(this.controlsTimer);
    this.controlsTimer = window.setTimeout(() => {
      controls.enabled = true;
      controls.autoRotate = this.wantAutoRotate;
    }, ms + 30);
  }

  private bounds() {
    const points = this.nodes.map((n) => this.vec(n));
    const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(points.length);
    const distances = points.map((p) => p.distanceTo(center)).sort((a, b) => a - b);
    // frame the bulk of the graph; a few stragglers may sit at the edge
    const radius = distances[Math.floor(distances.length * 0.9)] * 1.1;
    return { center, radius, outer: distances[distances.length - 1] };
  }

  /** The node and everything linked to it. */
  private groupOf(id: string) {
    const node = this.nodeById(id);
    if (!node) return [];
    return [node, ...entities[id].connections.map((c) => this.nodeById(c))]
      .filter((n): n is SimNode => !!n)
      .map((n) => this.vec(n));
  }

  /**
   * Frame a group of points from the direction `back` (pointing from the group towards the
   * camera): centre on its extent and find the closest distance at which every point, with
   * room for its photo and label, fits in the given share of the screen.
   */
  private frameGroup(
    group: THREE.Vector3[],
    back: THREE.Vector3,
    widthShare: number,
    heightShare: number,
    minDistance = 90
  ) {
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const right = new THREE.Vector3().crossVectors(camera.up, back).normalize();
    const up = new THREE.Vector3().crossVectors(back, right);

    const center = new THREE.Box3().setFromPoints(group).getCenter(new THREE.Vector3());
    const xs = group.map((p) => p.clone().sub(center).dot(right));
    const ys = group.map((p) => p.clone().sub(center).dot(up));
    center
      .addScaledVector(right, (Math.min(...xs) + Math.max(...xs)) / 2)
      .addScaledVector(up, (Math.min(...ys) + Math.max(...ys)) / 2);

    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanX = tanV * camera.aspect * widthShare;
    const tanY = tanV * heightShare;
    const pad = PHOTO_SIZE * 1.1;
    const fit = Math.max(
      ...group.map((p) => {
        const d = p.clone().sub(center);
        const depth = d.dot(back);
        return Math.max(depth + (Math.abs(d.dot(right)) + pad) / tanX, depth + (Math.abs(d.dot(up)) + pad) / tanY);
      })
    );
    const distance = THREE.MathUtils.clamp(fit, minDistance, this.controls().maxDistance);
    return { center, right, up, distance, tanV, aspect: camera.aspect };
  }

  /**
   * Fly so a node and everything linked to it are in view, next to the detail panel.
   * `occludedRight` is the share of the screen width the panel covers; `overlays` are other
   * UI areas to keep the group clear of.
   */
  flyTo(id: string, occludedRight = 0, ms = 1400, overlays: ScreenRect[] = []) {
    const panel = occludedRight > 0 ? [{ x0: 1 - occludedRight, y0: 0, x1: 1, y1: 1 }] : [];
    this.flyToClear(id, [...panel, ...overlays], ms, {
      baseOx: occludedRight,
      widthShare: 1 - occludedRight - 0.04,
      minDistance: 90,
    });
  }

  /**
   * Like flyTo, but searches nearby viewing angles, distances and screen offsets for the
   * shot where the fewest photos and labels end up underneath the given overlays
   * (rectangles in 0..1 screen coordinates, y pointing down).
   */
  private flyToClear(
    id: string,
    overlays: ScreenRect[],
    ms: number,
    { baseOx = 0, widthShare = 0.94, minDistance = 150 } = {}
  ) {
    const group = this.groupOf(id);
    if (!group.length) return;
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const start = camera.position.clone().sub(group[0]);
    if (start.lengthSq() < 1e-6) start.set(0, 0, 1);
    start.normalize();

    const deg = THREE.MathUtils.degToRad;
    let best: { score: number; position: THREE.Vector3; lookAt: THREE.Vector3 } | undefined;

    for (const azimuth of [0, -25, 25, -50, 50]) {
      for (const elevation of [0, -20, 20]) {
        const back = start.clone().applyAxisAngle(camera.up, deg(azimuth));
        const side = new THREE.Vector3().crossVectors(camera.up, back).normalize();
        back.applyAxisAngle(side, deg(elevation));
        if (Math.abs(back.dot(camera.up)) > 0.85) continue; // avoid looking straight down

        // minDistance keeps some surroundings in view, even for a node with a single link
        const frame = this.frameGroup(group, back, widthShare, 0.9, minDistance);
        const turn = Math.acos(THREE.MathUtils.clamp(back.dot(start), -1, 1));

        for (const zoom of [1, 1.15, 1.35]) {
          const distance = frame.distance * zoom;
          const halfW = distance * frame.tanV * frame.aspect;
          const halfH = distance * frame.tanV;
          for (const ox of [baseOx, baseOx - 0.15, baseOx + 0.15]) {
            for (const oy of [0, -0.18, 0.18]) {
              const shift = frame.right.clone().multiplyScalar(ox * halfW).addScaledVector(frame.up, oy * halfH);
              const { hidden, crowded } = this.rateShot(
                group,
                frame.center,
                back,
                frame.right,
                frame.up,
                distance,
                shift,
                overlays
              );
              const score =
                hidden * 10 + crowded * 6 + zoom + turn * 0.6 + (Math.abs(ox - baseOx) + Math.abs(oy)) * 0.5;
              if (!best || score < best.score) {
                best = {
                  score,
                  position: frame.center.clone().addScaledVector(back, distance).add(shift),
                  lookAt: frame.center.clone().add(shift),
                };
              }
            }
          }
        }
      }
    }
    if (best) this.moveCamera(best.position, best.lookAt, ms);
  }

  /**
   * How good a shot is: the average share of each node's photo-and-label box that is off
   * screen or under an overlay, and how much the nodes of the group cover each other.
   */
  private rateShot(
    group: THREE.Vector3[],
    center: THREE.Vector3,
    back: THREE.Vector3,
    right: THREE.Vector3,
    up: THREE.Vector3,
    distance: number,
    shift: THREE.Vector3,
    overlays: ScreenRect[]
  ) {
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let hidden = 0;
    const boxes: ScreenRect[] = [];
    for (const p of group) {
      const d = p.clone().sub(center).sub(shift);
      const depth = distance - d.dot(back);
      if (depth <= 1) return { hidden: 1, crowded: 1 }; // behind the camera: useless shot
      const scale = THREE.MathUtils.clamp(depth / FAR_SCALE_FROM, 1, 1.8);
      const toU = (x: number) => 0.5 + x / (depth * tanV * camera.aspect) / 2;
      const toV = (y: number) => 0.5 - y / (depth * tanV) / 2;
      // photo or orb plus its label, roughly
      const x = d.dot(right);
      const y = d.dot(up);
      const box = {
        x0: toU(x - 9 * scale),
        x1: toU(x + 9 * scale),
        y0: toV(y + 9 * scale),
        y1: toV(y - 11 * scale),
      };
      const area = (box.x1 - box.x0) * (box.y1 - box.y0);
      const visible = overlap(box, { x0: 0, y0: 0, x1: 1, y1: 1 });
      const covered = overlays.reduce((sum, o) => sum + overlap(box, o), 0);
      hidden += Math.min(1, (area - visible + covered) / area);
      boxes.push(box);
    }
    let crowded = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const smaller = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (boxes[j].x1 - boxes[j].x0) * (boxes[j].y1 - boxes[j].y0));
        crowded += overlap(a, boxes[j]) / smaller;
      }
    }
    return { hidden: hidden / group.length, crowded: crowded / group.length };
  }

  overview(ms = 1800) {
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const { center, radius, outer } = this.bounds();
    const vFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const hFov = Math.atan(Math.tan(vFov) * camera.aspect);
    // the sphere is conservative for a flat-ish cloud, so frame a little tighter
    const distance = (radius * 0.92) / Math.sin(Math.min(vFov, hFov));

    const dir = camera.position.clone().sub(center);
    if (dir.lengthSq() < 1e-6 || ms === 0) dir.set(0.25, 0.15, 1);
    dir.normalize();

    this.controls().maxDistance = Math.max(distance, outer / Math.sin(Math.min(vFov, hFov))) * 1.4;
    this.moveCamera(center.clone().add(dir.multiplyScalar(distance)), center, ms);
  }

  /**
   * Idle-loop highlight: a slow flight to a still shot of the node and its connections,
   * chosen so they stay clear of the overlays on screen.
   */
  spotlight(id: string, overlays: ScreenRect[] = []) {
    this.focus(id, "spotlight");
    // a drifting camera would carry nodes underneath the overlays again
    this.setAutoRotate(false);
    this.flyToClear(id, overlays, 3000);
  }

  setAutoRotate(on: boolean) {
    this.wantAutoRotate = on;
    const controls = this.controls();
    // during a camera tween, moveCamera applies it once the tween ends
    if (controls.enabled) controls.autoRotate = on;
  }

  //#endregion

  //#region Picking

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const pxPerUnitAt1 = rect.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    let best: string | null = null;
    let bestScore = Infinity;
    for (const n of this.nodes) {
      const v = this.visuals[n.id];
      const world = this.vec(n);
      const projected = world.clone().project(camera);
      if (projected.z > 1) continue; // behind the camera
      const sx = ((projected.x + 1) / 2) * rect.width;
      const sy = ((1 - projected.y) / 2) * rect.height;
      const depth = camera.position.distanceTo(world);
      const radius = Math.max((v.hitRadius * v.root.scale.x * pxPerUnitAt1) / depth, MIN_TAP_RADIUS_PX);
      const score = Math.hypot(sx - x, sy - y) / radius;
      if (score < 1 && score + depth / 10000 < bestScore) {
        bestScore = score + depth / 10000;
        best = n.id;
      }
    }
    return best;
  }

  private bindPointer() {
    const el = this.container;
    const active = new Map<number, { x: number; y: number; t: number }>();
    let gestureWasMulti = false;

    const down = (e: PointerEvent) => {
      if (active.size === 0) gestureWasMulti = false;
      active.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
      if (active.size > 1) gestureWasMulti = true;
    };
    const up = (e: PointerEvent) => {
      const start = active.get(e.pointerId);
      active.delete(e.pointerId);
      if (!start || gestureWasMulti) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > TAP_SLOP_PX || performance.now() - start.t > TAP_MAX_MS) return;
      this.onTap(this.pick(e.clientX, e.clientY));
    };
    const cancel = (e: PointerEvent) => active.delete(e.pointerId);

    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointerup", up, true);
    el.addEventListener("pointercancel", cancel, true);
    this.cleanup.push(() => {
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointerup", up, true);
      el.removeEventListener("pointercancel", cancel, true);
    });
  }

  private bindResize() {
    const resize = () => {
      this.graph.width(this.container.clientWidth).height(this.container.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(this.container);
    this.cleanup.push(() => observer.disconnect());
  }

  //#endregion

  /**
   * Move labels to where they cover the fewest photos, orbs and other labels. The node in
   * focus and its connections choose first; a label only moves if that clearly helps.
   */
  private planLabels() {
    const camera = this.graph.camera() as THREE.PerspectiveCamera;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const pxPerUnitAt1 = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const related = new Set(this.focusId ? [this.focusId, ...entities[this.focusId].connections] : []);

    const items = Object.entries(this.visuals).flatMap(([id, v]) => {
      const world = v.root.getWorldPosition(new THREE.Vector3());
      const depth = world.distanceTo(camera.position);
      const ndc = world.clone().project(camera);
      if (ndc.z > 1 || v.fade < 0.05) return [];
      const k = (pxPerUnitAt1 / depth) * v.root.scale.x; // px per local unit
      const x = ((ndc.x + 1) / 2) * width;
      const y = ((1 - ndc.y) / 2) * height;
      const r = v.bodyRadius * k;
      const priority = id === this.focusId ? 0 : related.has(id) ? 1 : 2;
      return [{ v, x, y, k, depth, priority, weight: v.fade, body: { x0: x - r, y0: y - r, x1: x + r, y1: y + r } }];
    });
    items.sort((a, b) => a.priority - b.priority || a.depth - b.depth);

    const placed: { box: Box; weight: number }[] = [];
    for (const item of items) {
      const { v, x, y, k } = item;
      const w = (v.labelSize.x / 2) * k;
      const h = (v.labelSize.y / 2) * k;
      let best = v.anchor;
      let bestCost = Infinity;
      v.anchors.forEach((a, i) => {
        const box = { x0: x + a.x * k - w, x1: x + a.x * k + w, y0: y - a.y * k - h, y1: y - a.y * k + h };
        const area = 4 * w * h;
        let cost = 0;
        for (const other of items) if (other !== item) cost += boxOverlap(box, other.body) * other.weight;
        for (const p of placed) cost += boxOverlap(box, p.box) * p.weight;
        const offscreen = area - boxOverlap(box, { x0: 0, y0: 0, x1: width, y1: height });
        cost = (cost + offscreen) / area + i * 0.02 + (i === v.anchor ? 0 : 0.12);
        if (cost < bestCost) {
          bestCost = cost;
          best = i;
        }
      });
      v.anchor = best;
      const a = v.anchors[best];
      placed.push({
        box: { x0: x + a.x * k - w, x1: x + a.x * k + w, y0: y - a.y * k - h, y1: y - a.y * k + h },
        weight: v.fade,
      });
    }
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    const t = performance.now() / 1000;
    const camera = this.graph.camera();
    const node = new THREE.Vector3();
    if (++this.tick % LABEL_PLAN_EVERY === 0) this.planLabels();
    // label offsets are screen-aligned, so they follow the camera's own axes
    const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    for (const [id, v] of Object.entries(this.visuals)) {
      // grow nodes when seen from afar so names stay legible across the room
      v.root.getWorldPosition(node);
      const emphasisTarget = id !== this.focusId ? 1 : this.focusMode === "spotlight" ? 1.35 : 1.15;
      v.emphasis += (emphasisTarget - v.emphasis) * 0.06;
      const distanceScale = THREE.MathUtils.clamp(camera.position.distanceTo(node) / FAR_SCALE_FROM, 1, 1.8);
      v.root.scale.setScalar(distanceScale * v.emphasis);

      // the idle spotlight drifts; a selection by touch responds quickly
      v.labelOffset.lerp(v.anchors[v.anchor], 0.15);
      v.label.position.copy(camRight).multiplyScalar(v.labelOffset.x).addScaledVector(camUp, v.labelOffset.y);

      v.fade += (v.fadeTarget - v.fade) * (this.focusMode === "spotlight" ? 0.04 : 0.12);
      // dimmed nodes right in front of the camera would only be a big blur: hide them
      const near = v.fadeTarget < 1 ? THREE.MathUtils.smoothstep(camera.position.distanceTo(node), 30, 110) : 1;
      for (const m of v.materials) m.opacity = m.userData.baseOpacity * v.fade * near;

      const focused = id === this.focusId;
      const breathe = 1 + 0.06 * Math.sin(t * 1.3 + v.phase);
      const pulse = 1 + 0.14 * Math.sin(t * 3.2);
      const haloMaterial = v.halo.material;
      if (focused) {
        haloMaterial.opacity = 0.85 + 0.15 * Math.sin(t * 3.2);
        v.halo.scale.setScalar(this.haloScale(id) * 1.25 * pulse);
      } else {
        haloMaterial.opacity = v.haloBase * v.fade * near;
        v.halo.scale.setScalar(this.haloScale(id) * breathe);
      }
    }
  };

  private haloScale(id: string) {
    return entities[id].group === NodeType.TEAM_MEMBER ? PHOTO_SIZE * 2.4 : PROJECT_CORE * 9;
  }
}

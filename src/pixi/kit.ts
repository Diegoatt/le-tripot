import 'pixi.js/unsafe-eval'; // lets Pixi run under our CSP without eval
import { Application, Container, Sprite, Text, TextStyleOptions, Texture } from 'pixi.js';
import gsap from 'gsap';
import { getState } from '../store';

/** Every scene is authored in this virtual space and letterboxed to the host element. */
export const W = 1600;
export const H = 900;

export const DISPLAY = '"Bebas Neue", Impact, sans-serif';
export const BODY = 'Inter, "Segoe UI", sans-serif';
export const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export interface Stage {
  app: Application;
  root: Container;
  destroy: () => void;
}

export async function createStage(host: HTMLElement): Promise<Stage> {
  await document.fonts.load(`64px "Bebas Neue"`).catch(() => undefined);
  const app = new Application();
  await app.init({
    resizeTo: host,
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: 'webgl',
  });
  host.appendChild(app.canvas);
  const root = new Container();
  app.stage.addChild(root);
  const fit = () => {
    const s = Math.min(app.screen.width / W, app.screen.height / H);
    root.scale.set(s);
    root.position.set((app.screen.width - W * s) / 2, (app.screen.height - H * s) / 2);
  };
  fit();
  app.renderer.on('resize', fit);
  return {
    app,
    root,
    destroy: () => {
      gsap.killTweensOf(root);
      app.destroy(true, { children: true });
    },
  };
}

/** Frame callback that freezes while the evening is paused. dt in seconds. */
export function onFrame(app: Application, fn: (dt: number) => void) {
  const cb = () => {
    if (!getState().paused) fn(Math.min(0.05, app.ticker.deltaMS / 1000));
  };
  app.ticker.add(cb);
  return () => app.ticker.remove(cb);
}

let glow: Texture | null = null;
/** Soft white radial gradient, tinted and added for lights, bokeh and particles. */
export function glowTex(): Texture {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glow = Texture.from(c);
  return glow;
}

export function glowSprite(color: number, size: number, alpha = 1): Sprite {
  const s = new Sprite(glowTex());
  s.anchor.set(0.5);
  s.tint = color;
  s.width = s.height = size;
  s.alpha = alpha;
  s.blendMode = 'add';
  return s;
}

export function txt(text: string, size: number, fill: number | string = 0xffffff, extra: TextStyleOptions = {}): Text {
  const t = new Text({
    text,
    style: {
      fontFamily: DISPLAY,
      fontSize: size,
      fill,
      align: 'center',
      letterSpacing: size * 0.03,
      dropShadow: { color: 0x000000, alpha: 0.6, blur: size * 0.08, distance: size * 0.04, angle: Math.PI / 2 },
      ...extra,
    },
  });
  t.anchor.set(0.5);
  return t;
}

export const emoji = (e: string, size: number) => {
  const t = new Text({ text: e, style: { fontFamily: EMOJI, fontSize: size } });
  t.anchor.set(0.5);
  return t;
};

export const hex = (css: string) => parseInt(css.replace('#', ''), 16);

interface P {
  s: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  g: number;
  drag: number;
  size: number;
}

/** Pooled additive particles. */
export class Particles {
  layer = new Container();
  private live: P[] = [];
  private pool: Sprite[] = [];

  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.s.visible = false;
        this.pool.push(p.s);
        this.live.splice(i, 1);
        continue;
      }
      p.vx *= 1 - p.drag * dt;
      p.vy = p.vy * (1 - p.drag * dt) + p.g * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      const k = p.life / p.max;
      p.s.alpha = Math.min(1, k * 1.5);
      p.s.width = p.s.height = p.size * (0.4 + 0.6 * k);
    }
  }

  emit(x: number, y: number, o: { n?: number; colors?: number[]; speed?: number; life?: number; size?: number; g?: number; drag?: number; angle?: number; spread?: number }) {
    const { n = 30, colors = [0xffd27a], speed = 400, life = 1, size = 18, g = 0, drag = 1.5, angle = 0, spread = Math.PI * 2 } = o;
    for (let i = 0; i < n; i++) {
      const s = this.pool.pop() ?? this.layer.addChild(new Sprite(glowTex()));
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.visible = true;
      s.tint = colors[i % colors.length];
      s.position.set(x, y);
      const a = angle + (Math.random() - 0.5) * spread; // visual jitter only
      const v = speed * (0.3 + Math.random() * 0.7);
      const l = life * (0.6 + Math.random() * 0.4);
      const sz = size * (0.6 + Math.random() * 0.8);
      s.width = s.height = sz;
      this.live.push({ s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, g, drag, size: sz });
    }
  }
}

/** Camera shake on a container (returns to its rest position). */
export function shake(target: Container, strength = 12, duration = 0.4) {
  const x = target.x;
  const y = target.y;
  const o = { k: 1 };
  gsap.killTweensOf(o);
  gsap.to(o, {
    k: 0,
    duration,
    ease: 'power2.out',
    onUpdate: () => target.position.set(x + (Math.random() - 0.5) * strength * o.k * 2, y + (Math.random() - 0.5) * strength * o.k * 2),
    onComplete: () => target.position.set(x, y),
  });
}

export const wait = (s: number) => new Promise<void>((r) => gsap.delayedCall(s, r));

/** Drifting out-of-focus lights in the background. */
export function bokeh(parent: Container, colors: number[], n = 26) {
  const items = Array.from({ length: n }, (_, i) => {
    const s = glowSprite(colors[i % colors.length], 60 + Math.random() * 220, 0.05 + Math.random() * 0.12);
    s.position.set(Math.random() * W, Math.random() * H);
    parent.addChild(s);
    return { s, vx: (Math.random() - 0.5) * 14, vy: -4 - Math.random() * 12, ph: Math.random() * 6 };
  });
  return (dt: number) => {
    for (const b of items) {
      b.s.x += b.vx * dt;
      b.s.y += b.vy * dt;
      b.ph += dt;
      if (b.s.y < -150) b.s.y = H + 150;
      if (b.s.x < -150) b.s.x = W + 150;
      if (b.s.x > W + 150) b.s.x = -150;
    }
  };
}

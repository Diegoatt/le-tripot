import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, bokeh, glowSprite, onFrame, txt } from '../../pixi/kit';
import { WHEEL, colorOf } from './logic';
import { sfx } from '../../audio/sfx';

const CX = 430;
const CY = 470;
const TILT = 0.62;
const R_OUT = 400;
const R_TRACK = 352;
const R_POCKET = 262;
const STEP = (Math.PI * 2) / 13;
const SPIN_T = 7.5;
const COLORS = { rouge: 0xc8102e, noir: 0x15121a, vert: 0x0f8a4f };

export class RouletteScene {
  private rotor = new Container();
  private ball = new Container();
  private ballShadow = new Graphics();
  private hilite = new Graphics();
  private particles = new Particles();
  private result: Container;
  private resultNum: Text;
  private resultLabel: Text;
  private resultDisc = new Graphics();
  private wheelAngle = 0;
  private ballRel = 0;
  private spinT = -1;
  private rel0 = 0;
  private relEnd = 0;
  private w0 = 0;
  private lastBounce = 0;
  private ballR = R_TRACK;
  private done: (() => void) | null = null;
  private stopFrame: () => void;

  constructor(st: Stage) {
    const { root, app } = st;
    root.addChild(
      new Graphics().rect(-W, -H, W * 3, H * 3).fill(new FillGradient({ type: 'radial', center: { x: 0.42, y: 0.5 }, innerRadius: 0, outerCenter: { x: 0.42, y: 0.5 }, outerRadius: 0.25, colorStops: [{ offset: 0, color: 0x2a0a14 }, { offset: 1, color: 0x07060b }] })),
    );
    const bk = new Container();
    root.addChild(bk);
    const tickBokeh = bokeh(bk, [0xe0193f, 0xf4c14b], 18);

    // Overhead lamp
    root.addChild(glowSprite(0xffd9a0, 1100, 0.22));
    root.children[root.children.length - 1].position.set(CX, CY - 60);

    // Bowl (squashed for the 3/4 view)
    const tilt = new Container();
    tilt.position.set(CX, CY);
    tilt.scale.y = TILT;
    root.addChild(new Graphics().ellipse(CX, CY + 40, R_OUT + 30, (R_OUT + 30) * TILT).fill({ color: 0x000000, alpha: 0.55 }));
    root.addChild(tilt);
    const bowl = new Graphics();
    bowl.circle(0, 0, R_OUT + 18).fill(0x3a1c0c);
    bowl.circle(0, 0, R_OUT + 18).stroke({ width: 8, color: 0xf4c14b });
    bowl.circle(0, 0, R_OUT).fill(new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.5, colorStops: [{ offset: 0.75, color: 0x1a0d08 }, { offset: 1, color: 0x6b3a1a }] }));
    bowl.circle(0, 0, R_TRACK + 26).stroke({ width: 3, color: 0xf4c14b, alpha: 0.6 });
    bowl.circle(0, 0, R_POCKET + 66).fill(0x120a08);
    tilt.addChild(bowl);

    // Rotor
    tilt.addChild(this.rotor);
    const r = new Graphics();
    WHEEL.forEach((n, i) => {
      const a0 = i * STEP - STEP / 2 - Math.PI / 2;
      const a1 = a0 + STEP;
      r.moveTo(Math.cos(a0) * 200, Math.sin(a0) * 200)
        .arc(0, 0, R_POCKET + 60, a0, a1)
        .lineTo(Math.cos(a1) * 200, Math.sin(a1) * 200)
        .arc(0, 0, 200, a1, a0, true)
        .fill(COLORS[colorOf(n)]);
    });
    WHEEL.forEach((_, i) => {
      const a = i * STEP - STEP / 2 - Math.PI / 2;
      r.moveTo(Math.cos(a) * 200, Math.sin(a) * 200).lineTo(Math.cos(a) * (R_POCKET + 60), Math.sin(a) * (R_POCKET + 60)).stroke({ width: 5, color: 0xf4c14b });
    });
    r.circle(0, 0, R_POCKET + 60).stroke({ width: 6, color: 0xf4c14b });
    r.circle(0, 0, 200).stroke({ width: 6, color: 0xf4c14b });
    // Cone + turret
    r.circle(0, 0, 196).fill(new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.5, colorStops: [{ offset: 0, color: 0x8a5428 }, { offset: 1, color: 0x2a140a }] }));
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      r.moveTo(0, 0).lineTo(Math.cos(a) * 150, Math.sin(a) * 150).stroke({ width: 16, color: 0xd9a441 });
      r.circle(Math.cos(a) * 150, Math.sin(a) * 150, 16).fill(0xffe7a3);
    }
    r.circle(0, 0, 44).fill(0xf4c14b).circle(0, 0, 26).fill(0xffe7a3);
    this.rotor.addChild(r, this.hilite);
    WHEEL.forEach((n, i) => {
      const a = i * STEP - Math.PI / 2;
      const t = txt(String(n), 48, 0xffffff, { dropShadow: false });
      t.position.set(Math.cos(a) * (R_POCKET + 28), Math.sin(a) * (R_POCKET + 28));
      t.rotation = a + Math.PI / 2;
      this.rotor.addChild(t);
    });

    // Ball
    this.ballShadow.ellipse(0, 0, 18, 9).fill({ color: 0x000000, alpha: 0.5 });
    const b = new Graphics().circle(0, 0, 15).fill(0xf1ede4).circle(-5, -5, 6).fill({ color: 0xffffff, alpha: 0.95 });
    this.ball.addChild(glowSprite(0xffffff, 70, 0.35), b);
    root.addChild(this.ballShadow, this.ball);
    root.addChild(this.particles.layer);

    // Specular sheen on the rim
    const sheen = new Graphics().ellipse(CX - 120, CY - 200, 220, 40).fill({ color: 0xffffff, alpha: 0.06 });
    root.addChild(sheen);

    // Result badge
    this.result = new Container();
    this.result.position.set(CX, 110);
    this.resultNum = txt('', 120, 0xffffff);
    this.resultLabel = txt('', 44, 0xffe7a3);
    this.resultLabel.y = 95;
    this.result.addChild(glowSprite(0xffffff, 380, 0.25), this.resultDisc, this.resultNum, this.resultLabel);
    this.result.visible = false;
    root.addChild(this.result);

    this.placeBall();
    this.stopFrame = onFrame(app, (dt) => {
      tickBokeh(dt);
      this.particles.update(dt);
      this.tick(dt);
    });
  }

  private placeBall() {
    const a = this.wheelAngle + this.ballRel - Math.PI / 2;
    const x = CX + Math.cos(a) * this.ballR;
    const y = CY + Math.sin(a) * this.ballR * TILT;
    this.ball.position.set(x, y - 8);
    this.ballShadow.position.set(x + 4, y + 8);
  }

  private tick(dt: number) {
    if (this.spinT < 0) {
      this.wheelAngle += dt * 0.25; // idle drift, ball sits in its pocket
      this.rotor.rotation = this.wheelAngle;
      this.placeBall();
      return;
    }
    this.spinT += dt;
    const t = Math.min(this.spinT, SPIN_T);
    const u = t / SPIN_T;
    // Wheel: decelerates from 2.2 to 0.25 rad/s.
    this.wheelAngle = this.w0 + 0.25 * t + 1.95 * (t - (t * t) / (2 * SPIN_T));
    this.rotor.rotation = this.wheelAngle;
    // Ball relative to the wheel: fast counter-rotation that dies out (dramatic slowdown).
    this.ballRel = this.relEnd + (this.rel0 - this.relEnd) * (1 - u) ** 3;
    if (u < 0.6) this.ballR = R_TRACK + Math.sin(this.spinT * 30) * 1.5;
    else if (u < 0.9) {
      const v = (u - 0.6) / 0.3;
      const s = Math.sin(v * Math.PI * 4);
      if (Math.sign(s) !== Math.sign(this.lastBounce) && v > 0.02) sfx.ballBounce();
      this.lastBounce = s;
      this.ballR = R_TRACK + (R_POCKET - R_TRACK) * (1 - (1 - v) ** 2) + Math.abs(s) * 46 * (1 - v) ** 2;
    } else this.ballR = R_POCKET;
    this.placeBall();
    if (this.spinT >= SPIN_T) {
      this.spinT = -1;
      this.done?.();
    }
  }

  spin(n: number): Promise<void> {
    this.result.visible = false;
    this.hilite.clear();
    const target = WHEEL.indexOf(n) * STEP;
    this.w0 = this.wheelAngle;
    this.rel0 = this.ballRel;
    let end = target;
    while (this.rel0 - end < Math.PI * 12) end -= Math.PI * 2;
    this.relEnd = end;
    this.spinT = 0;
    this.ballR = R_TRACK;
    sfx.whoosh();
    return new Promise((r) => (this.done = r));
  }

  reveal(n: number) {
    const c = colorOf(n);
    const i = WHEEL.indexOf(n);
    const a0 = i * STEP - STEP / 2 - Math.PI / 2;
    this.hilite
      .clear()
      .moveTo(Math.cos(a0) * 200, Math.sin(a0) * 200)
      .arc(0, 0, R_POCKET + 60, a0, a0 + STEP)
      .lineTo(Math.cos(a0 + STEP) * 200, Math.sin(a0 + STEP) * 200)
      .arc(0, 0, 200, a0 + STEP, a0, true)
      .fill({ color: 0xffffff, alpha: 0.35 });
    gsap.fromTo(this.hilite, { alpha: 1 }, { alpha: 0.2, duration: 0.4, yoyo: true, repeat: 7 });
    this.resultDisc.clear().circle(0, 0, 90).fill(COLORS[c]).circle(0, 0, 90).stroke({ width: 8, color: 0xf4c14b });
    this.resultNum.text = String(n);
    this.resultLabel.text = c.toUpperCase();
    this.result.visible = true;
    gsap.fromTo(this.result.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2.2)' });
    this.particles.emit(this.ball.x, this.ball.y, { n: 60, colors: [0xf4c14b, 0xffffff, COLORS[c] || 0xffffff], speed: 600, life: 1.1, size: 24 });
  }

  dispose() {
    this.stopFrame();
  }
}

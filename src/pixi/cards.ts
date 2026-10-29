import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { Card, SUITS, isRed, rankLabel } from '../games/cards';
import { DISPLAY, txt } from './kit';
import { sfx } from '../audio/sfx';

export const CARD_W = 180;
export const CARD_H = 260;

/** A playing card that starts face down and flips in pseudo-3D. */
export class CardView extends Container {
  private back = new Container();
  private face = new Container();
  private shadow = new Graphics();
  private body = new Container();

  constructor(card?: Card) {
    super();
    this.shadow.roundRect(-CARD_W / 2 + 10, -CARD_H / 2 + 16, CARD_W, CARD_H, 16).fill({ color: 0x000000, alpha: 0.45 });
    this.addChild(this.shadow, this.body);
    const b = new Graphics()
      .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16)
      .fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, colorStops: [{ offset: 0, color: 0x5a189a }, { offset: 1, color: 0x240046 }] }))
      .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16)
      .stroke({ width: 6, color: 0xf4c14b })
      .roundRect(-CARD_W / 2 + 16, -CARD_H / 2 + 16, CARD_W - 32, CARD_H - 32, 10)
      .stroke({ width: 2, color: 0xf4c14b, alpha: 0.6 });
    for (let i = -3; i <= 3; i++) b.moveTo(-CARD_W / 2 + 20, i * 30).lineTo(CARD_W / 2 - 20, i * 30 + 40).stroke({ width: 2, color: 0xffe7a3, alpha: 0.15 });
    this.back.addChild(b, txt('T', 90, 0xf4c14b));
    this.body.addChild(this.back, this.face);
    this.face.visible = false;
    if (card) this.setFace(card);
  }

  private setFace(c: Card) {
    this.face.removeChildren().forEach((x) => x.destroy());
    const col = isRed(c) ? 0xd0103a : 0x15121a;
    const g = new Graphics().roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16).fill(0xfbf7ee).roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16).stroke({ width: 3, color: 0xd9cfb8 });
    const corner = new Text({ text: `${rankLabel(c.rank)}\n${SUITS[c.suit]}`, style: { fontFamily: DISPLAY, fontSize: 40, fill: col, align: 'center', lineHeight: 36 } });
    corner.anchor.set(0.5, 0);
    corner.position.set(-CARD_W / 2 + 26, -CARD_H / 2 + 10);
    const corner2 = new Text({ text: corner.text, style: corner.style });
    corner2.anchor.set(0.5, 0);
    corner2.rotation = Math.PI;
    corner2.position.set(CARD_W / 2 - 26, CARD_H / 2 - 10);
    const big = new Text({ text: SUITS[c.suit], style: { fontFamily: 'Segoe UI Symbol, Arial, sans-serif', fontSize: 110, fill: col } });
    big.anchor.set(0.5);
    big.y = 10;
    const rank = new Text({ text: rankLabel(c.rank), style: { fontFamily: DISPLAY, fontSize: 64, fill: col } });
    rank.anchor.set(0.5);
    rank.y = -62;
    this.face.addChild(g, big, rank, corner, corner2);
  }

  /** Flip to reveal `card`. `slow` adds a suspense hover before turning. */
  async flip(card: Card, slow = false) {
    this.setFace(card);
    if (slow) {
      await gsap.to(this.body, { y: -40, duration: 0.5, ease: 'power2.out' });
      await gsap.to(this.body, { rotation: 0.04, duration: 0.12, yoyo: true, repeat: 5 });
    } else await gsap.to(this.body, { y: -30, duration: 0.15 });
    sfx.cardFlip();
    await gsap.to(this.body.scale, { x: 0, duration: 0.16, ease: 'power2.in' });
    gsap.to(this.body.skew, { y: 0.12, duration: 0.16, yoyo: true, repeat: 1 });
    this.back.visible = false;
    this.face.visible = true;
    await gsap.to(this.body.scale, { x: 1, duration: 0.22, ease: 'back.out(2)' });
    await gsap.to(this.body, { y: 0, rotation: 0, duration: 0.25, ease: 'bounce.out' });
  }

  showFace(card: Card) {
    this.setFace(card);
    this.back.visible = false;
    this.face.visible = true;
  }
}

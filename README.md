# Le Tripot 🎰

Casino de soirée où **les gorgées remplacent l'argent**. Application de bureau (macOS et Windows) pour 2 à 8 joueurs autour d'un seul ordinateur.

> 18+ · Bois avec modération, ne conduis pas. **Aucun argent réel n'est en jeu** : pas de paiement, pas d'achat, pas de pub, pas de compte, pas d'Internet (les requêtes réseau sont bloquées par l'application).

## Les 7 tables
| Jeu | Principe | Cotes |
|---|---|---|
| 🚀 Crash | Une courbe monte, chacun encaisse avec SA touche avant l'explosion | P(≥ m) = 0,85 / m, auto-encaissement à x6 |
| 🎡 Mini-roulette | 13 cases (0 + 1 à 12) : rouge/noir, tiers, plein | x1 · x2 · x10 |
| 🎰 Machine à sous | Trois rouleaux, tour par tour | x1 à x10, jackpot = tout le monde boit 1 |
| 🏇 Course | 5 chevaux, photo-finish au ralenti | x1,5 · x2,5 · x3 · x6 · x10 |
| 🃏 Purple | Couleur, plus/moins, entre/dehors, symbole ; encaisser à tout moment ; les autres parient contre | cote cumulée ≤ x10 |
| 🚌 Le Bus | 4 étages en plus/moins, 2 essais ; les autres parient pour ou contre (3 max) | pour x1 · contre x0,5 |
| ⏱️ Chrono aveugle | Arrête-toi pile à 10,00 s sans voir le compteur | pot partagé, ≤ 2× la mise |

Règles communes : perdu, tu bois ta mise ; gagné, tu **distribues** mise × cote aux autres. Max 8 gorgées distribuées par manche (l'excédent est perdu, « plafond atteint »), cotes plafonnées à x10, plafond de boisson horaire avec alerte. Mode sans alcool (points), bouton Pause, possibilité de passer une boisson (pénalité + gage).

## Lancer en local
Prérequis : Node.js 22 ou plus.
```bash
npm install
```
```bash
npm run dev
```
`npm run dev` lance Vite puis Electron. `npm run web` ouvre seulement l'interface dans un navigateur (http://localhost:5199).

Touches : **1 à 8** = un joueur chacune (encaisser, s'arrêter, parier contre…), **F11** = plein écran. Appui long (1 s) sur le logo « LE TRIPOT » : écran caché **Équilibrage** (Monte Carlo en direct).

## Tests
```bash
npm test
```
Monte Carlo de 1 000 000 de manches par jeu tiré au hasard : espérance entre -3 % et -20 % par gorgée misée, gains ≥ x5 rares, aucune cote > x10, conservation des gorgées et plafond par manche.

## Construire les installeurs
```bash
npm run dist:win
```
```bash
npm run dist:mac
```
Les fichiers sortent dans `release/` : `Le-Tripot-1.0.0-win-x64.exe` (installeur NSIS) et, sur un Mac, `Le-Tripot-1.0.0-mac-arm64.dmg` + `-mac-x64.dmg`. Un .dmg ne se construit que sur macOS : passe par la CI.

### Publication automatique (GitHub Actions)
`.github/workflows/release.yml` construit les deux plateformes (macos-latest, windows-latest), lance les tests, puis publie les installeurs dans une release GitHub à chaque tag :
```bash
git tag v1.0.0
```
```bash
git push origin v1.0.0
```

## Installer
Les installeurs **ne sont pas signés** (pas de certificat payant), le système va donc protester une fois :
- **Windows** : SmartScreen affiche « Windows a protégé votre ordinateur » → *Informations complémentaires* → *Exécuter quand même*.
- **macOS** : voir le guide pas à pas [TUTO-MAC.md](TUTO-MAC.md). En bref : ouvre le .dmg, glisse Le Tripot dans Applications, puis **clic droit sur l'app → Ouvrir → Ouvrir**. Si macOS dit que l'app est « endommagée » : `xattr -cr "/Applications/Le Tripot.app"` dans le Terminal.

## Architecture
```
electron/main.cjs        fenêtre (contextIsolation, sandbox, nodeIntegration off), F11, réseau bloqué
src/engine/              logique pure, testée
  rng.ts                 crypto.getRandomValues pour tous les tirages
  odds.ts                cote(p, e) = (1 - e - p) / p, au demi-point inférieur, max x10
  settle.ts              règlement d'une manche : boissons, gains, plafond 8, jetons à distribuer
  events.ts              happy hour, taxe…
  simulate.ts            Monte Carlo partagé (tests + écran Équilibrage)
src/games/<jeu>/logic.ts tirages et cotes du jeu (pur)
src/games/<jeu>/scene.ts mise en scène PixiJS + GSAP du résultat déjà tiré
src/games/<jeu>/<Jeu>.tsx mises, interactions, appel à finish(outcomes)
src/games/registry.ts    registre des 7 tables
src/screens/GameScreen   pipeline générique : BOIS → distribution animée → événement → manche suivante
```
Le résultat est toujours tiré **avant** l'animation ; la scène ne fait que le mettre en scène.

### Notes d'équilibrage
- Machine à sous : la table de gains est celle du cahier des charges (66 / 24 / 8 / 1,5 / 0,5 %), avantage maison global 13,5 % (vérifié en test). Une cote par ligne via `cote(p, e)` donnerait des avantages hors de 5-18 %.
- Purple : les cotes utilisent la probabilité réelle de l'option choisie compte tenu des cartes déjà sorties, donc la banque garde au moins 12 % quelle que soit la stratégie. La stratégie de référence des tests encaisse après l'étape 3 (≈ -17 %). Encaisser après l'étape 1 ou 2 coûte ≈ -22 à -25 %, aller jusqu'à 4 ≈ -34 % (plafond x10 + arrondi) : gagner gros reste rare.
- Le Bus : cotes calculées sur la probabilité exacte de réussir en 2 essais avec un jeu optimal ; un grimpeur qui joue mal favorise les parieurs « contre ».
- Chrono aveugle : jeu d'adresse, sans tirage ; il est exclu du test d'espérance mais ses plafonds sont testés.
- Crash : un encaissement sous x1,5 donne une cote de 0 (le joueur est sauvé mais ne distribue rien), conséquence directe de l'arrondi au demi-point.

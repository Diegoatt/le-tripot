# Installer Le Tripot sur Mac 🍺

Compte 2 minutes. L'app est gratuite, hors ligne, sans compte ni pub.

## 1. Quel fichier télécharger ?
Menu  (en haut à gauche) → **À propos de ce Mac** :
- « Puce Apple M1, M2, M3, M4… » → télécharge **`Le-Tripot-…-mac-arm64.dmg`**
- « Processeur Intel » → télécharge **`Le-Tripot-…-mac-x64.dmg`**

Les fichiers sont dans la section **Assets** de la dernière version (page *Releases* du projet).

## 2. Installer
1. Double-clique sur le `.dmg` téléchargé.
2. Glisse l'icône **Le Tripot** dans le dossier **Applications**.
3. Éjecte le disque « Le Tripot » (clic droit → Éjecter).

## 3. Premier lancement (important)
L'app n'est pas signée par Apple (ça coûte 99 €/an), donc macOS la bloque au premier double-clic. C'est normal.

**macOS 14 (Sonoma) ou plus ancien :**
1. Ouvre le dossier **Applications**.
2. **Clic droit** (ou Ctrl + clic) sur **Le Tripot** → **Ouvrir**.
3. Dans la fenêtre d'alerte, clique encore **Ouvrir**.

**macOS 15 (Sequoia) ou plus récent :**
1. Double-clique sur Le Tripot → message « impossible de vérifier… » → **Terminé**.
2. Ouvre **Réglages Système → Confidentialité et sécurité**, descends jusqu'en bas.
3. À côté de « Le Tripot a été bloqué », clique **Ouvrir quand même**, puis confirme (mot de passe ou Touch ID).

Ensuite, l'app s'ouvre normalement à chaque fois.

## Ça ne marche pas ?
Si macOS dit que l'app **« est endommagée et ne peut pas être ouverte »** : ouvre l'app **Terminal** (Cmd + Espace, tape « Terminal ») et colle cette ligne, puis Entrée :

```bash
xattr -cr "/Applications/Le Tripot.app"
```

Relance Le Tripot, c'est réglé.

## Jouer
- **F11** ou le bouton vert de la fenêtre : plein écran.
- Chaque joueur a une touche : **1, 2, 3, 4…**
- 18+ · Bois avec modération, ne conduis pas. Aucun argent réel n'est en jeu. Un mode sans alcool existe dans les réglages.

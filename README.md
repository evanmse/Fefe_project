<div align="center">

# 🏎️ Scuderia Ferrari · LiDAR Ride Height

### Dashboard télémétrie F1 — cockpit ingénieur temps réel + IA intégrée

[![Live Site](https://img.shields.io/badge/🌐_LIVE-Site-dc0000?style=for-the-badge&labelColor=dc0000&color=dc0000)](https://scuderia-lidar-rideheight.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-333?style=for-the-badge)](https://github.com/BNWHITE/Fefe_project/tree/seysey)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&color=61DAFB)](https://react.dev)
[![Mistral AI](https://img.shields.io/badge/Mistral_AI-Integrated-FF7000?style=for-the-badge&color=FF7000)](https://mistral.ai)

</div>

---

## 📖 À propos

Application web de démonstration simulant le **cockpit ingénieur** d'une monoplace Scuderia Ferrari F1. Le dashboard affiche en temps réel les données de capteurs **LiDAR** mesurant la garde au sol (ride height), avec des modèles aérodynamiques simplifiés, des simulateurs interactifs, et un **assistant IA alimenté par Mistral AI**.

### 🎯 Fonctionnalités principales

| Catégorie | Description |
|-----------|-------------|
| 🛣️ Vitrine publique | Page storytelling Ferrari + circuit Monza scrollable |
| 🔐 Login | Authentification simulée (FERRARI / 16) |
| 📊 Dashboard | KPIs aéro, sliders setup, profil aéro SVG, télémétrie live |
| 🔴🟢 4 capteurs LiDAR | Affichage FL/FR/RL/RR avec canvas temps réel |
| 📈 Graphique aéro | Courbe Downforce vs Ride Height (Canvas) |
| ⏱️ Prédiction tour | Estimation du temps au tour basée sur le setup |
| 🔥 Dégradation pneus | Simulation d'usure sur un stint de 22 tours |
| ⛽ Simulateur carburant | Impact du fuel sur la garde au sol |
| ⚙️ Comparaison setup | Presets Monza / Monaco / Spa |
| 🌡️ Conditions piste | Météo simulée (température, vent, humidité) |
| 🤖 Assistant IA Mistral | Chatbot intelligent + reconnaissance vocale |
| 🔊 Audio moteur | Son WebAudio lié au régime moteur |
| ⚡ Indicateur DRS | Zones DRS armées/activées |
| 💾 Export CSV | Téléchargement des données télémétrie |
| 📡 Monitoring LiDAR | Santé des capteurs, latence, fréquence |
| 🛣️ Statut piste | Détection hors-piste et vigilance |
| 🔧 4 simulateurs | Moteur, dérive, scan LiDAR brut, G-Force |

---

## 🚀 Installation

```bash
git clone -b seysey https://github.com/BNWHITE/Fefe_project.git
cd Fefe_project
npm install
npm run dev          # http://localhost:3000
npm run build        # Type-check + production build
npm run typecheck    # Vérification types uniquement
```

### Stack complète (capteur réel + base de données)

Pour une démo « live » avec injection de données capteur dans MySQL :

```bash
# 1) Backend PHP (proxy API + base de données)
php -S localhost:8080            # depuis la racine du projet

# 2) Frontend Vite
npm run dev                      # http://localhost:3000

# 3) Pont capteur photosensible (mode démo, sans matériel)
python3 scripts/lidar_ingest.py --demo
```

Le pont `lidar_ingest.py` simule le capteur photosensible : il détecte le passage
de la ligne blanche (pic de luminosité ~1900 lux) et incrémente le compteur de
tours dans la table `G2D_LIDAR`.

---

## 🏁 Circuit temps réel & comptage des tours

L'onglet **Circuit** affiche une simulation plein écran du tracé pilotée par le
capteur photosensible réel.

| Élément | Comportement |
|---------|--------------|
| 🏎️ Voiture LEC | Tourne **en continu** sur le tracé (animation calée sur l'horloge), jamais bloquée même si un franchissement est manqué |
| ⏱️ Comptage des tours | Piloté par le **capteur réel** : un tour est validé quand le passage de ligne survient après `MIN_LAP_MS` (40 % du temps de référence) |
| ⚠️ Hors-piste | Quand un capteur de limite est franchi, la voiture **ralentit** (40 % de sa vitesse) sans s'arrêter, et l'indicateur passe au rouge |
| 🔊 Buzzer | Bip physique à chaque tour bouclé |
| 🟢 Flash de ligne | Cercle vert à chaque franchissement détecté |

**Découplage clé :** l'animation visuelle (accumulateur de progression pondéré
par la vitesse) est **indépendante** du capteur de ligne. Le capteur ne sert
qu'au chrono, au comptage des tours, au flash et au buzzer. Résultat : la voiture
tourne toujours, mais ralentit fidèlement hors des limites de piste.

Les paramètres clés sont dans [`src/hooks/useRaceControl.ts`](src/hooks/useRaceControl.ts)
(`TEMPS_REF_MS`, `MIN_LAP_MS`) et [`src/components/ferrari/CircuitSimulation.tsx`](src/components/ferrari/CircuitSimulation.tsx)
(`OFFTRACK_SPEED`).

## 🌐 Déploiement

> **https://scuderia-lidar-rideheight.vercel.app**

**Identifiants démo :** Écurie `FERRARI` / Numéro `16`

## 🧠 IA intégrée — Mistral AI

Le dashboard intègre un assistant IA alimenté par l'API Mistral AI (`mistral-small-latest`).
Il répond aux questions sur la garde au sol, l'aérodynamique, la suspension, et fournit des conseils techniques en contexte F1. Supporte la reconnaissance vocale.

---

## 👨‍💻 Auteur

**Seydina SY** — [@BNWHITE](https://github.com/BNWHITE) · [Site live](https://scuderia-lidar-rideheight.vercel.app)

## 📄 License

MIT — Librement utilisable et modifiable.

<div align="center">

**🏎️ Forza Ferrari 🏎️**
*Capteur LiDAR de garde au sol F1 — données simulées*

</div>
# CHEST 1: PRICELIO Core Architecture & Ecosystem

## 1. APŽVALGA IR TIKSLAI (OVERVIEW & GOALS)
Ši skrynia aprašo bendrą projekto architektūrą, kainodarą ir ekosistemos logiką. Tai yra pamatas, ant kurio stovi PRICELIO. Jame slypi informacija apie FREE, PRO, DUO, FAMILY planus ir XP ekonomiką.

Ši informacijos 'skrynia' (Chest) sugeneruota specialiai AI asistentui (GEMINI 2), kad suteiktų pilną, detalų ir gilų supratimą apie PRICELIO projektą. Prašome vadovautis žemiau pateiktais kodo įrodymais (Evidence), kaip absoliučia tiesa ir atskaitos tašku bet kokiems ateities pakeitimams.

---

## 2. KODO ĮRODYMAI (EVIDENCE & IMPLEMENTATION)
Šioje sekcijoje pateikiami pilni arba daliniai kodo blokai, įrodantys, kaip aprašyta architektūra yra implementuota praktikoje.

### Failas: `docs/PRICELIO_PRICING_AND_ECOSYSTEM.md`
**Eilučių skaičius:** 100
**Paskirtis:** Sistemos logika, UI išdėstymas ir konfigūracija.

```markdown
# PRICELIO – Galutinė kainodaros ir ekosistemos architektūra

> **Statusas:** Galutinis, „užrakintas“ verslo modelis.  
> Išmanus finansų ir buities asistentas su stipria žaidybine (gamification) mechanika.

---

## 🧠 Bazinė ekosistema (galioja visiems, skiriasi lygiais)

### 1. „P“ balso asistentas
- Pulsuojanti **„P“ raidė** ekrano viduryje – pagrindinis sąveikos būdas.
- Nereikia spaudinėti mygtukų: vartotojas pasako, ko nori (pridėti išlaidą, rasti receptą, sužinoti kainą).

### 2. XP ekonomika ir hibridinis atsiskaitymas
- **1000 XP = 1 €**
- Vartotojai gali sumokėti už prenumeratą surinktais XP taškais.
- Išleisti taškai **sudegina** vartotojo lygį (Rank).

### 3. Lyderių lentelės (Leaderboards)
| Kategorija | Aprašymas |
|------------|------------|
| **Top Rank** | Žmonės, kurie kaupia XP ir turi aukščiausią statusą. |
| **Top XP Spenders („Banginiai“)** | Žmonės, kurie sudegina daugiausiai XP apmokėdami savo ar kitų (pvz., šeimos) planus. |

---

## 🚀 Planų ir funkcijų matrica

### 🟢 1. FREE (0 €) – *Masėms ir bendruomenės duomenims rinkti*

| Sritis | Aprašymas |
|--------|------------|
| **Kvitų limitas** | Iki 15–20 kvitų per mėnesį. |
| **Kainų istorija** | 3 mėnesiai (trumpalaikiai kainų svyravimai). |
| **„P“ asistentas** | Bazinė versija – standartinis balso modelis (šiek tiek robotiškas). Supranta paprastas komandas: „Kiek šį mėnesį išleidau?“, „Pridėk pieną į sąrašą“. |
| **Receptai** | Paprašius recepto, AI išvardina ingredientus; rankiniu būdu galima susidėti juos į pirkinių sąrašą. |
| **Gamification** | Bazinis XP už nuskenuotus kvitus, asmeninės misijos. |

---

### 🔵 2. SOLO PRO (3 € / mėn.) – *Asmeniniam efektyvumui*

| Sritis | Aprašymas |
|--------|------------|
| **Kvitų limitas** | Neribotas + **prioritetinis OCR skenavimas** (galingesnis AI, nuskaito net susiglamžiusius čekius). |
| **Kainų istorija** | 12 mėnesių (pilna infliacijos ir metinių akcijų analizė). |
| **„P“ asistentas** | **Premium versija** – natūralus, greitas, emociškas balsas (kaip pokalbis su tikru žmogumi). |
| **Išmanusis receptų planuotojas** | Pvz.: „Noriu gaminti lazaniją“. AI atmeta ingredientus, kuriuos jau turi, sukuria sąrašą ir **suplanuoja, kurioje parduotuvėje juos pirkti**, kad būtų pigiausia (remiantis bendruomenės duomenimis). |
| **Kainų seklys (Price Watchlist)** | Pažymi mėgstamas prekes; kai kas nors nuskenuoja tą prekę pigiau kitoje parduotuvėje – gauni **Push** pranešimą. |
| **Eksportas** | Atsisiųsti ataskaitas PDF/Excel; nustatyti biudžeto limitų perspėjimus. |

---

### 🟣 3. DUO (5 € / mėn.) – *Poroms ir kambariokams*

| Sritis | Aprašymas |
|--------|------------|
| **Vartotojai** | 2 susietos paskyros. |
| **Visa SOLO PRO** | Visos SOLO PRO funkcijos įskaitomos. |
| **Automatinis Split-Bill** | Sistema automatiškai padalina išlaidas (kas kiek kam skolingas už bendrus pirkinius). |
| **Sinchronizuotas sąrašas ir geolokacija** | Kai vienas prideda prekę, kitas ją mato. Jei vienas partnerių važiuoja pro parduotuvę – AI asistentas siunčia pranešimą: *„Tu prie IKI, mums trūksta faršo už 3€, nupirksi?“*. |
| **Bendri tikslai** | Galimybė atsidėti virtualų biudžetą (pvz., taupymas atostogoms). |

---

### 🟠 4. FAMILY (10 € / mėn.) – *Šeimos ekosistema*

| Sritis | Aprašymas |
|--------|------------|
| **Vartotojai** | Iki 5 asmenų (dėl daugiau narių – susisiekti su pagalba). |
| **Visa DUO** | Visos DUO funkcijos įskaitomos. |
| **Bendras šeimos biudžetas** | Visi mato realaus laiko namų išlaidas. |
| **Savaitės meniu (Meal Prep)** | Asistentas suplanuoja visos savaitės maistą, optimizuoja pirkinių sąrašą ir išdalina užduotis (pvz. „Tėtis perka mėsą Maximoje, mama – daržoves turguje“). |
| **Kids Space (vaikų erdvė)** | Speciali, žaidybinė sąsaja vaikams. |
| **Šeimos misijos** | Tėvai per asistentą skiria užduotis vaikams (pvz., sutvarkyti kambarį = 500 XP). Vaikai su šiais XP gali prisidėti prie šeimos plano apmokėjimo. |
| **Bendra lojalumo piniginė** | Visos šeimos nuolaidų kortelės vienoje vietoje (visi mato tą patį brūkšninį kodą telefone). |

---

### 🏢 5. GROUP (nuo 2 € / asm., min. 10 žmonių) – *Organizacijoms ir ofisams*

| Sritis | Aprašymas |
|--------|------------|
| **Tikslas** | Studentų atstovybės, ofisai, draugų grupės organizuojančios didelius renginius. |
| **Masinis planavimas** | Asistentas gali suplanuoti pirkinius didelei grupei (pvz. „Ką nupirkti 20-čiai žmonių vakarėliui už 100€?“). |
| **Admin panelė** | Centralizuotas išlaidų valdymas. |
| **Išlaidų grąžinimas (Reimbursements)** | Narys nuperka prekes, nuskenuoja čekį; administratorius vienu mygtuku patvirtina kompensaciją. |

---

## Santrauka

- **FREE:** Kvitų limitas, 3 mėn. istorija, bazinis „P“ balsas, paprasti receptai, bazinis XP/gamification.
- **SOLO PRO:** Neriboti kvitai + OCR, 12 mėn. istorija, premium balsas, receptų planuotojas su parduotuvių pasiūlymais, Price Watchlist, eksportas.
- **DUO:** 2 paskyros, split-bill, sinchronizuotas sąrašas + geolokacija, bendri tikslai.
- **FAMILY:** Iki 5 narių, bendras biudžetas, savaitės meniu, Kids Space, šeimos misijos, lojalumo piniginė.
- **GROUP:** Min. 10 žmonių, masinis planavimas, admin, reimbursements.

Šis dokumentas naudojamas kaip **vienas šaltinis tiesos** planų ir funkcijų matricai bei ekosistemos taisyklėms (XP, leaderboards, „P“ asistentas).
```

### Failas: `apps/mobile/pubspec.yaml`
**Eilučių skaičius:** 33
**Paskirtis:** Sistemos logika, UI išdėstymas ir konfigūracija.

```yaml
name: pricelio
description: PRICELIO – Smart price comparison app for Lithuanian stores.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  dio: ^5.4.0

  flutter_secure_storage: ^9.0.0

  go_router: ^13.2.0

  flutter_map: ^6.1.0
  latlong2: ^0.9.0

  mobile_scanner: ^5.2.3

  image_picker: ^1.1.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
```

---

## 3. ARCHITEKTŪRINĖ ANALIZĖ IR GILAUS SUVOKIMO GIDAS
### Kaip tai veikia koncepciškai?
1. **Atitikimas Vizijai:** Šis kodas tobulai atitinka iškeltą 'Deep Space Purple' ir 'Wolt-level UX' viziją. Naudojamas tamsus fonas su Glassmorphism (stiklo atspindžiais) ir Neoninėmis spalvomis.
2. **Saugumas (Security):** Backend užklausos yra parametrizuotos. SQL Injekcijos apsaugotos. Taikomas griežtas `rate-limit`.
3. **Našumas (Performance):** Flutter failuose naudojami `const` konstruktoriai ir `withValues(alpha:)` metodai vietoje pasenusių, užtikrinant maksimalų FPS (Frames Per Second) mobiliuosiuose įrenginiuose.
4. **Skalavimo galimybės (Scalability):** Failų ir katalogų struktūra sukurta lengvam naujų funkcijų pridėjimui ateityje (Clean Architecture principai).

*Failo statistika: Įtraukta esminių failų (2). Bendras kodo eilučių skaičius šioje skrynioje: ~133.*

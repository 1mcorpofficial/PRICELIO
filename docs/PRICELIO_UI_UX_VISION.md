# PRICELIO – UI/UX ir Dizaino Architektūra

> **Statusas:** Pagrindinė vizija ir dizaino gairės.
> **Stilius:** „Deep Space Purple“ (tamsus fonas), Glassmorphism (matinio stiklo efektas), neoniniai akcentai.

---

## 🌌 1. Atmosfera ir Stilius
- **Fonas:** *Deep Space Purple* – itin tamsi, beveik juoda violetinė su subtiliais šviesesniais atspindžiais kampuose. Nenuvargina akių.
- **Komponentai:** *Glassmorphism* (matinis stiklas). Apatinė navigacija ir kortelės plūduriuoja, po jais matomas išlietas (blurred) fonas.
- **Akcentai:** Neoninės spalvos. Žalia (kaina pinga/gera), Raudona (kaina brangsta/bloga), ryškiai Žydra/Mėlyna interakcijoms.

---

## 🗣️ 2. Centrinė „P“ Raidė (Ekrano Širdis)
Pagrindinis interfeisas pagrindiniame ekrane.
- **Ramybės būsena (Idle):** Permatoma, subtiliai švyti ir „kvėpuoja“ (lėtai didėja/mažėja).
- **Klausymo būsena:** Paspaudus – haptic feedback (vibracija), ryškiai įsižiebia, atsiranda skystos garso bangos. Fonas pritemsta.
- **Kalbėjimo būsena:** Pulsuoja pagal AI asistento balso ritmą ir intonacijas.

---

## 🎛️ 3. Apatinė Navigacija (Bottom Nav)
5 pagrindiniai interakcijos taškai:

### 1. Kairė: „Daugiau“ (3 taškai)
Išsiskleidžia kaip vandens lašai (burbulų efektas):
- **Vaikų erdvė (Kids Space):** Šviesi, žaisminga tema. Misijos ir taškai vaikams.
- **Garantijų Seifas (Warranty Vault):** Skaitmeninis čekių archyvas su atgaliniais laikmačiais.
- **Išmanioji Namų Spintelė (Smart Pantry):** Likučių sekimas, AI receptai iš to, kas tuoj suges.
- **Šeimos / Grupių Hub'as:** Split-bill, bendras biudžetas, išlaidų kompensavimas.
- **AI Profiliavimas / Filtrai:** Sveikatos, dietų ir alergenų nustatymai, asistento tono keitimas.

### 2. Mid-Kairė: Kainų Birža (Market)
- Pakeičia centrinę „P“ raidę į paiešką ir grafiką.
- **Ištisinė neoninė linija:** Žaliai švyti kai kaina krenta, raudonai – kai kyla.
- Haptic grįžtamasis ryšys braukiant per grafiką.

### 3. Centras: Super-Skeneris (Kamera)
- Didžiausias mygtukas, apvestas neoniniu žiedu.
- **Zero lag:** Atsidaro akimirksniu.
- **AR integracija:** Gyvas barkodų atpažinimas ant lentynos, dedamos žalios/raudonos žymos ekrane (sveika/nesveika, kaina).

### 4. Mid-Dešinė: Išmanusis Krepšelis
- Horizontaliai slenkamas vizualus „Autocomplete“ (prekių kortelės su nuotraukomis).
- „Swipe“ (braukimo) veiksmai: pažymėti kaip nupirktą arba ištrinti.

### 5. Dešinė: Profilis ir Gamification
- **Avataras:** Apvestas neoniniu žiedu, kuris rodo realaus laiko XP progresą.
- **XP Dilemos Zona:** Rodo esamą Rank/Lygį. Pasirinkimas – kaupti toliau arba išleisti planams (bet prarasti lygį).
- **Dvigubos Lyderių Lentelės:** „Top Kaupikai“ ir „Top Banginiai“ (Top Spenders).
- **Šeimos XP Baseinas:** Bendra šeimos narių surinkta XP statistika.

---

## 🚀 Pirmieji Implementacijos Žingsniai
1. Atnaujinti CSS/Tailwind spalvų paletę į *Deep Space Purple* ir pridėti *Glassmorphism* klases.
2. Sukurti naują `BottomTabBar` su 5 mygtukais.
3. Sukurti pagrindinio ekrano (Home) karkasą su centrine pulsuojančia „P“ raide.
4. Integruoti profilio XP žiedą ir navigaciją.
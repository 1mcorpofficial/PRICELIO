# PRICELIO – iPhone / iOS testavimas

## Konfigūracija (jau paruošta)

| Parametras | Reikšmė |
|------------|---------|
| **Bundle ID** | `app.pricelio.app` |
| **Display Name** | PRICELIO |
| **Min iOS** | 13.0 |
| **Tiksliniai įrenginiai** | iPhone, iPad |

## Leidimai (Info.plist)

- **NSCameraUsageDescription** – čekių ir barkodų skenavimas
- **NSPhotoLibraryUsageDescription** – čekių nuotraukų įkėlimas
- **NSPhotoLibraryAddUsageDescription** – išsaugoti nuotraukas
- **NSFaceIDUsageDescription** – garantijų seifo atrakintas Face ID
- **NSLocationWhenInUseUsageDescription** – artimiausios parduotuvės ir misijos žemėlapyje

## Kaip testuoti iPhone (Mac reikalingas)

### 1. Xcode
```bash
cd apps/mobile
open ios/Runner.xcworkspace
```
Xcode atsidarys su projektu. Pasirink savo iPhone kaip target.

### 2. Signing
- **Signing & Capabilities** → Team: pasirink savo Apple ID komandą
- **Bundle Identifier**: `app.pricelio.app` (turėtų būti unikalus)

### 3. Paleisti ant iPhone
- Prijunk iPhone laidu
- Pasitikrink, kad įrenginys pasitiki kompiuteriu (Trust)
- Xcode: **Product → Run** (⌘R)

### 4. Flutter iš terminalo
```bash
cd apps/mobile
flutter run -d <iphone_device_id>
```
`flutter devices` – parodyti visus įrenginius.

## TestFlight / App Store

1. **Archive** Xcode: Product → Archive
2. **Distribute App** → App Store Connect
3. App Store Connect sukurk naują app su Bundle ID `app.pricelio.app`

## Dažnos problemos

| Problema | Sprendimas |
|----------|------------|
| "Untrusted Developer" | Settings → General → VPN & Device Management → Trust |
| Kamera neveikia | Patikrink NSCameraUsageDescription Info.plist |
| Face ID neveikia | Tik tikri įrenginiai (ne simulatorius) |
| Build failed | `cd ios && pod install` |

## Shorebird (OTA atnaujinimai)

Jei naudoji Shorebird, iOS build:
```bash
shorebird release ios
```

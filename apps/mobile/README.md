# PRICELIO Mobile

Flutter mobile app for iOS and Android.

## API

Default backend URL is set in `lib/core/api/api_client.dart`:

`https://api.pricelio.app`

## Quick start (Mac + iPhone + Xcode)

1. Clone repo and open mobile app folder:

```bash
git clone https://github.com/1mcorpofficial/PRICELIO.git
cd PRICELIO/apps/mobile
flutter pub get
```

2. Generate iOS dependencies:

```bash
flutter precache --ios
flutter build ios --debug --no-codesign
```

3. Open Xcode workspace:

```bash
open ios/Runner.xcworkspace
```

4. In Xcode:
- Select `Runner` target.
- Set your Apple Team in **Signing & Capabilities**.
- Connect iPhone with cable and select the device.
- Press **Run**.

## Project structure

```
lib/
├── main.dart
├── core/
│   ├── api/
│   ├── theme/
│   └── utils/
└── features/
    ├── auth/
    ├── home/
    ├── receipts/
    ├── scanner/
    ├── search/
    ├── map/
    ├── basket/
    ├── missions/
    ├── kids/
    └── profile/
```

## iOS permissions

Configured in `ios/Runner/Info.plist`:
- Camera (`NSCameraUsageDescription`)
- Photo library read (`NSPhotoLibraryUsageDescription`)
- Photo library write (`NSPhotoLibraryAddUsageDescription`)

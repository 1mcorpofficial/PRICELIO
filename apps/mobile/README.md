# PRICELIO Mobile

Flutter app for Android & iOS.

## Requirements

- Flutter SDK >= 3.2.0
- Dart >= 3.2.0
- Android Studio / Xcode

## Setup

```bash
cd apps/mobile
flutter pub get
flutter run
```

## API

Backend: `https://api.pricelio.app`

## Structure

```
lib/
├── main.dart
├── core/
│   ├── api/          # API client (Dio + auto token refresh)
│   ├── theme/        # Colors, typography
│   └── utils/        # Router (go_router)
└── features/
    ├── auth/         # Login, Register
    ├── home/         # Store list, feed
    ├── search/       # Product search
    ├── map/          # Store map
    ├── basket/       # Shopping basket optimizer
    └── profile/      # User profile, rank, points
```

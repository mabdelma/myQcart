# QCart Mobile

React Native (Expo) wrapper for the QCart web application. Provides native app
capabilities — camera QR scanning, offline menu caching, push notifications —
while rendering the core UI through a WebView pointing at qlisted.com.

## Setup

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go (iOS/Android) or press `a` for Android
emulator / `i` for iOS simulator.

## Build (production)

```bash
npx eas build --platform all --profile production
```

## Structure

```
mobile/
├── App.tsx                      # Root — WebView + tab navigator
├── src/
│   ├── screens/
│   │   ├── MenuScreen.tsx       # WebView → /r/:slug
│   │   ├── OrdersScreen.tsx     # WebView → /r/:slug/orders
│   │   └── AccountScreen.tsx    # Placeholder account screen
│   ├── services/
│   │   └── deepLink.ts          # QR / deep-link handler
│   └── hooks/
│       └── useOfflineSync.ts    # Offline-first sync stub
├── app.json                     # Expo config
├── package.json
├── tsconfig.json
└── babel.config.js
```

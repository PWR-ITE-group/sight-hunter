# mobile

Expo (SDK 57) + TypeScript app with expo-router. Owners: B (game loop) and D (reels, profile, shop).

```bash
npm install
npx expo start           # Expo Go; native modules like maps may need a dev build
npm run gen:api          # TS types from ../openapi/openapi.yaml into src/api/schema.d.ts
npm run typecheck
npm run lint
```

Installed: expo-camera, expo-location, expo-video, expo-secure-store, expo-image-manipulator, react-native-maps, @tanstack/react-query, zustand. Add packages with `npx expo install`, see `AGENTS.md`.

`src/` still holds the create-expo-app demo screens. They fail `npm run lint` (`use-color-scheme.web.ts`) and get replaced by our screens.

## Without a backend

```bash
EXPO_PUBLIC_MOCK_API=1 npx expo start
```

Every endpoint of the contract is served by an in-memory fake (`src/api/mock/`): three places around the Rynek, hints, a photo check that always passes after ~2 s, reels, ranking, shop, daily quiz. State resets when the app reloads. Any e-mail/password logs in. Turn demo mode on (default in dev) and long-press the map inside a circle to "stand" at a place.

Against the real API on the laptop: `EXPO_PUBLIC_API_PORT=8010 npx expo start` (port from the repo `.env`).

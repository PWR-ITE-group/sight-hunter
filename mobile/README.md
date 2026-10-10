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

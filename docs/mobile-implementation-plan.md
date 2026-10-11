# 📱 Sight Hunter Mobile — Пошаговый План Имплементации

> **Цель документа:** детальный, однозначный план для AI-агентов. Каждое задание — самодостаточная единица: файл, что в нём, откуда брать данные, какие зависимости.

---

## 📊 Текущее Состояние Кодовой Базы

**Обновлено 11.10.2026.** Все 19 задач ниже выполнены: экраны и компоненты существуют и работают с настоящим API (`src/api/*`), моков в экранах не осталось. `npx tsc --noEmit` и `npx expo lint` — чисто; `npx expo export --platform android` собирается.

| Слой | Статус |
|------|--------|
| API client, endpoints, hooks, stores | ✅ Готовы. `schema.d.ts` перегенерирован из актуального `openapi.yaml` (добавлен `GET /places/next`). `Config.API_BASE_URL` в dev берётся из адреса Metro (ноутбук), переопределяется `EXPO_PUBLIC_API_URL` |
| Auth (welcome, login, nickname) | ✅ Реальные `useLogin/useRegister/useSetNickname`, обработка `email_taken`, `invalid_credentials`, `nickname_taken`; guard в `_layout.tsx` ведёт welcome → nickname → onboarding → tabs |
| Карта | ✅ `useNearbyPlaces` + `useLocation`; ненайденные места рисуются по смещённой зоне из API; в demo-режиме долгий тап задаёт позицию |
| Задание, камера, проверка, результат, next | ✅ Старт раунда при открытии, подсказки через `POST /rounds/{id}/hints`, фото → PUT на `upload_url` (API) → submit → поллинг, ошибки `too_far` / `wrong_place` / лимит попыток, награда из ответа API, `GET /places/next` |
| Рилсы, комментарии, лайки, просмотры, покупка | ✅ `expo-video` в `ReelCard`, играет только видимая карточка, просмотр считается после 3 с |
| Ranking, Profile, Shop, Settings, Onboarding | ✅ На реальных данных; магазин продаёт только публичные рилсы (решение команды — запаса подсказок нет) |
| Quiz dnia | ⚠️ Экран готов, но в бекенде мини-игры нет (первая в списке на вырезание) — показывает «Quiz wkrótce» |

### Известные ограничения

- Счётчик комментариев в ленте не показывается: его нет в `Reel` из контракта.
- «Поделиться» из ленты даёт ссылку с реферальным кодом игрока (`SHARE_BASE_URL/?ref=…`); ссылка на задание — только с экрана задания (`GET /tasks/{id}/share-link`).
- Высота карточки рилса считается как высота окна минус 80 px таб-бара.

---

## 🏗 ПЛАН ЗАДАЧ

Задачи пронумерованы и должны выполняться **в указанном порядке**. Каждая задача зависит от предыдущих.

---

### ЗАДАЧА 1: Layout компоненты

> **Файлы:** `src/components/layout/ScreenWrapper.tsx`, `Header.tsx`, `TabBarIcon.tsx`
> **Зависимости:** `src/constants/colors.ts`, `src/constants/spacing.ts`, `src/constants/typography.ts`

#### 1.1 `src/components/layout/ScreenWrapper.tsx`

```typescript
// Props:
interface ScreenWrapperProps {
  children: ReactNode;
  padding?: number;        // default: Spacing.lg (16)
  backgroundColor?: string; // default: Colors.background
  withScrollView?: boolean; // default: false
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[]; // default: ['top']
}
```

**Что делает:**
- Оборачивает содержимое в `SafeAreaView` из `react-native-safe-area-context`
- Устанавливает `StatusBar` (стиль: 'dark-content')
- Если `withScrollView=true` — оборачивает в `ScrollView` с `contentContainerStyle={{ flexGrow: 1 }}`
- Применяет `padding` и `backgroundColor`

#### 1.2 `src/components/layout/Header.tsx`

```typescript
interface HeaderProps {
  title: string;
  showBack?: boolean;       // default: false
  onBackPress?: () => void; // если не указан — router.back()
  rightAction?: ReactNode;  // кнопка справа (например, настройки)
}
```

**Что делает:**
- Высота: 56px, горизонтальный flex row
- Слева: кнопка назад (иконка ←), если `showBack=true`
- Центр: `title` (Typography.h3)
- Справа: `rightAction`
- Использовать `useRouter()` из `expo-router` для `router.back()`

#### 1.3 `src/components/layout/TabBarIcon.tsx`

```typescript
interface TabBarIconProps {
  name: string;            // имя иконки (символ Unicode или emoji)
  color: string;           // из Tab bar
  focused: boolean;
  badge?: number;          // число для badge-кружка
}
```

**Что делает:**
- Показывает иконку (emoji/символ) с цветом
- Если `badge > 0` — красный кружок с числом в правом верхнем углу (position: absolute)
- `focused` → цвет `Colors.primary`, иначе `Colors.textTertiary`

---

### ЗАДАЧА 2: UI Kit — атомарные компоненты (часть 1)

> **Файлы:** `src/components/ui/Button.tsx`, `TextInput.tsx`, `Card.tsx`, `LoadingSpinner.tsx`, `ErrorBanner.tsx`
> **Зависимости:** `src/constants/*`

#### 2.1 `src/components/ui/Button.tsx`

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'; // default: 'primary'
  size?: 'sm' | 'md' | 'lg';     // default: 'md'
  loading?: boolean;               // default: false
  disabled?: boolean;              // default: false
  icon?: ReactNode;                // иконка слева от текста
  fullWidth?: boolean;             // default: false
}
```

**Стили по вариантам:**

| Variant | Background | Text Color | Border |
|---------|-----------|------------|--------|
| primary | `Colors.primary` | `#FFFFFF` | нет |
| secondary | `Colors.primaryLight` | `Colors.primary` | нет |
| outline | `transparent` | `Colors.primary` | `1px Colors.primary` |
| ghost | `transparent` | `Colors.primary` | нет |

**Размеры:**

| Size | Height | Font Size | Padding Horizontal |
|------|--------|-----------|-------------------|
| sm | 36 | 14 | 12 |
| md | 48 | 16 | 20 |
| lg | 56 | 18 | 24 |

- `borderRadius`: `BorderRadius.md` (12)
- `loading=true` → показать `ActivityIndicator` вместо текста, кнопка `disabled`
- `disabled=true` → `opacity: 0.5`, нажатие игнорируется
- Нажатие: использовать `Pressable`, при `onPressIn` — `Animated.spring` scale до 0.96, при `onPressOut` — назад
- `icon` — отображается слева от `title` с отступом `Spacing.sm` (8)

#### 2.2 `src/components/ui/TextInput.tsx`

```typescript
interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;                  // текст ошибки под полем
  secureTextEntry?: boolean;       // для пароля
  icon?: ReactNode;                // иконка слева
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}
```

**Что делает:**
- Label сверху поля (Typography.caption, Colors.textSecondary)
- Поле ввода: высота 48px, border 1px `Colors.border`, borderRadius `BorderRadius.sm` (8)
- Focus: border меняется на `Colors.primary`
- Error: border `Colors.error`, текст ошибки под полем (Typography.caption, Colors.error)
- `secureTextEntry`: кнопка «глаз» справа для toggle видимости пароля
- `icon`: отображается слева в поле с отступом

#### 2.3 `src/components/ui/Card.tsx`

```typescript
interface CardProps {
  children: ReactNode;
  padding?: number;               // default: Spacing.lg (16)
  elevation?: 'sm' | 'md' | 'lg'; // default: 'md'
  style?: ViewStyle;
  onPress?: () => void;           // если указан — Pressable
}
```

**Стили по elevation:**

| Elevation | shadowOpacity | shadowRadius | shadowOffset.height | elevation (Android) |
|-----------|--------------|-------------|--------------------|--------------------|
| sm | 0.05 | 4 | 2 | 2 |
| md | 0.08 | 8 | 4 | 4 |
| lg | 0.12 | 16 | 8 | 8 |

- `backgroundColor: Colors.surfaceElevated` (#FFFFFF)
- `borderRadius: BorderRadius.lg` (16)
- Если `onPress` задан — обернуть в `Pressable`

#### 2.4 `src/components/ui/LoadingSpinner.tsx`

```typescript
interface LoadingSpinnerProps {
  size?: number;     // default: 40
  color?: string;    // default: Colors.primary
}
```

- Просто `ActivityIndicator` из react-native с заданным `size` и `color`
- Центрирован в контейнере (`flex: 1, justifyContent: 'center', alignItems: 'center'`)

#### 2.5 `src/components/ui/ErrorBanner.tsx`

```typescript
interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}
```

- Полоска сверху: background `Colors.error`, padding `Spacing.md`
- Текст белый (Typography.body)
- Кнопка «Spróbuj ponownie» (белая, outline) — если `onRetry` указан
- Кнопка «✕» справа — если `onDismiss` указан

---

### ЗАДАЧА 3: UI Kit — атомарные компоненты (часть 2)

> **Файлы:** `src/components/ui/Avatar.tsx`, `Badge.tsx`, `ProgressBar.tsx`, `IconButton.tsx`, `Chip.tsx`, `BottomSheet.tsx`

#### 3.1 `src/components/ui/Avatar.tsx`

```typescript
interface AvatarProps {
  uri?: string | null;
  nickname?: string;
  size?: 'sm' | 'md' | 'lg';  // 32 | 48 | 80
}
```

- Если `uri` — показать `Image` из react-native с `borderRadius: size/2`
- Если нет `uri` но есть `nickname` — цветной круг с первыми 2 буквами (capitalize)
- Цвет фона fallback: генерировать из nickname (хэш строки → index в массиве пастельных цветов)

#### 3.2 `src/components/ui/Badge.tsx`

```typescript
interface BadgeProps {
  value: number | string;
  type: 'xp' | 'points' | 'status';
  size?: 'sm' | 'md';  // default: 'md'
}
```

- Горизонтальный flex row: иконка + значение
- `xp` → ⭐ + жёлтый фон, `points` → 💎 + синий фон, `status` → серый фон
- `size='sm'` → fontSize 12, padding 4 8. `size='md'` → fontSize 14, padding 6 12
- `borderRadius: BorderRadius.full` (9999)

#### 3.3 `src/components/ui/ProgressBar.tsx`

```typescript
interface ProgressBarProps {
  progress: number;          // 0-1
  color?: string;            // default: Colors.primary
  backgroundColor?: string;  // default: Colors.border
  height?: number;           // default: 8
  animated?: boolean;        // default: true
}
```

- Контейнер: полная ширина, `height`, `borderRadius: height/2`, `backgroundColor`
- Заполненная часть: `width: progress * 100%`, `backgroundColor: color`, `borderRadius: height/2`
- `animated=true` → использовать `Animated.timing` для плавного изменения ширины (duration: 500ms)

#### 3.4 `src/components/ui/IconButton.tsx`

```typescript
interface IconButtonProps {
  icon: ReactNode;           // emoji или компонент
  onPress: () => void;
  size?: number;             // default: 44
  badge?: number;            // число в правом верхнем углу
  color?: string;            // default: Colors.text
  backgroundColor?: string;  // default: transparent
}
```

- Круглая кнопка `Pressable`: `width: size`, `height: size`, `borderRadius: size/2`
- Badge — красный кружок 18px, position absolute, top: -4, right: -4

#### 3.5 `src/components/ui/Chip.tsx`

```typescript
interface ChipProps {
  label: string;
  selected?: boolean;    // default: false
  onPress?: () => void;
}
```

- `selected=true` → `backgroundColor: Colors.primary`, text: white
- `selected=false` → `backgroundColor: transparent`, border: `Colors.border`, text: `Colors.text`
- `borderRadius: BorderRadius.full` (9999)
- Padding: `Spacing.xs` (4) vertical, `Spacing.md` (12) horizontal
- Typography.captionBold

#### 3.6 `src/components/ui/BottomSheet.tsx`

```typescript
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: number | string;  // default: '50%'
}
```

**Реализация:**
- Использовать `Modal` из react-native с `transparent={true}` и `animationType="slide"`
- Overlay: `backgroundColor: Colors.overlay`, `Pressable` → `onClose`
- Контейнер: `position: absolute`, `bottom: 0`, `width: '100%'`, `backgroundColor: Colors.background`, `borderTopLeftRadius: BorderRadius.xl` (24), `borderTopRightRadius: BorderRadius.xl`
- Handle bar сверху: серая полоска 36×5, borderRadius 3
- `title` → `Typography.h3`, по центру
- `children` → с `padding: Spacing.lg` (16)

> **ВАЖНО:** НЕ использовать `@gorhom/bottom-sheet` — его нет в зависимостях. Использовать `Modal` + `react-native-gesture-handler` (уже установлен).

---

### ЗАДАЧА 4: Tabs Layout

> **Файл:** `src/app/(tabs)/_layout.tsx`
> **Зависимости:** `src/components/layout/TabBarIcon.tsx`, `src/constants/colors.ts`

**Заменить текущее содержимое** (сейчас: `return <Tabs />`):

```typescript
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color }}>📍</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Odkrycia',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color }}>🎬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="daily"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color }}>🧠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color }}>🏆</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
```

---

### ЗАДАЧА 5: Экраны авторизации

> **Файлы:** `src/app/(auth)/_layout.tsx`, `welcome.tsx`, `login.tsx`, `nickname.tsx`
> **Зависимости:** UI Kit (Button, TextInput, Chip, ErrorBanner), constants, `src/api/hooks/useAuth.ts`, `src/api/hooks/useMe.ts`, `src/store/authStore.ts`

#### 5.1 `src/app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
```

#### 5.2 `src/app/(auth)/welcome.tsx`

**Layout:**
- Полноекранный, `flex: 1`, `justifyContent: 'center'`, `alignItems: 'center'`
- Фон: `Colors.primaryLight`
- Верхняя часть (60%): Логотип (текст «🏛» большой, 80px), заголовок «Łowcy Historii» (Typography.h1), подзаголовок «Odkryj historię Wrocławia» (Typography.body, Colors.textSecondary)
- Нижняя часть: Button «Zarejestruj się» (variant="primary", fullWidth) → navigate `/(auth)/login?mode=register`
- Отступ 12px
- Button «Zaloguj się» (variant="outline", fullWidth) → navigate `/(auth)/login?mode=login`
- Использовать `router.push` из `expo-router`

#### 5.3 `src/app/(auth)/login.tsx`

**Параметры:** `mode` из `useLocalSearchParams()` — `'login' | 'register'`

**Layout:**
- ScreenWrapper с padding
- Два Chip'а сверху: «Logowanie» / «Rejestracja» — переключают mode (state)
- Форма:
  - **Register mode:** TextInput email + TextInput password + TextInput «Kod polecenia» (optional) + Button «Zarejestruj się»
  - **Login mode:** TextInput email + TextInput password + Button «Zaloguj się» + ссылка «Zapomniałeś hasła?»
- ErrorBanner при ошибке

**Логика:**
- Использовать `useLogin()` и `useRegister()` из `src/api/hooks/useAuth.ts`
- Валидация через `validateEmail()`, `validatePassword()` из `src/utils/validators.ts`
- При успехе: `router.replace('/(tabs)')` (Auth Guard в _layout.tsx сам разберётся)
- При ошибке `email_taken` → переключить на mode='login'
- При ошибке `invalid_credentials` → показать «Nieprawidłowy e-mail lub hasło»

#### 5.4 `src/app/(auth)/nickname.tsx`

**Layout:**
- ScreenWrapper с padding
- Заголовок «Jak masz na imię, łowco?» (h1)
- Подзаголовок «Wybierz pseudonim, który zobaczą inni gracze» (body, textSecondary)
- TextInput label="Pseudonim" с лічильником символів (3-24) справа под полем
- Button «Dalej» disabled, если nickname.length < 3
- ErrorBanner при ошибке

**Логика:**
- Использовать `useSetNickname()` из `src/api/hooks/useMe.ts`
- Валидация через `validateNickname()` из `src/utils/validators.ts`
- При ошибке `nickname_taken` → «Ten pseudonim jest już zajęty»

---

### ЗАДАЧА 6: Map компоненты

> **Файлы:** `src/components/map/GameMap.tsx`, `PlaceMarker.tsx`, `SearchCircle.tsx`
> **Зависимости:** `react-native-maps` (уже установлен), `src/constants/colors.ts`

#### 6.1 `src/components/map/GameMap.tsx`

```typescript
interface GameMapProps {
  places: Array<{
    id: string;
    offset_lat: number;
    offset_lng: number;
    radius_m: number;
    found: boolean;
    name?: string;
  }>;
  userPosition: { lat: number; lng: number } | null;
  onMarkerPress: (taskId: string) => void;
  onLongPress?: (coords: { lat: number; lng: number }) => void;
  demoMode?: boolean;
}
```

**Что делает:**
- `MapView` из `react-native-maps`
- `initialRegion`: Wrocław `{ latitude: 51.1079, longitude: 17.0385, latitudeDelta: 0.02, longitudeDelta: 0.02 }`
- `showsUserLocation={true}` если не demoMode
- Рендер `PlaceMarker` для каждого place
- Рендер `SearchCircle` для каждого unfound place
- `onLongPress` → получить координаты из `e.nativeEvent.coordinate`

#### 6.2 `src/components/map/PlaceMarker.tsx`

```typescript
interface PlaceMarkerProps {
  place: {
    id: string;
    offset_lat: number;
    offset_lng: number;
    found: boolean;
    name?: string;
  };
  onPress: () => void;
}
```

- `Marker` из `react-native-maps` на позиции `{latitude: offset_lat, longitude: offset_lng}`
- `found=true`: зелёный маркер (pinColor green) + `title` = `name`
- `found=false`: синій маркер (pinColor `Colors.primary`)

#### 6.3 `src/components/map/SearchCircle.tsx`

```typescript
interface SearchCircleProps {
  center: { lat: number; lng: number };
  radius_m: number;
}
```

- `Circle` из `react-native-maps`
- `center`: `{latitude: center.lat, longitude: center.lng}`
- `radius`: `radius_m`
- `fillColor`: `Colors.searchCircle`
- `strokeColor`: `Colors.searchCircleBorder`
- `strokeWidth`: 2

---

### ЗАДАЧА 7: Экран карты (Map tab)

> **Файл:** `src/app/(tabs)/index.tsx`
> **Зависимости:** GameMap, `src/api/hooks/usePlaces.ts`, `src/hooks/useLocation.ts`, `src/store/gameStore.ts`, `src/store/locationStore.ts`

**Заменить placeholder на:**

1. Импортировать `useLocation()` из хуков → получить `position`
2. Импортировать `useNearbyPlaces(lat, lng)` — передать координати позиції
3. Рендерить `GameMap` с данными из хуков
4. `onMarkerPress` → `router.push(\`/task/${taskId}\`)`
5. `onLongPress` → в demoMode записать координати в `locationStore.setMockPosition()`
6. FAB (floating action button) внизу справа — центрувати карту на user position
7. Banner сверху в demoMode: «Tryb demo — dotknij i przytrzymaj mapę»

**Mock данные (пока бекенд не готов):**
```typescript
const MOCK_PLACES = [
  { id: '1', offset_lat: 51.1098, offset_lng: 17.0326, radius_m: 100, found: false, name: 'Katedra' },
  { id: '2', offset_lat: 51.1103, offset_lng: 17.0472, radius_m: 80, found: true, name: 'Ratusz' },
  { id: '3', offset_lat: 51.1063, offset_lng: 17.0310, radius_m: 120, found: false },
];
```

---

### ЗАДАЧА 8: Game компоненты

> **Файлы:** `src/components/game/RiddleCard.tsx`, `HintDialog.tsx`, `VerifySteps.tsx`, `ResultBadge.tsx`, `RewardAnimation.tsx`, `NextPlacePicker.tsx`

#### 8.1 `src/components/game/RiddleCard.tsx`

```typescript
interface RiddleCardProps {
  task: {
    riddle: string;
    archival_photo_url: string | null;
    reward_points: number;
    reward_xp: number;
  };
}
```

- Card component
- Если `archival_photo_url` — Image зверху (height: 200, borderRadius 12, resizeMode 'cover')
- Текст загадки (Typography.h3)
- Row з Badge: `reward_points` (type='points') + `reward_xp` (type='xp')

#### 8.2 `src/components/game/HintDialog.tsx`

```typescript
interface HintDialogProps {
  visible: boolean;
  hintText: string;
  hintsUsed: number;
  maxHints: number;        // = 3
  newRewardPoints: number;
  onClose: () => void;
}
```

- BottomSheet
- Іконка 💡 великая (60px)
- «Wskazówka {hintsUsed}/{maxHints}» (Typography.h3)
- Текст підказки (Typography.body)
- Warning: ⚠️ «Nagroda zmniejszona do {newRewardPoints} pkt» (Colors.warning)
- Button «Rozumiem» → onClose

#### 8.3 `src/components/game/VerifySteps.tsx`

```typescript
interface VerifyStepsProps {
  status: 'uploading' | 'gps_check' | 'clip_check' | 'accepted' | 'rejected';
  gpsProgress?: number;      // 0-1
  clipProgress?: number;     // 0-1
  reason?: 'wrong_place' | 'not_matched' | null;
  wrongPlaceName?: string | null;
}
```

**Layout (вертикальний flex, центрований):**

1. **Крок GPS** (активний коли status === 'gps_check'):
   - Іконка 📍 (40px)
   - «Sprawdzam lokalizację...» → ProgressBar
   - Після завершення: ✅ «Lokalizacja OK» (зелений)

2. **Крок CLIP** (активний коли status === 'clip_check'):
   - Іконка 📷 (40px)
   - «Porównuję zdjęcie...» → ProgressBar
   - Після завершення: ✅ або ❌

3. **Результат `accepted`:**
   - Великий ✅ (80px) з зеленим фоном
   - «Znaleziono!» (Typography.h2, Colors.success)

4. **Результат `rejected`:**
   - Великий ❌ (80px) з червоним фоном
   - Якщо `wrong_place`: «To jest {wrongPlaceName}!» + «Szukaj dalej...»
   - Якщо `not_matched`: «Nie rozpoznano — spróbuj ponownie»

#### 8.4 `src/components/game/RewardAnimation.tsx`

```typescript
interface RewardAnimationProps {
  points: number;
  xp: number;
}
```

- Два числа з анімацією лічильника: 0 → points (за ~1.5 сек)
- Badges: 💎 {points} pkt + ⭐ {xp} XP
- Використовувати `useEffect` + `setInterval` для анімації лічильника (крок ~50ms)

#### 8.5 `src/components/game/NextPlacePicker.tsx`

```typescript
interface NextOption {
  type: 'nearest' | 'popular' | 'random';
  taskId: string;
  name?: string;
  distance?: string;    // formatted, e.g. "350 m"
  findersCount?: number;
}

interface NextPlacePickerProps {
  options: NextOption[];
  onSelect: (taskId: string) => void;
}
```

- 3 Cards в колонку:
  - 🧭 «Najbliższe» — name + distance
  - 🔥 «Najpopularniejsze» — name + `{findersCount} łowców`
  - 🎲 «Losowe w pobliżu» — «Zaskocz mnie!»
- Кожна Card з chevron '›' справа, натискається → onSelect(taskId)

---

### ЗАДАЧА 9: Екран Task

> **Файл:** `src/app/task/[taskId].tsx`
> **Зависимости:** RiddleCard, HintDialog, Button, Header, `useTask()`, `useStartRound()`, `useHint()`

**Логіка:**
1. `useLocalSearchParams()` → отримати `taskId`
2. `useTask(taskId)` → отримати дані завдання
3. Header з кнопкою back
4. RiddleCard з даними завдання
5. Секція підказок: до 3 кнопок «Wskazówka {n}» (variant='outline')
   - Натиснуті → показують текст підказки
   - Не натиснуті → показують HintDialog при натисканні
6. Button «📷 Zrób zdjęcie» (primary, fullWidth) → `router.push('/camera')`
7. Button «🔗 Udostępnij» (outline) → share link

**Mock дані:**
```typescript
const MOCK_TASK = {
  id: '1',
  riddle: 'Znajdź kościół z dwoma wysokimi wieżami na Ostrowie Tumskim',
  archival_photo_url: null,
  reward_points: 100,
  reward_xp: 50,
  hints: ['Szukaj na wyspie', 'To katedra', 'Katedra św. Jana Chrzciciela'],
};
```

---

### ЗАДАЧА 10: Екран Camera

> **Файл:** `src/app/camera.tsx`
> **Зависимості:** `expo-camera`, `src/hooks/useCamera.ts`, `src/store/gameStore.ts`, IconButton, Button

**Layout:**
1. Повноекранний `CameraView` з `expo-camera`
2. Viewfinder overlay: напівпрозорий чорний з прозорим прямокутником по центру
3. Нижня панель:
   - Зліва: flip camera (IconButton з 🔄)
   - По центру: capture button — велике біле коло (80px) з inner circle (68px)
   - Справа: flash toggle (IconButton з ⚡)
4. **Після зняття:** показати preview з двома кнопками:
   - «✓ Wyślij» (primary) → trigger verification
   - «↻ Powtórz» (outline) → повернутися до камери

**Логіка:**
- `useCamera()` для permissions + capture
- Після capture → зберегти URI в `gameStore.setLastPhoto()`
- «Wyślij» → `router.push('/verify/new')` (або створити attempt і перейти)

**Важливо:**
- Читати документацію expo-camera для SDK 57: `https://docs.expo.dev/versions/v57.0.0/sdk/camera/`
- API могло змінитися від training data!

---

### ЗАДАЧА 11: Екран Verify

> **Файл:** `src/app/verify/[attemptId].tsx`
> **Зависимості:** VerifySteps, Button, `src/hooks/useVerificationFlow.ts`

**Логіка:**
1. Використати `useVerificationFlow()` хук
2. При mount → виклик `start()` (create attempt → upload → submit → poll)
3. Рендерити `VerifySteps` зі status з хука
4. При `accepted`:
   - Button «Zobacz nagrodę» → `router.replace('/result')`
5. При `rejected`:
   - Button «Spróbuj ponownie» → `router.back()` (назад до камери)
   - Info: «Pozostało prób: {attemptsLeft}»

---

### ЗАДАЧА 12: Екран Result та Next

> **Файли:** `src/app/result.tsx`, `src/app/next.tsx`
> **Зависимості:** RewardAnimation, NextPlacePicker, Button, Card

#### 12.1 `src/app/result.tsx`

- ScreenWrapper з `backgroundColor: Colors.primaryLight`
- «Gratulacje!» (h1, по центру)
- RewardAnimation з points і xp
- Якщо є unlocked reel: Card з thumbnail + «Odblokowano!» badge + Button «▶ Obejrzyj historię»
- Button «Szukaj dalej» (primary, fullWidth) → `router.push('/next')`

#### 12.2 `src/app/next.tsx`

- ScreenWrapper
- Header з «Co dalej?» + кнопка back
- NextPlacePicker з mock options
- `onSelect` → `router.replace(\`/task/${taskId}\`)`

---

### ЗАДАЧА 13: Reels компоненти

> **Файли:** `src/components/reels/ReelCard.tsx`, `ReelOverlay.tsx`, `CommentSheet.tsx`, `ShareSheet.tsx`

#### 13.1 `src/components/reels/ReelCard.tsx`

```typescript
interface ReelCardProps {
  reel: {
    id: string;
    title: string;
    playback_url: string | null;
    thumbnail_url?: string;
    finders_count: number;
    likes_count: number;
    liked_by_me: boolean;
    locked: boolean;
    price_points?: number;
  };
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onView: () => void;
  onBuy?: () => void;
}
```

- Повноекранна висота (height: windowHeight)
- Якщо `locked=false` і `playback_url` — `VideoView` з `expo-video`
- Якщо `locked=true` — blur background + lock icon 🔒 + «Kup za {price_points} pkt»
- Overlay gradient знизу (transparent → black 50%)
- Title (bold, white) + `{finders_count} odkrywców`
- ReelOverlay праворуч

**Важливо:** Читати документацію expo-video для SDK 57: `https://docs.expo.dev/versions/v57.0.0/sdk/video/`

#### 13.2 `src/components/reels/ReelOverlay.tsx`

```typescript
interface ReelOverlayProps {
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}
```

- Правий стовпець (position absolute, right 12, bottom 100):
  - ❤️ (червоне якщо liked_by_me, біле інакше) + likes_count
  - 💬 + comments_count
  - 🔗
- Кожна — IconButton з числом під ним (білий текст)

#### 13.3 `src/components/reels/CommentSheet.tsx`

```typescript
interface CommentSheetProps {
  comments: Array<{ id: string; nickname: string; text: string; created_at: string }>;
  visible: boolean;
  onClose: () => void;
  onAdd: (text: string) => void;
}
```

- BottomSheet 60% висоти
- FlatList коментарів: Avatar(sm) + nickname (bold) + text + date
- Input знизу + Button «Wyślij»

#### 13.4 `src/components/reels/ShareSheet.tsx`

```typescript
interface ShareSheetProps {
  url: string;
  visible: boolean;
  onClose: () => void;
}
```

- BottomSheet
- URL текстом + Button «Kopiuj link» (Clipboard.setStringAsync)
- Button «Udostępnij» → `Share.share({ url })` з react-native

---

### ЗАДАЧА 14: Екран Feed (рілси)

> **Файл:** `src/app/(tabs)/feed.tsx`
> **Зависимості:** ReelCard, CommentSheet, ShareSheet, `src/api/hooks/useReels.ts`

**Layout:**
- FlatList з `pagingEnabled`, `snapToInterval={windowHeight}`, `decelerationRate="fast"`
- Кожен item — ReelCard повноекранний
- Тільки видимий item грає відео, інші на паузі
- `onViewableItemsChanged` → track visible item

**Логіка:**
- `useReelFeed()` → отримати дані
- `useLikeReel()`, `useUnlikeReel()` для лайків
- `useComments(reelId)`, `useAddComment()` для коментарів

**Mock дані:**
```typescript
const MOCK_REELS = [
  {
    id: '1', title: 'Katedra Wrocławska', playback_url: null,
    finders_count: 42, likes_count: 15, liked_by_me: false,
    locked: false, comments_count: 3,
  },
  {
    id: '2', title: 'Ratusz Wrocławski', playback_url: null,
    finders_count: 87, likes_count: 34, liked_by_me: true,
    locked: true, price_points: 50, comments_count: 0,
  },
];
```

---

### ЗАДАЧА 15: Daily Quiz компоненти та екран

> **Файли:** `src/components/daily/QuizCard.tsx`, `QuizResult.tsx`, `src/app/(tabs)/daily.tsx`

#### 15.1 `src/components/daily/QuizCard.tsx`

```typescript
interface QuizCardProps {
  question: {
    id: string;
    text: string;
    image_url?: string;
    options: string[];
  };
  selectedIndex?: number;
  onSelect: (index: number) => void;
}
```

- Image зверху (якщо є) — height 200, borderRadius 12
- Текст питання (Typography.h3)
- 4 кнопки (outline): `options[i]`
  - selected → `variant='primary'`
  - unselected → `variant='outline'`

#### 15.2 `src/components/daily/QuizResult.tsx`

```typescript
interface QuizResultProps {
  score: number;
  total: number;
  pointsAwarded: number;
}
```

- Великий score «{score}/{total}» (h1)
- Badge «+{pointsAwarded} pkt» (type='points')
- Емоджі: score === total → 🎉, score >= total/2 → 👍, інакше → 😅

#### 15.3 `src/app/(tabs)/daily.tsx`

**Layout:**
- ScreenWrapper
- Заголовок «Quiz dnia» + today's date (formatDate)
- QuizCard для поточного питання
- Pagination dots (кружки знизу)
- Button «Sprawdź odpowiedzi» (primary, disabled поки не обрані всі відповіді)
- QuizResult після відправки

**Логіка:**
- `useDailyGame()` → отримати питання
- `useSubmitDailyAnswers()` → відправити відповіді
- State: `answers: Record<string, number>` — обрані відповіді

---

### ЗАДАЧА 16: Ranking та Profile

> **Файли:** `src/app/(tabs)/ranking.tsx`, `src/app/(tabs)/profile.tsx`

#### 16.1 `src/app/(tabs)/ranking.tsx`

**Layout:**
- ScreenWrapper
- Header «Ranking»
- Row з Chips: «Tydzień» (selected) + «Wszyscy»
- Топ-3 подіум:
  - Центр: 1 місце — Avatar(lg) + 👑 + nickname + xp
  - Ліворуч: 2 місце — Avatar(md) + nickname + xp
  - Праворуч: 3 місце — Avatar(md) + nickname + xp
- FlatList для 4-50: `#{rank} | Avatar(sm) | nickname | {xp} XP`
- Highlighted row для «me» (backgroundColor: Colors.primaryLight)

**Логіка:**
- `useLeaderboard(scope)` → дані
- State: `scope: 'week' | 'all'`

#### 16.2 `src/app/(tabs)/profile.tsx`

**Layout:**
- ScreenWrapper з ScrollView
- Avatar(lg) + nickname (h2) + email (caption, textSecondary)
- Stats row (3 Cards):
  - 💎 `{points}` pts
  - ⭐ `{xp}` XP
  - 📍 `{found_count}` Znalezione
- Section «Kod polecenia»: Card з ref_code + Button «Kopiuj» (Clipboard)
- Buttons: «🛒 Sklep» → `router.push('/shop')`, «⚙️ Ustawienia» → `router.push('/settings')`

**Логіка:**
- `useMe()` → дані профілю

---

### ЗАДАЧА 17: Shop та Settings

> **Файли:** `src/app/shop.tsx`, `src/app/settings.tsx`
> **Зависимості:** ShopItemCard, PurchaseDialog, Card, Button

#### 17.1 Shop компоненти

`src/components/shop/ShopItemCard.tsx`:
```typescript
interface ShopItemCardProps {
  item: { id: string; name: string; description: string; price_points: number; quantity?: number };
  onBuy: () => void;
  canAfford: boolean;
}
```
- Card з name (h3) + description (body) + price Badge + Button «Kup» (disabled якщо !canAfford)

`src/components/shop/PurchaseDialog.tsx`:
```typescript
interface PurchaseDialogProps {
  item: { name: string; price_points: number } | null;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  result?: { success: boolean; coupon_code?: string };
}
```
- BottomSheet: «Kupić {name} za {price_points} pkt?»
- Two buttons: «Kup» (primary) + «Anuluj» (ghost)
- After: success/error message

#### 17.2 `src/app/shop.tsx`

- ScreenWrapper
- Header «Sklep» + back
- Баланс: Card з «💎 {balance} pkt» (h2)
- Sections: FlatList з ShopItemCard
- PurchaseDialog
- `useShopItems()`, `usePurchase()`

#### 17.3 `src/app/settings.tsx`

- ScreenWrapper з ScrollView
- Header «Ustawienia» + back
- **Konto:** email (read-only), nickname
- **Uprawnienia:** Camera (granted/denied), Location (granted/denied)
- **Gra:** Toggle «Tryb demo» (Switch)
- **O aplikacji:** «Łowcy Historii v1.0.0», «BEST Hacks 2026»
- Button «Wyloguj się» (Colors.error color) → `authStore.logout()` → router.replace auth

---

### ЗАДАЧА 18: Onboarding

> **Файл:** `src/app/onboarding.tsx`
> **Зависимості:** Button, ScreenWrapper

**Layout:**
- Horizontal FlatList (paging):
  1. Іконка 🏛 + «Witaj w grze!» + «Szukaj historycznych miejsc we Wrocławiu...»
  2. Іконка 🎁 + «Twój pierwszy bonus!» + «Otrzymujesz 50 punktów i 1 darmową wskazówkę na start»
- Dots indicator (кружки знизу)
- Button «Zacznij grę» (тільки на останньому slide) → `router.replace('/(tabs)')`

---

### ЗАДАЧА 19: Reel full-screen

> **Файл:** `src/app/reel/[reelId].tsx`
> **Зависимості:** ReelCard, expo-video

- `useLocalSearchParams()` → `reelId`
- Повноекранний video player
- Back button (absolute, top-left, white)
- ReelOverlay праворуч

---

## 📋 ПРАВИЛА ДЛЯ ВСІХ ЗАДАЧ

### Загальні правила

1. **Мова UI — ТІЛЬКИ ПОЛЬСЬКА.** Всі тексти, кнопки, повідомлення — по-польськи
2. **Не редагувати `src/api/schema.d.ts`** — він генерується
3. **Встановлювати пакети ТІЛЬКИ через `npx expo install`**
4. **Expo SDK 57** — перед використанням API Expo читати документацію: `https://docs.expo.dev/versions/v57.0.0/`
5. Також: `https://docs.expo.dev/llms.txt` — індекс з виправленнями типових помилок LLM
6. **НЕ створювати `ios/` чи `android/` директорії** (Continuous Native Generation)
7. **Імпорти:** використовувати відносні шляхи або alias `@/` якщо налаштовано

### Стиль коду

1. Кожен компонент — в окремому файлі з `export default`
2. Стилі — через `StyleSheet.create()` в тому ж файлі
3. Типи Props — `interface` в тому ж файлі (не виносити в types/)
4. Використовувати `Colors`, `Typography`, `Spacing`, `BorderRadius` з `src/constants/`
5. Не хардкодити кольори, розміри, відступи

### Перевірка перед завершенням задачі

```bash
npx tsc --noEmit     # перевірка типів
npx expo lint        # лінтинг
```

---

## 📦 Залежності (вже встановлені)

| Пакет | Версія | Для чого |
|-------|--------|----------|
| `expo` | 57.0.27 | Фреймворк |
| `expo-router` | 57.0.25 | Навігація |
| `expo-camera` | 57.0.6 | Камера |
| `expo-location` | 57.0.20 | Геолокація |
| `expo-video` | 57.0.5 | Відео плеєр |
| `expo-image` | 57.0.5 | Оптимізовані зображення |
| `expo-image-manipulator` | 57.0.21 | Resize фото |
| `expo-secure-store` | 57.0.4 | Зберігання токенів |
| `expo-splash-screen` | 57.0.9 | Splash screen |
| `react-native-maps` | 1.27.2 | Карта |
| `react-native-reanimated` | 4.5.1 | Анімації |
| `react-native-gesture-handler` | 2.32.0 | Жести |
| `react-native-safe-area-context` | 5.7.0 | Safe area |
| `@tanstack/react-query` | 5.104.1 | Серверний стан |
| `zustand` | 5.0.15 | Клієнтський стан |
| `@react-native-async-storage/async-storage` | 3.1.1 | AsyncStorage |

**НЕ потрібно встановлювати додаткові пакети** для базової реалізації. Якщо потрібна іконка — використовувати emoji.

---

## 🗺 Граф залежностей задач

```
ЗАДАЧА 1 (Layout компоненти)
    ↓
ЗАДАЧА 2 (UI Kit, частина 1: Button, TextInput, Card, Spinner, ErrorBanner)
    ↓
ЗАДАЧА 3 (UI Kit, частина 2: Avatar, Badge, ProgressBar, IconButton, Chip, BottomSheet)
    ↓
ЗАДАЧА 4 (Tabs Layout) ← залежить від 1
    ↓
┌───────────┬───────────────┬──────────────┐
↓           ↓               ↓              ↓
ЗАДАЧА 5    ЗАДАЧА 6        ЗАДАЧА 8       ЗАДАЧА 13
(Auth)      (Map компон.)   (Game компон.) (Reels компон.)
↓           ↓               ↓              ↓
            ЗАДАЧА 7        ЗАДАЧА 9       ЗАДАЧА 14
            (Map екран)     (Task екран)   (Feed екран)
                            ↓
                            ЗАДАЧА 10 (Camera)
                            ↓
                            ЗАДАЧА 11 (Verify)
                            ↓
                            ЗАДАЧА 12 (Result + Next)

Паралельно з 5-14:
ЗАДАЧА 15 (Daily Quiz) — залежить від 2, 3
ЗАДАЧА 16 (Ranking + Profile) — залежить від 2, 3
ЗАДАЧА 17 (Shop + Settings) — залежить від 2, 3
ЗАДАЧА 18 (Onboarding) — залежить від 2
ЗАДАЧА 19 (Reel fullscreen) — залежить від 13
```

**Мінімальна послідовність для робочого циклу гри:**
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

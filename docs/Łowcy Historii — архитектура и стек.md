# Łowcy Historii — архитектура и стек

Oct 10, 2026 · @Oleg

## TL;DR

Рекомендую **модульный монолит на FastAPI + отдельный ML-воркер** (вариант B ниже). Это быстро собрать за хакатон и легко защитить на Q&A.

- **Мобилка:** Expo + TypeScript, `expo-camera`, `expo-location`, `expo-video`.
- **Бэкенд:** FastAPI + SQLAlchemy 2 + Alembic; PostgreSQL с **PostGIS** (геозоны) и **pgvector** (эмбеддинги фото); Redis для лидерборда и очереди.
- **Видео рилсов:** на демо — заранее пережатые MP4 в Cloudflare R2; в продукте — Bunny Stream или Cloudflare Stream (HLS, кодирование бесплатно).
- **Распознавание:** своя проверка, а не один внешний API: геозона по GPS → сходство фото с эталонами (DINOv2/CLIP + pgvector) → LLM vision только для спорных случаев.
- **Деплой:** на хакатон — Railway или Hetzner + Coolify; мобилка через dev build / EAS. Микросервисы показываем как целевую схему на слайде, а не строим.

## Что строим

Архитектура должна обслуживать один игровой цикл: задание → поход на место → фото → проверка → награда → рилс. Ниже — как я его понял по прототипу и вашим решениям; если где-то не так, поправьте прямо в документе.

1. Игрок получает задание: загадку или архивное фото места во Вроцлаве.
2. Идёт на место и фотографирует объект камерой приложения.
3. Сервер проверяет, что игрок рядом и на фото нужный объект.
4. Начисляет XP (только лидерборд) и очки (валюта). Подсказки уменьшают награду раунда, а не баланс.
5. Открывает reward-рилс: лента в стиле TikTok, счётчик нашедших, комментарии, реферальная ссылка на задание.
6. Плюс домашняя мини-игра раз в день и магазин за очки: подсказки, публичные рилсы, партнёры.

**Технические требования, которые из этого следуют:**

| Требование | Что нужно от стека |
| --- | --- |
| Поиск «что рядом», геозона места | Гео-запросы в БД (PostGIS) |
| Проверка фото | ML-модель или внешний vision API |
| Лента коротких видео | CDN, по возможности HLS, предзагрузка на клиенте |
| Очки, покупки, награды | Транзакции и журнал операций, а не «изменяемое число» |
| Лидерборд | Быстрый топ-N (Redis sorted set) |
| Античит | Серверная проверка GPS, фото только с камеры, лимиты |
| Контент (места, рилсы) | Простая админка для загрузки |

**Что знает команда:** Python + FastAPI, Expo / React, Java, TypeScript, PostgreSQL. Из прошлого проекта «Aktywny obywatel» у вас уже есть опыт Spring Modulith, Docker Compose и Flyway — это пригодится.

**Что важно жюри BEST Hacks:** в «Aspekt techniczny» оценивают оптимальную, масштабируемую архитектуру, обоснование технологий и понимание кода; оценку могут пересмотреть после Q&A. Значит, выбираем то, что каждый в команде сможет объяснить.

## Варианты архитектуры

Выбор — **B: монолит + ML-воркер**. Он отделяет единственную по-настоящему тяжёлую часть (PyTorch-модель) и при этом остаётся одним кодом, который команда из 4 человек успеет собрать и отладить.

| Вариант | Что внутри | Скорость за хакатон | Масштабирование | Главный риск |
| --- | --- | --- | --- | --- |
| **A. Модульный монолит** | Один FastAPI-сервис с модулями auth, quests, recognition, media, social, shop; Postgres, Redis, S3 | Самая высокая | Горизонтально целиком; модель грузится в каждый инстанс | Образ с torch на несколько ГБ, медленный старт API |
| **B. Монолит + ML-воркер** (рекомендую) | Тот же монолит, но распознавание — отдельный Python-процесс; связь через очередь Redis (arq / Celery) или внутренний HTTP | Высокая | API и ML масштабируются отдельно | Нужно продумать асинхронный ответ (поллинг или WebSocket) |
| **C. BaaS (Supabase)** | Auth, Postgres с PostGIS и pgvector, Storage из коробки; FastAPI только для распознавания | Высокая для CRUD | Хорошее до лимитов | Free: 1 ГБ файлов и 5 ГБ egress — видео не влезет; проект засыпает после 7 дней простоя; меньше «своей архитектуры» для жюри |
| **D. Микросервисы** | Gateway, auth, quests, media, recognition, social, gamification; брокер (RabbitMQ / Kafka); Kubernetes | Низкая | Лучшее на бумаге | Распределённые транзакции (награда + разблокировка рилса), отладка за 24 ч, вопросы жюри по каждому сервису |

**Как говорить о микросервисах на защите.** Покажите вариант D как целевую схему. Объясните, что границы модулей в монолите уже совпадают с будущими сервисами. Первым кандидатом на вынос назовите recognition, вторым — media. Это и есть ответ на «масштабируемую архитектуру» без риска не успеть.

**Java как альтернатива.** Если бэкендеры увереннее в Spring, вариант A/B можно сделать на Spring Boot + Spring Modulith, как в «Aktywny obywatel». Но ML-часть всё равно будет на Python, и в проекте появятся два языка на сервере. Для хакатона я бы оставил один Python.

Схема рекомендуемого варианта B:

&#91;embedded content: вариант B · API, данные, ML-воркер\]

Телефон говорит только с API и CDN; проверка фото уходит через очередь Redis в воркер, а его вердикт пишется в Postgres. LLM вызывается только для спорных снимков.

## Стек по слоям

Везде, где можно, берём то, что команда уже знает; новое — только PostGIS, pgvector и модель для фото.

| Слой | Выбор | Альтернатива | Почему |
| --- | --- | --- | --- |
| Мобильное приложение | Expo + TypeScript, expo-router, TanStack Query, Zustand | Чистый React Native CLI | Знакомо команде; OTA-обновления через EAS Update |
| Камера и гео | `expo-camera`, `expo-location` | react-native-vision-camera | Хватает для съёмки и координат; vision-camera нужна только для on-device ML |
| Карта | `react-native-maps` | MapLibre RN (OpenStreetMap) | Быстрый старт; MapLibre — если нужен свой стиль карты и без Google |
| Видео-лента | `expo-video` + `FlatList` с постраничной прокруткой | react-native-video | Нативный плеер Expo; MP4 и HLS |
| API | FastAPI + Pydantic v2 | Spring Boot (Modulith), NestJS | Async, OpenAPI из коробки, тот же язык, что и ML |
| ORM и миграции | SQLAlchemy 2 (async) + Alembic | SQLModel | Стандарт для FastAPI; Alembic = ваш Flyway |
| Аутентификация | Свой JWT (access + refresh), токены в `expo-secure-store` | Supabase Auth, Clerk | Без внешней зависимости; вход по e-mail или Google позже |
| База данных | PostgreSQL + PostGIS + pgvector | Отдельная векторная БД | Одна БД на гео, эмбеддинги и бизнес-данные |
| Кэш, лидерборд, очередь | Redis (или Valkey) + arq | Celery + RabbitMQ | Sorted sets для топа, очередь для ML-воркера |
| ML-воркер | Python, PyTorch или ONNX Runtime, open\_clip / DINOv2 | Внешний vision API | Бесплатно, предсказуемо, объяснимо |
| Файлы (фото игроков, эталоны) | S3-совместимое хранилище: Cloudflare R2; локально MinIO | Supabase Storage | Загрузка напрямую с телефона по presigned URL, без проксирования через API |
| Видео рилсов | см. раздел ниже | — | — |
| Админка | SQLAdmin (встраивается в FastAPI) | Веб на React + Vite | Админка за час, а не за день |
| Общие типы | OpenAPI → TS-клиент (orval или openapi-typescript) | Ручные типы | Мобилка и API не расходятся |
| Ошибки и логи | Sentry (мобилка + API) | — | Видно падения во время демо |
| CI | GitHub Actions: lint, тесты, сборка Docker-образов | — | Уже делали в прошлом проекте |

Для нативных модулей (vision-camera, TFLite, кэш видео) нужен development build, в стандартном Expo Go они не работают. Если такие модули не нужны, можно всю разработку вести в Expo Go.

## Открытый вопрос 1: где хранить видео рилсов

На демо хватит **MP4 в Cloudflare R2**; для продукта — **Bunny Stream** (дёшево, EU, HLS) или **Cloudflare Stream** (самая простая модель цены). Чтобы выбор не был окончательным, храните в БД `video_provider` + `playback_url`, а не «зашитый» путь.

| Вариант | Цена (на 10.10.2026) | Что даёт | Минусы |
| --- | --- | --- | --- |
| [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) + MP4 | $0.015/ГБ-мес; бесплатно 10 ГБ и 10 млн чтений в месяц; egress бесплатный | Просто файл по URL, ноль кода на бэкенде | Нет адаптивного битрейта: пережимать самим через ffmpeg (720p, `-movflags +faststart`) |
| [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/) | $5 за 1000 минут хранения (предоплата), $1 за 1000 минут просмотра; кодирование и трафик включены | Загрузка → HLS/DASH, плеер, прямая загрузка с телефона | Нет бесплатного уровня |
| [Bunny Stream](https://bunny.net/pricing/stream/) | Хранение от $0.01/ГБ, CDN от $0.005/ГБ, стандартное кодирование бесплатно; минимум $1/мес | HLS, плеер, регионы хранения на выбор, компания из EU | Чуть больше настроек (библиотеки, регионы) |
| [Mux](https://www.mux.com/docs/changelog/video-free-plan) | Free: до 10 видео, 100 тыс. минут просмотра в месяц; дальше от $0.0008/мин | Лучший DX, аналитика просмотров | 10 видео на бесплатном плане мало даже для демо |
| [Supabase Storage](https://supabase.com/pricing) | Free: 1 ГБ файлов, 5 ГБ egress | Удобно, если всё на Supabase | Для видео лимитов не хватит |
| MinIO на своём VPS + ffmpeg → HLS + Cloudflare CDN | Только сервер | Полный контроль, дешевле всего на объёме | Больше всего работы и поддержки |

**Оценка расходов (мой расчёт, не цитата).** 100 рилсов по 30 с — это 50 минут хранения. 1000 игроков смотрят по 20 рилсов — 10 000 минут просмотра. Cloudflare Stream: $5 + $10 в месяц. Bunny: 30 с в 720p ≈ 10 МБ, 20 000 просмотров ≈ 200 ГБ трафика ≈ $1–2.

**На клиенте.**

- Лента: `FlatList` с `pagingEnabled`, играет только видимый элемент, соседние ±1 предзагружены.
- `expo-video` кэширует MP4 нативно, а с HLS на iOS кэш не работает — для этого есть [expo-video-cache](https://geekyants.com/blog/performant-vertical-feed-in-expo-hls-caching-on-ios) (локальный прокси). Для коротких рилсов MP4 часто проще и быстрее HLS.
- Если игроки будут сами загружать видео (публичные рилсы), загрузка идёт прямо в Stream/Bunny/R2 по одноразовой ссылке от API, а публикация — только после модерации.

## Открытый вопрос 2: распознавание — API или библиотека

Ответ: **своя библиотека как основа, внешний API как запасной судья**. Ни один внешний API не знает мелкие вроцлавские объекты (krasnale, таблички, фрески), а GPS легко подделать. Надёжно работает только комбинация проверок.

| Подход | Тип | Цена | Сильные стороны | Слабые стороны |
| --- | --- | --- | --- | --- |
| GPS-геозона (PostGIS `ST_DWithin`, радиус 30–50 м) | Своё | 0 | Мгновенно, дёшево | Подделывается mock-location; не доказывает, что объект найден |
| [Google Cloud Vision, Landmark Detection](https://cloud.google.com/vision/pricing) | Внешний API | 1000 запросов в месяц бесплатно, дальше $1.50 за 1000 | Одна строка кода | Знает только известные достопримечательности; мелкие объекты не распознает |
| LLM vision ([Gemini](https://ai.google.dev/gemini-api/docs/pricing)): фото игрока + эталон + «это тот же объект?» → JSON | Внешний API | 2.5 Flash-Lite: $0.10 за 1 млн входных токенов; 3.1 Flash-Lite: $0.25; есть free tier | Понимает любой объект, ракурс, архивное сравнение | Задержка сети, недетерминированность; на free tier данные используются для улучшения продуктов Google |
| Эмбеддинги DINOv2 / CLIP + pgvector | Своя библиотека (сервер) | Только CPU сервера | Бесплатно, предсказуемо, объяснимо жюри; DINOv2 без дообучения хорошо работает для распознавания мест ([AnyLoc](https://huggingface.co/papers/2308.00688)) | Нужны 5–20 эталонных фото на место; тяжёлый образ с torch |
| Геометрическая проверка SuperPoint + [LightGlue](https://github.com/cvg/LightGlue) (или ORB + RANSAC в OpenCV) | Своя библиотека (сервер) | CPU/GPU | Подтверждает, что это именно тот фасад, а не похожий | Медленнее эмбеддингов; нужна только в спорных случаях |
| On-device: [react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite) + vision-camera | Своя модель (телефон) | 0 | Живая подсказка «горячо / холодно» без сети | Нужен dev build и конвертация модели; клиенту нельзя доверять как финальной проверке |

**Рекомендуемый конвейер проверки находки:**

1. Фото — только из камеры приложения, не из галереи; вместе с ним GPS, точность и время съёмки.
2. Сервер: геозона PostGIS. Не в радиусе → отказ с подсказкой «подойди ближе». Mock-location на устройстве ловим [jail-monkey](https://classic.yarnpkg.com/en/package/jail-monkey) или [react-native-turbo-mock-location-detector](https://npmjs.com/package/react-native-turbo-mock-location-detector).
3. ML-воркер: эмбеддинг фото → cosine similarity с эталонами места в pgvector (индекс HNSW).
4. Сходство выше верхнего порога → находка засчитана. Ниже нижнего → отказ.
5. Серая зона между порогами → LLM vision (или LightGlue) как второй судья.
6. Пороги подбираем на 20–30 своих тестовых снимках до хакатона.

**Оценка стоимости LLM-судьи (мой расчёт).** Два изображения и короткий промпт — порядка 1–2 тыс. входных токенов, это доли цента за запрос на Flash-Lite. А до LLM доходит только серая зона.

На демо можно стартовать даже с одного LLM-судьи + геозоны, если не успеете с эмбеддингами: интерфейс воркера тот же, меняется только реализация.

## Модель данных

Главное решение: очки и XP хранятся как **журнал операций**, а баланс считается из него. Так награда, покупка подсказки и откат при ошибке не теряют деньги игрока.

| Таблица | Ключевые поля | Зачем |
| --- | --- | --- |
| `users` | id, email (уникальный), password\_hash, nickname (уникальный, пустой до второго шага), avatar, referred\_by | Профиль, реферал |
| `places` | id, name, era, category, `geom geography(Point)`, radius\_m | Объекты на карте и геозона |
| `place_refs` | place\_id, photo\_url, `embedding vector(768)` | Эталонные фото для распознавания (индекс HNSW) |
| `tasks` | id, place\_id, riddle, archival\_photo\_url, hints (jsonb), base\_reward\_points, base\_xp | Задание и его подсказки |
| `task_rounds` | user\_id, task\_id, started\_at, hints\_used, reward\_points, status | Текущий раунд: подсказки уменьшают его награду, а не баланс |
| `attempts` | round\_id, photo\_url, `gps geography(Point)`, accuracy\_m, score, status | Каждая попытка находки и вердикт проверки |
| `finds` | user\_id, task\_id, attempt\_id, points\_awarded, xp\_awarded, found\_at | Засчитанные находки; уникальность (user\_id, task\_id) |
| `reels` | id, place\_id, kind (reward / public), video\_provider, playback\_url, duration\_s, author\_id | Видео-контент |
| `reel_unlocks` | user\_id, reel\_id, source (find / purchase) | Кому какой рилс открыт |
| `reel_comments`, `reel_views` | user\_id, reel\_id, … | Социальная часть ленты |
| `wallet_ledger` | user\_id, delta, reason (find / purchase / referral / daily), ref\_id | Очки: только добавление записей |
| `xp_ledger` | user\_id, delta, reason, ref\_id | XP для лидерборда; топ кэшируется в Redis |
| `daily_game` | user\_id, date, started\_at, score | Мини-игра раз в день: уникальность (user\_id, date) |
| `purchases` | user\_id, item\_type, item\_id, price\_points | Магазин: подсказки, рилсы, партнёры |

Начисление награды — одна транзакция: `finds` + две записи в журналах + разблокировка рилса. В варианте D это стало бы распределённой транзакцией между сервисами — ещё один аргумент против микросервисов сейчас.

## Что происходит по нажатию

Каждое нажатие — это один-два вызова REST API; всё, что меняет очки, XP или доступ к контенту, решает только сервер в транзакции. Клиент лишь показывает результат. Все запросы идут на `/api/v1` с заголовком `Authorization: Bearer <access>`; кнопки, которые тратят или начисляют, дополнительно шлют `Idempotency-Key`, чтобы двойной тап не сработал дважды.

### 0. Запуск приложения

1. Приложение читает refresh-токен из `expo-secure-store`.
2. Есть токен → `POST /auth/refresh` → новый access-токен (живёт \~15 мин) и новый refresh.
3. `GET /me` → ник, баланс очков, XP, реферальный код. Ответ кладётся в кэш TanStack Query и показывается в шапке.
4. Нет токена или refresh отклонён (401) → экран аккаунта. Токен есть, но в /me нет ника → экран никнейма.
5. Дальше любой ответ 401 перехватывает интерцептор клиента: один раз пробует refresh и повторяет запрос.

### 1. Аккаунт, затем никнейм

1. Экран аккаунта с переключателем «Nowe konto» / «Mam już konto»: e-mail и пароль. Клиент проверяет формат e-mail и пароль (не меньше 8 символов, буква и цифра).
2. `POST /auth/register {email, password, ref_code?}` или `POST /auth/login {email, password}`. Ошибки: `email_taken` (409) — клиент сам переключается на вход; `invalid_credentials` (401) — одно сообщение и для неизвестного e-mail, и для неверного пароля.
3. Сервер: хэш пароля (argon2 или bcrypt), запись в `users` с пустым `nickname`; если пришёл `ref_code` — сохраняет `referred_by`. Не больше 5 попыток входа в минуту на e-mail и IP (счётчик в Redis).
4. Ответ: `{access, refresh, user}`. Refresh — в SecureStore, access — в памяти.
5. Ника нет → экран никнейма: `PUT /me/nickname {nickname}`. Ник уникален без учёта регистра (индекс на `lower(nickname)`), занятый → `nickname_taken` (409). При входе в аккаунт с ником этот шаг пропускается.
6. Переход на карту. «Nie pamiętasz hasła?» → `POST /auth/password-reset {email}` шлёт письмо со ссылкой; в демо это заглушка.

### 2. Вкладка «Карта»

1. `expo-location`: запрос разрешения → текущие координаты.
2. `GET /places/nearby?lat=…&lng=…&radius=2000`.
3. Сервер: PostGIS `ST_DWithin(geom, точка, 2000)` + `LEFT JOIN finds` для текущего игрока → у каждого места статус «найдено / не найдено».
4. Ответ: список маркеров. Для ненайденных мест лучше отдавать не точную точку, а зону (центр со смещением + радиус), иначе карта сама подскажет ответ — это игровое решение, его стоит принять явно.
5. Клиент перезапрашивает список, когда игрок сдвинулся больше чем на \~200 м.

### 3. Тап по месту → «Начать задание»

1. `GET /tasks/{id}` → загадка, архивное фото (ссылка на CDN), число подсказок, текущая возможная награда. Тексты подсказок не отдаются.
2. Кнопка «Начать» → `POST /tasks/{id}/rounds`.
3. Сервер создаёт раунд в `task_rounds`: `hints_used = 0`, `reward_points = base_reward_points`. Если активный раунд уже есть — возвращает его (повторный тап безопасен).
4. Экран задания показывает загадку, кнопки «Подсказка» и «Сфотографировать».

### 4. «Подсказка»

1. Диалог подтверждения: «Награда за раунд уменьшится со 100 до 70 очков».
2. `POST /rounds/{id}/hints` + `Idempotency-Key`.
3. Сервер в транзакции: блокирует строку раунда (`SELECT … FOR UPDATE`), проверяет, что подсказки ещё есть, увеличивает `hints_used`, уменьшает `reward_points` (не ниже минимума).
4. Баланс игрока не трогается — меняется только награда раунда.
5. Ответ: `{hint_text, reward_points}` → клиент показывает подсказку и новую награду.

### 5. «Сфотографировать» — главный сценарий

Проверка асинхронная: API сразу отвечает «принято», воркер решает за 1–5 с, клиент опрашивает статус. Гео проверяем до загрузки фото, чтобы не гонять файлы зря.

&#91;embedded content: сценарий «Сфотографировать» · 12 сообщений\]

1. **Съёмка.** `expo-camera` → `takePictureAsync`; `expo-image-manipulator` ужимает до \~1280 px по длинной стороне. Параллельно — координаты с точностью (`accuracy`) и проверка mock-location.
2. **Заявка на попытку.** `POST /rounds/{id}/attempts {lat, lng, accuracy_m, taken_at, mocked}`.
3. **Сервер, быстрые проверки:** раунд активен; лимит попыток не превышен (Redis-счётчик); `mocked = false`; PostGIS `ST_DWithin(place.geom, точка, radius_m)`.
   - Далеко → `422 {reason: "too_far", distance_m: 140}` → клиент: «Подойди ближе, ты в 140 м».
   - Рядом → запись в `attempts` со статусом `awaiting_upload` + одноразовая ссылка на загрузку (presigned PUT в R2, \~5 мин).
4. **Загрузка фото.** Телефон делает `PUT` прямо в R2 по этой ссылке — через API файл не идёт.
5. **Отправка на проверку.** `POST /attempts/{id}/submit` → API проверяет, что файл в R2 есть (`HEAD`), ставит статус `queued`, кладёт задачу `verify_attempt(id)` в очередь arq (Redis) → ответ `202`.
6. **Воркер:** скачивает фото из R2 → считает эмбеддинг → в pgvector ищет максимальное сходство среди эталонов этого места.
   - Выше верхнего порога → `accepted`.
   - Ниже нижнего → `rejected`.
   - Между → LLM vision сравнивает с эталоном → `accepted` или `rejected`.
7. **Начисление (одна транзакция в Postgres):** `finds` (уникальность `user_id + task_id` защищает от двойного начисления) + запись в `wallet_ledger` на `reward_points` раунда + запись в `xp_ledger` + открытие рилса (`reel_unlocks`) + раунд закрыт. После коммита — `ZINCRBY` в лидерборд Redis; если это первая находка приглашённого игрока — реферальный бонус пригласившему.
8. **Клиент узнаёт результат:** `GET /attempts/{id}` раз в секунду, до \~15 с (позже можно заменить на WebSocket или push).
   - `accepted` → анимация «+XP, +очки» → кнопка «Смотреть рилс».
   - `rejected` → «Не похоже. Попробуй с другого ракурса» + сколько попыток осталось.
9. **Обрыв сети** после загрузки — клиент повторяет `submit`; он идемпотентен, двойной задачи не будет.

### 6. Лента рилсов: «Смотреть», комментарий, «Поделиться»

1. **Открыть ленту** → `GET /reels/feed?cursor=…` → открытые игроку reward-рилсы, публичные и купленные: `playback_url`, «нашли N человек» (`finders_count`). Лайков нет (решение команды 2026-10-11): вместо сердечка показываем число нашедших.
2. **Прокрутка:** `FlatList` с постраничной прокруткой; `onViewableItemsChanged` включает видимое видео и ставит на паузу остальные; следующее предзагружается.
3. **Просмотр засчитан** после \~3 с → `POST /reels/{id}/views` (клиент копит и шлёт пачкой).
4. **Комментарий:** `POST /reels/{id}/comments {text}` → сервер проверяет длину и лимит частоты; список — `GET /reels/{id}/comments?cursor=…`.
5. **Закрытый рилс** (место ещё не найдено) → сервер отдаёт заглушку без `playback_url`; клиент показывает «Найди место, чтобы открыть».
7. **«Поделиться»** → `GET /tasks/{id}/share-link` → ссылка вида `https://<домен>/t/{task_id}?ref={код}` → системное меню `Share.share()`.
   - У друга есть приложение → deep link (`expo-linking`) открывает задание.
   - Нет → страница загрузки; код из ссылки уходит в `ref_code` при регистрации.

### 7. Мини-игра дома («раз в день»)

1. `GET /daily-game` → вопросы на сегодня без правильных ответов (набор зависит от даты и одинаков для всех). Уже играл → ответ с прошлым результатом, кнопка неактивна.
2. «Начать» → `POST /daily-game/start` → сервер фиксирует `started_at` для лимита времени.
3. «Отправить ответы» → `POST /daily-game/answers {answers}`.
4. Сервер проверяет ответы сам, ограничение `UNIQUE(user_id, date)` не даёт сыграть второй раз; начисляет уменьшенные очки в `wallet_ledger`.
5. Ответ: результат + правильные ответы → экран итогов.

### 8. Вкладка «Лидерборд»

1. `GET /leaderboard?scope=week|all`.
2. Сервер: Redis `ZREVRANGE leaderboard:{scope} 0 49 WITHSCORES` + `ZREVRANK` для текущего игрока → ники берутся из Postgres (или из кэша).
3. Недельный ключ сбрасывается по расписанию; если Redis потерялся — топ пересчитывается из `xp_ledger`.

### 9. Магазин: «Купить»

1. `GET /shop/items` → товары и цены (подсказки, публичные рилсы, предложения партнёров) + текущий баланс.
2. Диалог «Купить за 50 очков?» → `POST /shop/purchases {item_id}` + `Idempotency-Key`.
3. Сервер в транзакции: блокирует строку игрока (`SELECT … FROM users WHERE id = … FOR UPDATE`), считает баланс по `wallet_ledger`.
   - Не хватает → `409 {reason: "insufficient_points"}`.
   - Хватает → `purchases` + запись `-50` в `wallet_ledger` + выдача товара (открытый рилс, подсказка без штрафа, код партнёра).
4. Ответ: новый баланс и товар → клиент обновляет кэш `/me`.
5. Блокировка строки игрока нужна, чтобы две быстрые покупки не ушли в минус.

### Сводка эндпоинтов

| Метод и путь | Что делает | Пишет в БД |
| --- | --- | --- |
| `POST /auth/register`, `/auth/login`, `/auth/refresh` | Вход, токены | `users` |
| `PUT /me/nickname` | Второй шаг регистрации: ник, проверка уникальности | `users` |
| `POST /auth/password-reset` | Письмо со ссылкой сброса пароля (в демо заглушка) | — |
| `GET /me` | Профиль, баланс, XP | — |
| `GET /places/nearby` | Места рядом (PostGIS) | — |
| `GET /tasks/{id}`, `POST /tasks/{id}/rounds` | Задание, старт раунда | `task_rounds` |
| `POST /rounds/{id}/hints` | Подсказка, награда раунда уменьшается | `task_rounds` |
| `POST /rounds/{id}/attempts` | Гео-проверка, ссылка на загрузку | `attempts` |
| `POST /attempts/{id}/submit`, `GET /attempts/{id}` | Постановка в очередь, статус | `attempts`; воркер — `finds`, журналы, `reel_unlocks` |
| `GET /reels/feed`, `POST /reels/{id}/views` | Лента, просмотры | `reel_views` |
| `POST /reels/{id}/comments` | Комментарий | `reel_comments` |
| `GET /tasks/{id}/share-link` | Реферальная ссылка | — |
| `GET /daily-game`, `POST /daily-game/start`, `POST /daily-game/answers` | Мини-игра | `daily_game`, `wallet_ledger` |
| `GET /leaderboard` | Топ из Redis | — |
| `GET /shop/items`, `POST /shop/purchases` | Магазин | `purchases`, `wallet_ledger` |

## Деплой: от простого к сложному

Для хакатона — **уровень 2 (Railway)** или **уровень 3 (Hetzner + Coolify)**; оба запускают тот же `docker-compose`, что и у вас локально. Уровень 1 на демо рискован из-за холодного старта.

| Уровень | Как | Цена (10.10.2026) | Подходит для | Подводные камни |
| --- | --- | --- | --- | --- |
| 0. Локально + туннель | `docker compose up` (api, worker, postgres с PostGIS и pgvector, redis, minio) + cloudflared / ngrok | $0 | Разработка, запасной план на демо | Демо зависит от ноутбука и Wi-Fi площадки |
| 1. [Render](https://render.com/docs/free) Free | Web service из GitHub + бесплатный Postgres | $0 | Пробный запуск | Засыпает после 15 мин без трафика, просыпается ≈1 мин; бесплатная БД 1 ГБ удаляется через 30 дней |
| 2. [Railway](https://docs.railway.com/pricing) | Сервисы из GitHub или Docker-образов, том для БД | Trial: разовые $5; Hobby $5/мес с $5 использования | **Хакатон**, первые недели после | Стандартный Postgres без pgvector — нужен свой образ с PostGIS + pgvector |
| 3. VPS [Hetzner](https://www.hetzner.com/cloud) + [Coolify](https://www.localtonet.com/blog/how-to-self-host-coolify) | Один сервер, Coolify как свой PaaS: деплой по git push, Let's Encrypt, бэкапы БД | CX23 (2 vCPU, 4 ГБ): ≈€4–6/мес — в 2026 цены дважды повышались, сверьте на сайте | **Хакатон и пилот** | Администрирование на вас: обновления, мониторинг, бэкапы |
| 4. [Fly.io](https://fly.io/docs/about/pricing/) | Machines по регионам, scale-to-zero | Без бесплатного уровня для новых аккаунтов; Managed Postgres от $38/мес | Глобальная аудитория | Сложнее ценообразование и настройка |
| 5. Kubernetes (k3s на Hetzner или managed k8s) | Отдельные сервисы, автоскейлинг ML-воркера, managed Postgres, CDN | От десятков евро в месяц | Только вариант D и реальный рост | Требует отдельного DevOps-времени |

**Мобилка — тоже от простого к сложному:**

1. Expo Go — если нет кастомных нативных модулей.
2. Development build / внутренний APK через [EAS Build](https://docs.expo.dev/billing/plans/): бесплатный план — ограниченное число сборок в месяц в очереди низкого приоритета.
3. EAS Update — горячие фиксы JS без пересборки, прямо во время хакатона.
4. TestFlight и Google Play internal testing — после хакатона; для iOS нужен платный аккаунт Apple Developer.

На демо держите уровень 0 поднятым как резерв и заранее установленный APK на телефонах команды.

## План на хакатон

Сроки по регламенту: onepager на диск до 8:00, финальная версия проекта до 12:00. Поэтому порядок такой: сначала сквозной сценарий на заглушках, потом настоящие проверки.

**Роли на 4 человека:**

| Роль | Зона | Где пишет код |
| --- | --- | --- |
| A — бэкенд, лидер | FastAPI: auth, задания, находки, журналы очков и XP, магазин, SQLAdmin; Docker Compose, деплой, R2 | `api/`, `docker/`, `docker-compose.yml`, `.env.example` |
| B — мобилка 1 | Экраны Expo игрового цикла: вход, карта, задание, камера, результат, демо-режим; сборка APK | `mobile/`: экраны цикла, каркас навигации, `src/api/` |
| C — ML | Воркер распознавания, эталонные фото, пороги, LLM-судья; места, задания и подсказки | `worker/`; в `content/` — `fetch_places.py`, `add_refs` |
| D — мобилка 2 | Экраны Expo: лента рилсов, награда, профиль, лидерборд, магазин, обучение; генерация рилсов | `mobile/`: экраны контента; в `content/` — `generate_reel.py` |

Подробное распределение по шагам и общие файлы — в документе «план работ на 4 человек».

**Чек-лист по порядку:**

- [ ] Договориться о контракте API (OpenAPI) и сгенерировать TS-клиент
- [ ] Поднять `docker compose`: api, worker, postgres + PostGIS + pgvector, redis, minio
- [ ] Сквозной сценарий на заглушке: фото → «засчитано» → начисление → рилс открыт
- [ ] Геозона PostGIS и фото только из камеры
- [ ] Эталонные фото для 5–10 мест демо-маршрута, эмбеддинги в pgvector
- [ ] Пороги на своих тестовых снимках; LLM-судья для серой зоны
- [ ] Рилсы: пережатые MP4 в R2, лента с предзагрузкой
- [ ] Лидерборд в Redis, магазин подсказок
- [ ] Деплой (Railway или Hetzner + Coolify), APK на телефонах команды
- [ ] Слайд архитектуры: вариант B как есть + вариант D как целевая схема

**Что спросят на Q&A — подготовьте ответ каждому:** почему монолит, а не микросервисы; как защищаетесь от подделки GPS; почему pgvector, а не отдельная векторная БД; как считаются очки при одновременных покупках; что будет при 10 000 игроков.

## Источники

Цены сверены 10.10.2026; облачные тарифы меняются, перед оплатой проверьте на сайте провайдера.

- Видео: [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/) · [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/) · [Bunny Stream pricing](https://bunny.net/pricing/stream/) · [Bunny Stream docs: pricing](https://docs.bunny.net/stream/pricing) · [Mux Free Plan](https://www.mux.com/docs/changelog/video-free-plan) · [Mux pricing](https://mux.com/pricing.html) · [Supabase pricing 2026 (обзор)](https://focusreactive.com/blog/supabase-price/)
- Клиент видео: [Performant vertical feed in Expo: HLS caching on iOS](https://geekyants.com/blog/performant-vertical-feed-in-expo-hls-caching-on-ios)
- Распознавание: [Google Cloud Vision pricing](https://cloud.google.com/vision/pricing) · [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) · [AnyLoc: universal visual place recognition (DINOv2)](https://huggingface.co/papers/2308.00688) · [EffoVPR (DINOv2 для VPR)](https://arxiv.org/html/2405.18065v2) · [LightGlue](https://github.com/cvg/LightGlue) · [vismatch / image-matching-models](https://pypi.org/project/vismatch/) · [CLIP + pgvector + FastAPI](https://dev.to/mattfergoda/ai-powered-image-search-with-clip-pgvector-and-fast-api-1f1d) · [react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite)
- Античит: [jail-monkey](https://classic.yarnpkg.com/en/package/jail-monkey) · [react-native-turbo-mock-location-detector](https://npmjs.com/package/react-native-turbo-mock-location-detector)
- Деплой: [Railway pricing](https://docs.railway.com/pricing) · [Railway: pgvector template](https://docs.railway.com/guides/rag-pipeline-pgvector.md) · [Render free tier](https://render.com/docs/free) · [Hetzner Cloud цены после повышения 2026](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans) · [Coolify self-hosting guide](https://www.localtonet.com/blog/how-to-self-host-coolify) · [Fly.io pricing 2026 (обзор)](https://temps.sh/blog/fly-io-pricing-2026) · [Expo EAS plans](https://docs.expo.dev/billing/plans/) · [Expo pricing](https://expo.dev/pricing)
- Задание и критерии: Zadanie główne BEST Hacks 2026 (файл проекта)

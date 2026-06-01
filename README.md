# Pčelinjak Aplikacija

A cross-platform mobile application for managing a commercial beekeeping operation, built with React Native and Expo. Designed around a real-world setup of 100–250 hives across multiple locations, with Supabase as the backend, full auth, OTA updates, and a Vitest test suite.

## Features

**Hive management**
- Hierarchical data: locations → rows → hives
- Add, edit, and track individual hives with notes and history
- Feeding and harvest date tracking per hive
- Custom timer for queen boxes with maturity checks

**Queens & nuclei**
- Queen registry with race, status, and productivity tracking
- Queen box management with 25-day development cycle
- Statuses: developing, mature, mated, laying, retired
- Races: krajinska, Italian, Buckfast, Caucasian, hybrid
- Nuclei tracking: developing, ready, for-sale, sold, merged

**Operations**
- Sales, expenses, and income tracking
- Pollen harvest logging
- Notes system across all entity types

**Technical**
- Supabase backend with RLS — auth-gated data access
- PKCE auth flow via Expo AuthSession
- OTA updates via EAS Update
- Vitest + React Testing Library test suite
- i18n support
- Custom AppText component with font scaling cap

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Navigation | Expo Router + React Navigation |
| Backend | Supabase (PostgreSQL + Auth) |
| Storage | AsyncStorage |
| Testing | Vitest + React Testing Library |
| OTA Updates | EAS Update |
| Animations | React Native Reanimated |

## Database

14 Supabase tables with RLS policies:

`locations`, `hive_rows`, `hives`, `hive_notes`, `hive_feeding_dates`, `hive_harvest_dates`, `queens`, `queen_box_rows`, `queen_boxes`, `nuclei`, `sales`, `sale_items`, `expenses`, `incomes`

All tables use UUID primary keys with `user_id` FK to `auth.users`.

## Getting Started

**1. Clone the repo**
```bash
git clone https://github.com/MilosLjubojevic/PcelinjakAplikacija.git
cd PcelinjakAplikacija
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file in the root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**4. Start the app**
```bash
npm start          # Expo Go / development build
npm run android    # Android emulator
npm run ios        # iOS simulator
```

## Project Structure

```
app/              # Expo Router screens
components/       # Reusable UI components
services/         # Supabase data access layer (supabaseService.ts)
hooks/            # Custom React hooks
types/            # TypeScript type definitions
utils/            # Supabase client, mappers, helpers
constants/        # Design tokens, dev mode flags
__tests__/        # Vitest test suite
```

## Scripts

```bash
npm start                # Start Expo dev server
npm run android          # Run on Android
npm run ios              # Run on iOS
npm test                 # Run tests
npm run test:coverage    # Test coverage report
npm run eas:update       # Push OTA update via EAS
```

## Author

**Miloš Ljubojević** — [github.com/MilosLjubojevic](https://github.com/MilosLjubojevic) · [LinkedIn](https://www.linkedin.com/in/milos-ljubojevic-7b2a3a216)

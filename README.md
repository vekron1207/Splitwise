# Splitwise Clone

A full-stack expense splitting app with a Spring Boot REST API, Next.js web frontend, and React Native mobile app.

## Project Structure

```
SplitwiseClone/
├── backend/      Spring Boot 4 REST API (Java 21, PostgreSQL)
├── frontend/     Next.js 16 web app (React, Tailwind CSS, TypeScript)
└── mobile/       Expo React Native app (iOS + Android)
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Java JDK | 21+ | Backend |
| Maven | 3.9+ | Backend build |
| Node.js | 20+ | Frontend & Mobile |
| npm | 10+ | Package manager |

---

## Backend (`/backend`)

### Tech Stack
- Spring Boot 4, Spring Security 6, JPA/Hibernate
- PostgreSQL (via Supabase or local)
- JWT authentication

### Setup

1. **Configure database** in `backend/src/main/resources/application.properties`:

   **Option A — Supabase (cloud, recommended):**
   ```properties
   spring.datasource.url=jdbc:postgresql://db.YOUR_PROJECT.supabase.co:5432/postgres
   spring.datasource.username=postgres
   spring.datasource.password=YOUR_DB_PASSWORD
   ```

   **Option B — Local PostgreSQL:**
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/Splitwise
   spring.datasource.username=postgres
   spring.datasource.password=your_password
   ```

2. **Run the backend:**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   The API starts at `http://localhost:8080`.

   On Windows, use `mvnw.cmd spring-boot:run` if `./mvnw` doesn't work.

3. **Build JAR (for deployment):**
   ```bash
   cd backend
   ./mvnw clean package -DskipTests
   java -jar target/splitwise-0.0.1-SNAPSHOT.jar
   ```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/groups` | List user's groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/{id}/expenses` | List expenses |
| POST | `/api/groups/{id}/expenses` | Add expense |
| GET | `/api/groups/{id}/balances/simplified` | Simplified debts |
| POST | `/api/groups/{id}/settlements` | Settle a debt |
| GET | `/api/users/balance-summary` | Dashboard totals |
| GET | `/api/users/search?q=name` | Search users |

All endpoints except auth require `Authorization: Bearer <JWT>` header.

### Environment Variables (for deployment)

```
DATABASE_URL      jdbc:postgresql://...
DATABASE_USERNAME postgres
DATABASE_PASSWORD your_password
```

---

## Frontend (`/frontend`)

### Tech Stack
- Next.js 16, React 19, TypeScript
- Tailwind CSS v4, glassmorphism dark theme
- Zustand (auth store), React Query (server state)

### Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API URL** in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

### Notes
- The backend must be running before the frontend can function.
- Dark theme, mobile-first responsive design.
- `frontend/lib/api.ts` — all API calls are centralized here.

---

## Mobile (`/mobile`)

### Tech Stack
- Expo SDK 55, React Native 0.83.2
- expo-router (file-based routing)
- Zustand + AsyncStorage (auth), React Query (data fetching)
- Axios (HTTP client)

### Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install --legacy-peer-deps
   ```

2. **Configure backend URL** in `mobile/lib/api.ts`:
   ```ts
   // Android emulator → use this:
   export const BASE_URL = 'http://10.0.2.2:8080'

   // Physical device on same WiFi → use your PC's local IP:
   export const BASE_URL = 'http://192.168.x.x:8080'

   // Deployed backend → use the public URL:
   export const BASE_URL = 'https://your-api.example.com'
   ```

3. **Run on device / emulator (Expo Go):**
   ```bash
   npx expo start
   ```
   - Scan the QR code with **Expo Go** (Android/iOS app store).
   - Press `a` for Android emulator, `i` for iOS simulator.

### Building an APK (Android)

EAS Build compiles the app in the cloud — no Android Studio needed.

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to Expo:**
   ```bash
   eas login
   ```

3. **Initialize project (first time only):**
   ```bash
   cd mobile
   eas project:init
   ```

4. **Build the APK:**
   ```bash
   eas build --platform android --profile preview
   ```
   When finished, EAS provides a download link for the `.apk` file.
   Install it directly on any Android device (enable "Install from unknown sources" in settings).

5. **Build for iOS (simulator only, no Apple account needed):**
   ```bash
   eas build --platform ios --profile preview
   ```

### Notes
- `mobile/metro.config.js` contains a custom resolver that forces `react-native-screens`
  to use its compiled output instead of TypeScript source files (SDK 55 + RN 0.83 compatibility fix).
- `mobile/.npmrc` sets `legacy-peer-deps=true` for EAS cloud builds.
- `mobile/app/` uses expo-router file-based routing — add new screens as files.

---

## Running Everything Together

```bash
# Terminal 1 — backend
cd backend && ./mvnw spring-boot:run

# Terminal 2 — web frontend
cd frontend && npm run dev

# Terminal 3 — mobile (Expo Go)
cd mobile && npx expo start
```

---

## Database Schema

Managed by Hibernate (`ddl-auto=update`) — tables are created/updated automatically on first run.

| Table | Description |
|-------|-------------|
| `users` | Accounts |
| `groups` | Expense groups |
| `group_members` | Group membership + roles |
| `expenses` | Individual expenses |
| `splits` | Per-user share of each expense |
| `settlements` | Debt settlement records |
| `attachments` | Expense receipt uploads |

---

## Features

- User registration and JWT login
- Create groups, add/remove members
- Add expenses with equal, exact, or percentage splits
- Auto-calculated balances with debt simplification algorithm
- Settle debts between members
- Dashboard with net balance summary
- Search users by name/email when adding to groups
- File attachment support for expense receipts
- Dark glassmorphism UI (web)
- Native mobile UI matching the web design

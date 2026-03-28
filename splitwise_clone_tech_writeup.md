# Splitwise Clone (Friends-Only) — Full Technical Write-up

## Overview

This project is a **Splitwise-like expense sharing application** designed specifically for a **closed group of friends**.
Unlike traditional fintech apps, this system **does not handle payments** — it only tracks who owes whom and simplifies debts.

The system will:
- Track shared expenses
- Calculate balances
- Simplify debts
- Provide analytics and history

---

## System Architecture

```
Mobile App (React Native)
        ↓
API Layer (Spring Boot)
        ↓
Service Layer (Business Logic)
        ↓
Persistence Layer (JPA/Hibernate)
        ↓
PostgreSQL Database
```

---

## Tech Stack

### Backend
- Java 17+
- Spring Boot
- Spring Security (JWT)
- Hibernate / JPA
- Lombok + MapStruct

### Database
- PostgreSQL

### DevOps
- Docker (Dockerfile + docker-compose)
- AWS / Render / Railway (deployment)
- Flyway (DB migrations)

### Mobile
- React Native (Expo) — iOS + Android
- React Navigation v6
- Zustand (state management)
- Axios (HTTP client)
- expo-secure-store (token persistence)

---

## Core Features

### 1. Authentication
- JWT-based login/signup
- BCrypt password hashing
- Optional Google OAuth (future)

### 2. Groups
- Create group
- Add/remove members
- Group roles: ADMIN | MEMBER

### 3. Expenses
- Add expense with title, description, category
- Split types:
  - Equal — amount divided equally among selected members
  - Exact — each member's share is specified manually
  - Percentage — each member gets a % of the total (must sum to 100)

### 4. Balances
- Compute net balances dynamically from splits and settlements
- "A owes B ₹X"

### 5. Debt Simplification
- Reduce number of transactions using greedy algorithm
- Optimize settlements

### 6. Settlement (Manual)
- Record a payment between two users
- Recalculates net balances
- No payment gateway integration

---

## Implementation Phases

### Phase 1 — Backend Foundation (Week 1)
- [ ] Initialize Spring Boot project, configure PostgreSQL connection
- [ ] Create all JPA entities and run schema DDL
- [ ] Implement `UserRepository`, `GroupRepository`, `GroupMemberRepository`
- [ ] Implement signup and login with BCrypt + JWT issuance
- [ ] Secure all non-auth routes with `JwtAuthFilter`
- [ ] Unit tests for `JwtUtil`

### Phase 2 — Groups and Members (Week 1–2)
- [ ] `GroupService`: create group, fetch groups for user, add member by email, remove member
- [ ] Authorization: only members can read; only admin can mutate membership
- [ ] Integration tests for group endpoints

### Phase 3 — Expense Engine (Week 2–3)
- [ ] `ExpenseService`: create, read, update, soft-delete
- [ ] Split calculation for all three split types
- [ ] `@ValidSplits` custom validator on `CreateExpenseRequest`
- [ ] `BalanceService`: compute net balances dynamically from splits + settlements
- [ ] Unit tests for split calculation (especially PERCENTAGE rounding edge cases)

### Phase 4 — Debt Simplification and Settlements (Week 3)
- [ ] `DebtSimplificationService`: greedy algorithm using `PriorityQueue`
- [ ] `SettlementService`: insert settlement, re-query balances
- [ ] Settlement endpoints
- [ ] Unit tests with at least 5 scenarios (2-person, 3-person, already balanced, circular debts, etc.)

### Phase 5 — React Native App (Week 4–5)
- [ ] Initialize Expo project, install React Navigation, Zustand, Axios
- [ ] Build `authStore`, `apiClient.ts`, login/signup screens
- [ ] Build group list, group detail, add expense screens
- [ ] Build balances and simplified debt screens
- [ ] Build settlement modal
- [ ] Wire `expo-secure-store` for token persistence

### Phase 6 — Integration, Polish, Deployment (Week 6)
- [ ] End-to-end test: signup → group → expenses (all 3 split types) → balances → settle → verify zero balance
- [ ] Dockerize backend (`Dockerfile` + `docker-compose.yml` with Postgres service)
- [ ] Deploy backend to Render or Railway
- [ ] Configure production JWT secret and DB URL via env vars
- [ ] Expo EAS Build for TestFlight (iOS) / internal track (Android)

---

## Database Schema

### Full DDL

```sql
-- USERS
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    avatar_url    VARCHAR(500),
    created_at    TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT now()
);

-- GROUPS
CREATE TABLE groups (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_by  BIGINT       NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now()
);

-- GROUP_MEMBERS
CREATE TABLE group_members (
    id        BIGSERIAL PRIMARY KEY,
    group_id  BIGINT      NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id   BIGINT      NOT NULL REFERENCES users(id),
    role      VARCHAR(20) NOT NULL DEFAULT 'MEMBER',  -- ADMIN | MEMBER
    joined_at TIMESTAMP   NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

-- EXPENSES
CREATE TABLE expenses (
    id          BIGSERIAL PRIMARY KEY,
    group_id    BIGINT         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by     BIGINT         NOT NULL REFERENCES users(id),
    title       VARCHAR(200)   NOT NULL,
    description VARCHAR(500),
    amount      NUMERIC(12,2)  NOT NULL CHECK (amount > 0),
    split_type  VARCHAR(20)    NOT NULL,   -- EQUAL | EXACT | PERCENTAGE
    category    VARCHAR(50),              -- FOOD | TRAVEL | UTILITIES | ACCOMMODATION | OTHER
    is_deleted  BOOLEAN        NOT NULL DEFAULT false,
    created_at  TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP      NOT NULL DEFAULT now()
);

-- SPLITS
CREATE TABLE splits (
    id         BIGSERIAL PRIMARY KEY,
    expense_id BIGINT        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id    BIGINT        NOT NULL REFERENCES users(id),
    amount     NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    percentage NUMERIC(5,2),   -- populated only when split_type = PERCENTAGE
    UNIQUE (expense_id, user_id)
);

-- SETTLEMENTS
CREATE TABLE settlements (
    id         BIGSERIAL PRIMARY KEY,
    group_id   BIGINT        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by    BIGINT        NOT NULL REFERENCES users(id),  -- who paid
    paid_to    BIGINT        NOT NULL REFERENCES users(id),  -- who received
    amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    note       VARCHAR(300),
    created_at TIMESTAMP     NOT NULL DEFAULT now()
);

-- BALANCE_CACHE (optional — use for performance at scale)
-- Stores net balance between any two users in a group.
-- Recomputed after each expense/settlement write.
-- Invariant: user_a < user_b to avoid duplicate rows.
CREATE TABLE balance_cache (
    id           BIGSERIAL PRIMARY KEY,
    group_id     BIGINT        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_a       BIGINT        NOT NULL REFERENCES users(id),
    user_b       BIGINT        NOT NULL REFERENCES users(id),
    net_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP     NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_a, user_b)
);
```

### Java Enums

```java
// SplitType.java
public enum SplitType { EQUAL, EXACT, PERCENTAGE }

// GroupRole.java
public enum GroupRole { ADMIN, MEMBER }

// ExpenseCategory.java
public enum ExpenseCategory { FOOD, TRAVEL, UTILITIES, ACCOMMODATION, OTHER }
```

---

## Backend Project Structure

```
com.splitwise
├── SplitWiseApplication.java
│
├── config/
│   ├── SecurityConfig.java           # Filter chain, CORS, stateless session
│   ├── JwtConfig.java                # JWT secret and expiry constants
│   └── ApplicationConfig.java        # PasswordEncoder bean, AuthenticationManager bean
│
├── security/
│   ├── JwtUtil.java                  # generateToken(), validateToken(), extractClaims()
│   ├── JwtAuthFilter.java            # OncePerRequestFilter — reads header, sets context
│   └── UserDetailsServiceImpl.java   # loadUserByUsername() — queries DB
│
├── controller/
│   ├── AuthController.java
│   ├── GroupController.java
│   ├── ExpenseController.java
│   ├── BalanceController.java
│   └── SettlementController.java
│
├── service/
│   ├── AuthService.java
│   ├── GroupService.java
│   ├── ExpenseService.java
│   ├── BalanceService.java
│   ├── DebtSimplificationService.java
│   └── SettlementService.java
│
├── repository/
│   ├── UserRepository.java
│   ├── GroupRepository.java
│   ├── GroupMemberRepository.java
│   ├── ExpenseRepository.java
│   ├── SplitRepository.java
│   └── SettlementRepository.java
│
├── entity/
│   ├── User.java
│   ├── Group.java
│   ├── GroupMember.java
│   ├── Expense.java
│   ├── Split.java
│   └── Settlement.java
│
├── dto/
│   ├── request/
│   │   ├── SignupRequest.java
│   │   ├── LoginRequest.java
│   │   ├── CreateGroupRequest.java
│   │   ├── AddMemberRequest.java
│   │   ├── CreateExpenseRequest.java
│   │   └── SettleDebtRequest.java
│   └── response/
│       ├── AuthResponse.java
│       ├── GroupResponse.java
│       ├── ExpenseResponse.java
│       ├── BalanceResponse.java
│       ├── SimplifiedDebtResponse.java
│       └── SettlementResponse.java
│
├── enums/
│   ├── SplitType.java
│   ├── GroupRole.java
│   └── ExpenseCategory.java
│
└── exception/
    ├── GlobalExceptionHandler.java   # @ControllerAdvice
    ├── ResourceNotFoundException.java
    ├── UnauthorizedException.java
    ├── InvalidSplitException.java
    └── ApiError.java                 # Standard error response body
```

---

## Backend Dependencies (pom.xml)

```xml
<!-- Core starters -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Database -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- JWT (jjwt 0.12.x) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>

<!-- Utilities -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.5.5.Final</version>
</dependency>

<!-- Testing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

---

## JWT Implementation

### application.properties

```properties
app.jwt.secret=<256-bit-base64-encoded-secret>
app.jwt.expiration-ms=86400000        # 24 hours
app.jwt.refresh-expiration-ms=604800000  # 7 days (if refresh tokens added later)
```

### JwtUtil Responsibilities

- `generateToken(UserDetails)` — builds a signed HS256 JWT; subject = email, custom claim `userId`, issued-at, expiry
- `validateToken(String token, UserDetails)` — checks signature, expiry, subject match
- `extractEmail(String token)` — parses subject claim
- `extractUserId(String token)` — parses custom `userId` claim

### JwtAuthFilter Flow (per request)

1. Read `Authorization` header; skip if absent or not `Bearer `.
2. Extract token string.
3. Extract email from token.
4. If email is non-null and `SecurityContextHolder` has no auth yet: load `UserDetails`, validate, set `UsernamePasswordAuthenticationToken` in context.
5. Call `filterChain.doFilter()`.

### SecurityConfig Rules

- Permit all: `POST /api/auth/signup`, `POST /api/auth/login`
- Require authentication: all other `/api/**` routes
- Disable CSRF (stateless API)
- Stateless session management (`SessionCreationPolicy.STATELESS`)
- Add `JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`

---

## API Reference

All routes are prefixed `/api`. All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | /api/auth/signup | No | `{name, email, password}` | `{token, userId, name, email}` |
| POST | /api/auth/login | No | `{email, password}` | `{token, userId, name, email}` |
| GET | /api/auth/me | Yes | — | `{userId, name, email, avatarUrl}` |

### Groups

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | /api/groups | Yes | `{name, description}` | GroupResponse |
| GET | /api/groups | Yes | — | `List<GroupResponse>` (caller's groups) |
| GET | /api/groups/{groupId} | Yes | — | GroupResponse |
| PUT | /api/groups/{groupId} | Yes (admin) | `{name, description}` | GroupResponse |
| DELETE | /api/groups/{groupId} | Yes (admin) | — | 204 |
| POST | /api/groups/{groupId}/members | Yes (admin) | `{email}` | GroupResponse |
| DELETE | /api/groups/{groupId}/members/{userId} | Yes (admin) | — | 204 |

### Expenses

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | /api/groups/{groupId}/expenses | Yes (member) | CreateExpenseRequest | ExpenseResponse |
| GET | /api/groups/{groupId}/expenses | Yes (member) | — | `Page<ExpenseResponse>` |
| GET | /api/groups/{groupId}/expenses/{expenseId} | Yes (member) | — | ExpenseResponse |
| PUT | /api/groups/{groupId}/expenses/{expenseId} | Yes (payer or admin) | CreateExpenseRequest | ExpenseResponse |
| DELETE | /api/groups/{groupId}/expenses/{expenseId} | Yes (payer or admin) | — | 204 |

**CreateExpenseRequest body:**
```json
{
  "title": "Dinner at Olive",
  "description": "Saturday night dinner",
  "amount": 1200.00,
  "splitType": "EQUAL",
  "category": "FOOD",
  "splits": [
    { "userId": 2, "amount": null, "percentage": null },
    { "userId": 3, "amount": null, "percentage": null }
  ]
}
```
For `EXACT`: each split must have an `amount`. For `PERCENTAGE`: each split must have a `percentage` (must sum to 100).

### Balances and Debt Simplification

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/groups/{groupId}/balances | Yes (member) | Net balances per user pair in the group |
| GET | /api/groups/{groupId}/balances/simplified | Yes (member) | Minimum transactions to settle all debts |
| GET | /api/groups/{groupId}/balances/me | Yes (member) | Caller's net balance vs each other member |

**BalanceResponse item:**
```json
{ "fromUserId": 3, "fromUserName": "Rohan", "toUserId": 1, "toUserName": "Aditya", "amount": 400.00 }
```

### Settlements

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | /api/groups/{groupId}/settlements | Yes (member) | `{paidTo, amount, note}` | SettlementResponse |
| GET | /api/groups/{groupId}/settlements | Yes (member) | — | `List<SettlementResponse>` |

---

## Core Business Logic

### Balance Calculation

For each user pair within a group:
```
net = sum(splits where user is payer) - sum(splits where user owes)
    + sum(settlements paid by user) - sum(settlements paid to user)
```

- Net positive → should receive money
- Net negative → owes money

Computed dynamically from `splits` and `settlements` tables (no denormalized balance stored in MVP).

### Debt Simplification Algorithm

**Goal:** Minimize the number of transactions to settle all debts.

**Approach:**
1. Compute net balance for each user (positive = creditor, negative = debtor).
2. Push all creditors into a max-heap, all debtors into a min-heap (by absolute value).
3. Greedy loop:
   - Pop largest creditor and largest debtor.
   - Transfer `min(creditor.balance, |debtor.balance|)`.
   - Record `SimplifiedDebt(debtor → creditor, amount)`.
   - Re-push any remaining balance back into the appropriate heap.
4. Stop when both heaps are empty.

**Complexity:** O(n log n)

---

## Sequence Diagrams

### Flow 1: Add Expense (EQUAL split)

```
Mobile        API Controller      ExpenseService         DB
  |                |                    |                  |
  |--POST /expenses→|                   |                  |
  |                |--validate JWT      |                  |
  |                |--check membership  |                  |
  |                |--createExpense()-->|                  |
  |                |                   |--INSERT expense-->|
  |                |                   |--calculate equal shares
  |                |                   |--INSERT splits (one per member)-->|
  |                |<--ExpenseResponse--|                  |
  |<--201 Created--|                   |                  |
```

### Flow 2: Debt Simplification

```
Mobile          BalanceController    BalanceService       DebtSimplificationService
  |                   |                   |                         |
  |--GET /balances/simplified-->|         |                         |
  |                   |--getSimplifiedDebts(groupId)-->|            |
  |                   |                   |--queryAllSplits()       |
  |                   |                   |--queryAllSettlements()  |
  |                   |                   |--compute net per user   |
  |                   |                   |--simplify(netMap)------>|
  |                   |                   |       |--maxHeap(creditors)
  |                   |                   |       |--minHeap(debtors)
  |                   |                   |       |--greedy match loop
  |                   |                   |<--List<SimplifiedDebt>--|
  |                   |<--List<SimplifiedDebt>|                     |
  |<--200 OK----------|                   |                         |
```

### Flow 3: Record Settlement

```
Mobile          SettlementController    SettlementService        DB
  |                    |                      |                    |
  |--POST /settlements->|                     |                    |
  |                    |--validate caller is group member          |
  |                    |--recordSettlement()-->|                   |
  |                    |                      |--INSERT settlement->|
  |                    |<--SettlementResponse--|                   |
  |<--201 Created------|                      |                    |
```

---

## Error Handling and Validation

### Standard Error Response Body (ApiError)

```json
{
  "timestamp": "2026-03-28T10:15:30Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Split amounts must sum to total expense amount",
  "path": "/api/groups/1/expenses"
}
```

### GlobalExceptionHandler Mappings

| Exception | HTTP Status | When |
|-----------|------------|------|
| `ResourceNotFoundException` | 404 | Group/expense/user not found |
| `UnauthorizedException` | 403 | Caller is not a group member or not the payer |
| `InvalidSplitException` | 400 | Splits don't sum to expense total; percentage != 100 |
| `MethodArgumentNotValidException` | 400 | Bean validation failures (`@Valid`) |
| `DataIntegrityViolationException` | 409 | Duplicate email on signup |
| `AuthenticationException` | 401 | Bad credentials or missing/expired JWT |
| `Exception` (catch-all) | 500 | Unexpected errors |

### Bean Validation on DTOs

- `@NotBlank`, `@Size(max=200)` on title/name fields
- `@Email` on email fields
- `@NotNull`, `@Positive` on amount fields
- `@NotEmpty` on splits list
- Custom `@ValidSplits` class-level annotation on `CreateExpenseRequest` — verifies amounts/percentages sum correctly per split type

---

## Mobile App: Screens and Navigation

**Navigation library:** React Navigation v6 (Stack + Bottom Tabs)

```
RootNavigator (Stack)
├── AuthStack                     -- shown when no token in SecureStore
│   ├── LoginScreen
│   └── SignupScreen
│
└── AppStack                      -- shown when token exists
    ├── MainTabs (Bottom Tab Navigator)
    │   ├── GroupsTab
    │   │   ├── GroupListScreen       # all groups the user belongs to
    │   │   └── GroupDetailScreen     # expense list + "Add Expense" FAB + balances summary
    │   ├── BalancesTab
    │   │   └── BalancesScreen        # cross-group net balances for the logged-in user
    │   └── ProfileTab
    │       └── ProfileScreen         # name, avatar, logout
    │
    ├── ExpenseDetailScreen           # full details of one expense
    ├── AddExpenseScreen              # form: title, amount, split type, member checkboxes
    ├── EditExpenseScreen             # same form pre-populated
    ├── SimplifiedDebtsScreen         # simplified debt list for a group
    ├── SettleDebtScreen              # mark settlement modal
    └── AddMemberScreen               # add member to group by email
```

### Shared Components

- `CurrencyInput` — formatted numeric input
- `SplitTypePicker` — segmented control (Equal / Exact / Percentage)
- `MemberShareRow` — per-member amount/percentage input row
- `DebtCard` — displays "A owes B ₹X" with Settle button
- `ExpenseListItem` — expense row with category icon, payer, amount

---

## Mobile State Management

**Library:** Zustand (lightweight, no boilerplate)

### Store Slices

```ts
// authStore
state:   { token, userId, name, email }
actions: login(), logout(), loadFromStorage()

// groupStore
state:   { groups: Group[], activeGroupId, loading, error }
actions: fetchGroups(), createGroup(), setActiveGroup()

// expenseStore
state:   { expensesByGroup: Record<groupId, Expense[]>, loading, error }
actions: fetchExpenses(groupId), addExpense(), editExpense(), deleteExpense()

// balanceStore
state:   { rawBalances: Balance[], simplifiedDebts: Debt[], loading }
actions: fetchBalances(groupId), fetchSimplified(groupId)

// settlementStore
state:   { settlementsByGroup: Record<groupId, Settlement[]> }
actions: recordSettlement(), fetchSettlements(groupId)
```

### API Client

A single `apiClient.ts` wraps Axios:
- Attaches `Authorization: Bearer <token>` from `authStore` on every request
- Intercepts 401 responses → calls `authStore.logout()` and navigates to `LoginScreen`

### Token Persistence

`expo-secure-store` persists the JWT across app restarts. On launch, `authStore.loadFromStorage()` reads the token and hydrates the store before the navigator decides which stack to render.

---

## Design Decisions

### 1. No Payment Gateway
- Simplifies system
- No compliance or PCI-DSS requirements

### 2. Compute Balances Dynamically (MVP)
- Avoids cache inconsistency bugs
- Easier to debug
- Add `balance_cache` table only if query performance becomes a problem at scale

### 3. Use DTOs
- Prevent JPA entity exposure
- Clean API responses with MapStruct mappers

### 4. Soft Delete Expenses
- `is_deleted = true` instead of hard delete
- Preserves audit trail and balance history

### 5. EQUAL Split Rounding
- Divide total by member count using `BigDecimal.HALF_UP`
- Assign any remainder (1 cent) to the first split to ensure splits sum exactly to total

---

## Security

- JWT Authentication (HS256, 24h expiry)
- BCrypt password hashing (strength 12)
- Input validation with `@Valid` on all request bodies
- Group membership check on every group-scoped endpoint
- Rate limiting (future — Spring Cloud Gateway or Bucket4j)

---

## Scalability Considerations

- Cache balances in `balance_cache` table (or Redis) for large groups
- Paginate expense lists (`Page<T>` with Pageable)
- Async processing for notification delivery (future)

---

## Testing

### Backend
- Unit tests (JUnit 5) — `ExpenseService`, `DebtSimplificationService`, `JwtUtil`
- Integration tests (Spring Boot Test + H2) — all controller endpoints
- API testing — Postman collection

### Key Unit Test Cases for DebtSimplificationService
1. Two users — A owes B (trivial case)
2. Three users — circular debt (A→B→C→A)
3. All users already balanced
4. One large creditor, multiple small debtors
5. Floating point / rounding edge case

---

## Deployment

### Docker

```dockerfile
# Dockerfile (backend)
FROM eclipse-temurin:17-jre
COPY target/splitwise-*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: splitwise
      POSTGRES_USER: splitwise
      POSTGRES_PASSWORD: secret
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/splitwise
      APP_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
```

### Production
- Backend: Render or Railway (free tier supports Docker)
- DB: Managed PostgreSQL (Railway or Supabase)
- Mobile: Expo EAS Build → TestFlight (iOS) + internal track (Android)

---

## Future Enhancements

- Receipt OCR (scan and auto-fill expense)
- Push notifications/reminders for pending debts
- Multi-currency support with live FX rates
- Analytics dashboard (spending by category, monthly trends)
- AI-based spending insights
- Google OAuth login
- Recurring expense templates

---

## Learning Outcomes

This project covers:
- System design and layered architecture
- Spring Boot + Spring Security implementation
- JWT authentication flow
- Transaction management and ACID guarantees
- Algorithm design (greedy debt simplification)
- REST API design and error handling
- React Native navigation and state management
- Docker and cloud deployment

---

## Generated On
2026-03-27 19:10:27 (expanded 2026-03-28)

# Platform Microservices Demo — Spring Boot 3 + Keycloak + Redis + PostgreSQL

A production-ready microservice starter that ships with:

- **Spring Boot 3** REST API (Categories + Items CRUD)
- **Keycloak 25** JWT authentication with three roles: `USER`, `SUPPORT`, `ADMIN`
- **Redis 7.2** cache with 3-minute TTL, graceful fallback to in-memory cache
- **PostgreSQL 16** persistent storage with idempotent seed data
- **Bootstrap 5 UI** served by the service with role-based access control
- **Docker Compose** for one-command local startup
- **Kubernetes** manifests for production deployment
- **E2E test script** (`run-e2e.ps1`) to validate the full stack

---

## Repository Layout

```
keyclockdemo/
├── auth-repo/              # Keycloak identity stack
│   ├── docker-compose.yml  # Keycloak + Keycloak-DB containers
│   └── realm-export.json   # Realm, roles, client, seed users
│
├── service-repo/           # Spring Boot microservice
│   ├── src/
│   │   └── main/
│   │       ├── java/       # Controllers, services, entities, configs
│   │       └── resources/
│   │           ├── static/ # Bootstrap SPA (index.html, app.js, style.css)
│   │           └── db/local/data.sql  # Idempotent seed data
│   ├── docker-compose.redis.yml
│   ├── Dockerfile
│   └── pom.xml
│
├── infra-repo/             # Deployment assets
│   ├── docker-compose.yml  # Full local stack
│   └── k8s/                # Kubernetes manifests
│
├── platform-workspace/     # Cross-repo documentation
├── run-e2e.ps1             # End-to-end smoke test
└── README.md               # This file
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Java | 21+ |
| Maven | 3.9+ |
| Docker + Docker Compose | v2+ |
| kubectl | (optional, for Kubernetes) |

---

## Quick Start — Local (5 minutes)

### Step 1 — Start Keycloak

```bash
cd auth-repo
docker compose up -d
```

Keycloak will be available at **http://localhost:8081**  
Admin console: http://localhost:8081/admin (`admin` / `admin`)

Wait ~30 seconds for Keycloak to initialize, then verify:
```bash
curl http://localhost:8081/realms/reusable-realm/.well-known/openid-configuration
```

### Step 2 — Start Redis

```bash
cd service-repo
docker compose -f docker-compose.redis.yml up -d
```

### Step 3 — Start the Service

```bash
cd service-repo
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The service starts on **http://localhost:8080**

### Step 4 — Open the UI

Navigate to **http://localhost:8080** in your browser.  
You will be redirected to the Keycloak login page.

---

## Seed Users & Roles

| Username | Password | Role | Permissions |
|---|---|---|---|
| `user1` | `user1pass` | `USER` | Read-only (GET categories, GET items) |
| `support1` | `support1pass` | `SUPPORT` | Read + Create + Update (no Delete) |
| `admin1` | `admin1pass` | `ADMIN` | Full CRUD including Delete |

> **Note:** On the first run, Keycloak imports the realm and users from `auth-repo/realm-export.json`.  
> On subsequent restarts of the Keycloak *container* (with the DB volume intact), `--import-realm` skips re-import.  
> If you delete the `keycloak_db_data` volume (`docker compose down -v`), the realm is fully re-imported on the next start.

---

## Architecture

```
Browser
  │
  ├─► http://localhost:8080  (Spring Boot — UI + REST API)
  │     • Serves Bootstrap SPA at /
  │     • Validates Bearer JWT from Keycloak
  │     • Checks Redis cache before every DB call
  │     • Falls back to ConcurrentMap cache if Redis is unavailable
  │
  ├─► http://localhost:8081  (Keycloak — Identity Provider)
  │     • Realm: reusable-realm
  │     • Client: reusable-client (public, PKCE)
  │     • Roles: USER / SUPPORT / ADMIN
  │
  ├─► localhost:5432          (PostgreSQL — Data)
  │     • service_db database
  │     • Auto-migrated via Hibernate ddl-auto: update
  │     • Seeded on every start via data.sql (idempotent)
  │
  └─► localhost:6379          (Redis — Cache)
        • TTL: 3 minutes (configurable with CACHE_TTL)
        • Caches: categories, categoryById, items, itemById
```

---

## API Endpoints

### Authentication

Get a Bearer token (password grant, direct test only):
```bash
curl -s -X POST http://localhost:8081/realms/reusable-realm/protocol/openid-connect/token \
  -d "grant_type=password&client_id=reusable-client&username=admin1&password=admin1pass" \
  | jq -r .access_token
```

### Categories

| Method | URL | Role Required |
|---|---|---|
| GET | `/categories` | USER, SUPPORT, ADMIN |
| GET | `/categories/{id}` | USER, SUPPORT, ADMIN |
| POST | `/categories` | SUPPORT, ADMIN |
| PUT | `/categories/{id}` | SUPPORT, ADMIN |
| DELETE | `/categories/{id}` | ADMIN only |

### Items

| Method | URL | Role Required |
|---|---|---|
| GET | `/items` | USER, SUPPORT, ADMIN |
| GET | `/items/{id}` | USER, SUPPORT, ADMIN |
| POST | `/items` | SUPPORT, ADMIN |
| PUT | `/items/{id}` | SUPPORT, ADMIN |
| DELETE | `/items/{id}` | ADMIN only |

### Sample Requests

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/realms/reusable-realm/protocol/openid-connect/token \
  -d "grant_type=password&client_id=reusable-client&username=admin1&password=admin1pass" \
  | jq -r .access_token)

# Create category
curl -X POST http://localhost:8080/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Electronics","description":"Devices and accessories"}'

# Create item
curl -X POST http://localhost:8080/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Wireless Mouse","description":"Ergonomic mouse","price":19.99,"categoryId":1}'

# Get all items
curl http://localhost:8080/items -H "Authorization: Bearer $TOKEN"
```

---

## Redis Cache

| Setting | Value |
|---|---|
| Provider | `redis` (default) or `local` |
| TTL | `3m` (overridden by `CACHE_TTL` env var) |
| Cache names | `categories`, `categoryById`, `items`, `itemById` |
| Error behaviour | Logs WARN and falls through to database — app never fails due to cache |

Switch to in-memory cache (no Redis needed):
```bash
CACHE_PROVIDER=local mvn spring-boot:run -Dspring-boot.run.profiles=local
```

---

## UI Features

- Login via Keycloak PKCE flow (redirects to `http://localhost:8081`)
- Role badge shown in navbar (`USER` / `SUPPORT` / `ADMIN`)
- **USER** — view categories and items (read-only)
- **SUPPORT** — view + create + edit categories and items
- **ADMIN** — full CRUD including Delete buttons
- Toast notifications for all operations
- Auto token refresh (every 15 seconds, renews if expiring in 30s)

---

## Environment Variables

### service-repo (`application-local.yml`)

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `service_db` | Database name |
| `DB_USER` | `service_user` | DB username |
| `DB_PASSWORD` | `service_password` | DB password |
| `JWT_ISSUER_URI` | `http://localhost:8081/realms/reusable-realm` | Keycloak issuer |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `CACHE_TTL` | `3m` | Cache time-to-live |
| `CACHE_PROVIDER` | `redis` | `redis` or `local` |

### auth-repo (`docker-compose.yml`)

| Variable | Default | Description |
|---|---|---|
| `KEYCLOAK_IMAGE_TAG` | `25.0` | Keycloak image version |
| `KEYCLOAK_PORT` | `8081` | Host port for Keycloak |
| `KEYCLOAK_ADMIN` | `admin` | Admin console username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Admin console password |
| `KEYCLOAK_DB_PORT` | `5433` | Host port for Keycloak's DB |

---

## Run Tests

```bash
cd service-repo
mvn test
```

Tests use an in-memory (`local`) cache — no Redis or Keycloak required.

---

## Build Docker Image

```bash
cd service-repo
docker build -t service-template:latest .
```

---

## E2E Smoke Test

Runs the full stack, calls the API as both ADMIN and USER, and verifies role enforcement:

```powershell
.\run-e2e.ps1
```

Options:
```powershell
.\run-e2e.ps1 -Cleanup         # Tear down containers after test
.\run-e2e.ps1 -DryRun          # Print steps without executing
.\run-e2e.ps1 -TimeoutSeconds 300  # Increase wait timeout
```

---

## Kubernetes Deployment

```bash
cd infra-repo
kubectl apply -f k8s/
```

Manifests in `infra-repo/k8s/`:
- `configmap.yaml` — service configuration
- `secret.yaml` — DB credentials
- `postgres-deployment.yaml` / `postgres-service.yaml`
- `keycloak-deployment.yaml` / `keycloak-service.yaml`
- `microservice-deployment.yaml` / `microservice-service.yaml`

---

## Troubleshooting

### "Invalid username or password" on Keycloak login form

1. Verify Keycloak is running: `docker ps | grep keycloak`
2. Test credentials via API:
   ```bash
   curl -s -X POST http://localhost:8081/realms/reusable-realm/protocol/openid-connect/token \
     -d "grant_type=password&client_id=reusable-client&username=user1&password=user1pass"
   ```
3. If the API works but the browser form fails, **clear cookies for `localhost:8081`** or use an incognito window.
4. If the Keycloak volume was deleted and users were re-imported, credentials come from `realm-export.json`.

### `duplicate key value violates unique constraint` on startup

The `data.sql` seed file uses `ON CONFLICT (id) DO UPDATE` — safe to run multiple times.  
If you see this error, your database may have rows inserted with the old `ON CONFLICT (name)` variant. Run:
```sql
TRUNCATE TABLE items, categories RESTART IDENTITY CASCADE;
```
Then restart the service.

### Redis connection refused

```bash
docker compose -f service-repo/docker-compose.redis.yml up -d
```
Or switch to local cache:
```bash
CACHE_PROVIDER=local mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Port conflicts

| Service | Port | Override variable |
|---|---|---|
| Spring Boot | 8080 | `SERVER_PORT` |
| Keycloak | 8081 | `KEYCLOAK_PORT` |
| PostgreSQL (service) | 5432 | `DB_PORT` |
| PostgreSQL (Keycloak) | 5433 | `KEYCLOAK_DB_PORT` |
| Redis | 6379 | `REDIS_PORT` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.x |
| Auth | Keycloak 25 (OIDC / JWT) |
| Cache | Redis 7.2 (fallback: ConcurrentMap) |
| Database | PostgreSQL 16 |
| Build | Maven 3.9 |
| UI | Bootstrap 5.3 + Keycloak JS PKCE |
| Container | Docker Compose v2 |
| Orchestration | Kubernetes |


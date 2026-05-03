# service-repo

Spring Boot 3 microservice template with PostgreSQL, Keycloak JWT auth, Redis cache, and a Bootstrap UI.

## Features

- Layered architecture: `controller` → `service` → `repository` → `entity`
- OAuth2 Resource Server — validates Keycloak JWTs via issuer URI (no Keycloak SDK)
- Role-based access control via `@PreAuthorize` on every endpoint
- **Three roles**: `USER` (read), `SUPPORT` (read+write), `ADMIN` (full CRUD)
- Redis 7.2 cache with 3-minute TTL; graceful fallback to in-memory cache
- Cache-aside pattern with `@Cacheable` / `@CachePut` / `@CacheEvict`
- Bootstrap 5 Single-Page App served from `/` — Keycloak PKCE login, role-aware UI
- Bean validation, global exception handler, structured JSON logging (logback)
- Idempotent seed data loaded on every start (`db/local/data.sql`)
- Docker-ready `Dockerfile` and `docker-compose.redis.yml`

## Run locally

### With Redis (recommended)

```bash
# Terminal 1 — start Redis
docker compose -f docker-compose.redis.yml up -d

# Terminal 2 — start service
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Without Redis (in-memory cache)

```bash
CACHE_PROVIDER=local mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Open **http://localhost:8080** — you will be redirected to Keycloak login.

## Run tests

```bash
mvn test
```

Tests use `app.cache.provider=local` (no Redis or Keycloak required).

## UI

| Role | Access |
|---|---|
| `USER` | View categories and items (read-only tables) |
| `SUPPORT` | View + New / Edit buttons for categories and items |
| `ADMIN` | Full access including Delete buttons |

Role badge and username shown in the top navbar. Token auto-refreshes every 15 seconds.

## API summary

| Method | Path | Min. role |
|---|---|---|
| GET | `/categories`, `/categories/{id}` | USER |
| POST, PUT | `/categories`, `/categories/{id}` | SUPPORT |
| DELETE | `/categories/{id}` | ADMIN |
| GET | `/items`, `/items/{id}` | USER |
| POST, PUT | `/items`, `/items/{id}` | SUPPORT |
| DELETE | `/items/{id}` | ADMIN |

See `curl-examples.md` and `sample-verification.http` for full request examples.

## Redis cache

| Setting | Value / Env var |
|---|---|
| Provider | `CACHE_PROVIDER` — `redis` (default) or `local` |
| TTL | `CACHE_TTL` — default `3m` |
| Redis host | `REDIS_HOST` — default `localhost` |
| Redis port | `REDIS_PORT` — default `6379` |
| On error | Logs WARN, falls through to database — no exception thrown |

## Environment variables (prod profile)

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | ✅ | PostgreSQL host |
| `DB_PORT` | ✅ | PostgreSQL port |
| `DB_NAME` | ✅ | Database name |
| `DB_USER` | ✅ | DB username |
| `DB_PASSWORD` | ✅ | DB password |
| `JWT_ISSUER_URI` | ✅ | Keycloak issuer URI |
| `REDIS_HOST` | ✅ | Redis host |
| `REDIS_PORT` | ✅ | Redis port |
| `CACHE_PROVIDER` | optional | `redis` or `local` |
| `CACHE_TTL` | optional | e.g. `5m`, `30s` |

## Build Docker image

```bash
docker build -t service-template:latest .
```

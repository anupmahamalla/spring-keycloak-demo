# auth-repo

Keycloak identity stack for the platform microservices demo.

## Contents

| File | Purpose |
|---|---|
| `docker-compose.yml` | Keycloak 25 + PostgreSQL (Keycloak's own DB) |
| `realm-export.json` | Realm definition: client, roles, and seed users |

## Start

```bash
docker compose up -d
```

Keycloak is available at **http://localhost:8081**
Admin console: http://localhost:8081/admin (user: `admin`, password: `admin`)

## Realm

- Realm name: `reusable-realm`
- Well-known URL: http://localhost:8081/realms/reusable-realm/.well-known/openid-configuration

## Client

| Property | Value |
|---|---|
| Client ID | `reusable-client` |
| Type | Public (PKCE compatible) |
| Standard Flow | Enabled (browser login) |
| Direct Grant | Enabled (password grant for testing) |
| Redirect URIs | `*` |
| Web Origins | `*` |

## Seed Users

| Username | Password | Role |
|---|---|---|
| `user1` | `user1pass` | `USER` — read-only |
| `support1` | `support1pass` | `SUPPORT` — read + create + edit |
| `admin1` | `admin1pass` | `ADMIN` — full CRUD |

## Roles

| Role | Description |
|---|---|
| `USER` | Read-only access to categories and items (GET) |
| `SUPPORT` | All access except DELETE on categories and items |
| `ADMIN` | Full CRUD including DELETE |

## Import behaviour

- **First start** (empty DB volume): Keycloak imports `realm-export.json` via `--import-realm`.
- **Subsequent restarts** (volume preserved): Existing realm is kept; `realm-export.json` is ignored.
- **Fresh start** after `docker compose down -v`: Volume is deleted, realm re-imports from file.

## Stop

```bash
docker compose down          # keep volume (users/realm preserved)
docker compose down -v       # delete volume (fresh import on next start)
```

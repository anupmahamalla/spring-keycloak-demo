# Platform Workspace

Reusable multi-repository microservices starter based on Spring Boot 3, Keycloak, PostgreSQL, Docker, and Kubernetes.

## Repositories
- `auth-repo` - Keycloak realm and identity bootstrap
- `service-repo` - reusable Spring Boot microservice template
- `infra-repo` - local Docker and Kubernetes deployment assets

## Security Boundary
- Keycloak runs as an external service.
- Services do not embed Keycloak.
- Services validate JWT using issuer metadata via `spring.security.oauth2.resourceserver.jwt.issuer-uri`.

## Prerequisites
- Java 21
- Maven 3.9+
- Docker + Docker Compose
- Kubernetes cluster + `kubectl` (optional for k8s deployment)

## Bring-up Order (End-to-End)
1. Start identity stack (`auth-repo`).
2. Build and test service (`service-repo`).
3. Run full local stack (`infra-repo`) or deploy to Kubernetes.

## 1) Start Keycloak (auth-repo)
```powershell
Set-Location "C:\dev\projects\keyclockdemo\auth-repo"
docker compose up -d
```

Realm should be available at:
- `http://localhost:8081/realms/reusable-realm`

Seed users:
- `user1 / user1pass` (`USER`)
- `admin1 / admin1pass` (`ADMIN`)

## 2) Build and test service (service-repo)
```powershell
Set-Location "C:\dev\projects\keyclockdemo\service-repo"
mvn test
mvn clean package -DskipTests
```

(Optional) Build service container image:
```powershell
Set-Location "C:\dev\projects\keyclockdemo\service-repo"
docker build -t service-template:latest .
```

## 3) Run local integrated stack (infra-repo)
```powershell
Set-Location "C:\dev\projects\keyclockdemo\infra-repo"
docker compose up -d
```

Default endpoints:
- Service: `http://localhost:8080`
- Keycloak: `http://localhost:8081`
- PostgreSQL: `localhost:5432`

## Environment Variables
### auth-repo (`auth-repo/docker-compose.yml`)
- `KEYCLOAK_IMAGE_TAG`
- `KEYCLOAK_CONTAINER_NAME`
- `KEYCLOAK_PORT`
- `KEYCLOAK_ADMIN`
- `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_DB_IMAGE_TAG`
- `KEYCLOAK_DB_CONTAINER_NAME`
- `KEYCLOAK_DB_PORT`
- `KEYCLOAK_DB_NAME`
- `KEYCLOAK_DB_USER`
- `KEYCLOAK_DB_PASSWORD`

### service-repo (`service-repo/src/main/resources/application-*.yml`)
- `SPRING_PROFILES_ACTIVE`
- `SERVER_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_ISSUER_URI`

### infra-repo (`infra-repo/docker-compose.yml`)
- `POSTGRES_IMAGE_TAG`
- `POSTGRES_CONTAINER_NAME`
- `POSTGRES_PORT`
- `SERVICE_DB_NAME`
- `SERVICE_DB_USER`
- `SERVICE_DB_PASSWORD`
- `SERVICE_IMAGE_NAME`
- `SERVICE_CONTAINER_NAME`
- `SERVICE_PORT`
- `KEYCLOAK_IMAGE_TAG`
- `KEYCLOAK_CONTAINER_NAME`
- `KEYCLOAK_PORT`
- `KEYCLOAK_ADMIN`
- `KEYCLOAK_ADMIN_PASSWORD`
- `JWT_ISSUER_URI`

## Kubernetes Quick Start (optional)
```powershell
Set-Location "C:\dev\projects\keyclockdemo\infra-repo"
kubectl apply -f .\k8s\
```

## Verify Token Validation Flow
1. Get token from Keycloak (`reusable-realm`, `reusable-client`).
2. Call service API with bearer token.
3. Service validates token signature/claims using issuer metadata only.

Expected flow:
- Client -> Service -> Keycloak metadata/JWKS


# infra-repo

Reusable deployment assets for platform services.

## Local development
Use Docker Compose with configurable environment variables.

```bash
docker compose up -d
```

Expected services:
- Generic microservice container
- Keycloak
- PostgreSQL

## Kubernetes manifests
Located in `k8s/`:
- `configmap.yaml`
- `secret.yaml`
- `postgres-deployment.yaml`
- `postgres-service.yaml`
- `keycloak-deployment.yaml`
- `keycloak-service.yaml`
- `microservice-deployment.yaml`
- `microservice-service.yaml`

Apply manifests:
```bash
kubectl apply -f k8s/
```

## Reusability notes
- Update image names/tags through environment values in manifests.
- Keep service app independent from Keycloak code; use only `JWT_ISSUER_URI`.


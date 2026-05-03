# API curl examples

Base URL: `http://localhost:8080`

All endpoints require a JWT bearer token from Keycloak.  
Replace `$ADMIN_TOKEN` / `$USER_TOKEN` with a real token, or export them first:

```bash
export ADMIN_TOKEN="<paste admin JWT here>"
export USER_TOKEN="<paste user JWT here>"
```

---

## Categories

### Field constraints
| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–100 chars |
| `description` | string | ❌ | max 255 chars |

---

### GET /categories — List all  _(USER or ADMIN)_
```bash
curl -s http://localhost:8080/categories \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

**Response `200`**
```json
[
  { "id": 1, "name": "Electronics", "description": "Electronic devices" },
  { "id": 2, "name": "Books", "description": null }
]
```

---

### GET /categories/{id} — Get by ID  _(USER or ADMIN)_
```bash
curl -s http://localhost:8080/categories/1 \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

**Response `200`**
```json
{ "id": 1, "name": "Electronics", "description": "Electronic devices" }
```

**Response `404`**
```json
{ "timestamp": "...", "status": 404, "error": "Not Found", "message": "Category not found: 99", "path": "/categories/99" }
```

---

### POST /categories — Create  _(ADMIN only)_
```bash
curl -s -X POST http://localhost:8080/categories \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices and accessories"
  }' | jq
```

Minimal body (description is optional):
```bash
curl -s -X POST http://localhost:8080/categories \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Books" }' | jq
```

**Response `201`**
```json
{ "id": 3, "name": "Electronics", "description": "Electronic devices and accessories" }
```

**Response `400`** (validation failure)
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "name must not be blank", "path": "/categories" }
```

---

### PUT /categories/{id} — Update  _(ADMIN only)_
```bash
curl -s -X PUT http://localhost:8080/categories/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics & Gadgets",
    "description": "Updated description"
  }' | jq
```

**Response `200`**
```json
{ "id": 1, "name": "Electronics & Gadgets", "description": "Updated description" }
```

---

### DELETE /categories/{id} — Delete  _(ADMIN only)_
```bash
curl -s -X DELETE http://localhost:8080/categories/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /dev/null -w "%{http_code}"
```

**Response `204`** (no body)

---

## Items

### Field constraints
| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–150 chars |
| `description` | string | ❌ | max 500 chars |
| `price` | number | ✅ | > 0.0 |
| `categoryId` | long | ✅ | must reference existing category |

---

### GET /items — List all  _(USER or ADMIN)_
```bash
curl -s http://localhost:8080/items \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

**Response `200`**
```json
[
  { "id": 1, "name": "Laptop Pro 15", "description": "High-performance laptop", "price": 1299.99, "categoryId": 1, "categoryName": "Electronics" },
  { "id": 2, "name": "Clean Code", "description": null, "price": 35.00, "categoryId": 2, "categoryName": "Books" }
]
```

---

### GET /items/{id} — Get by ID  _(USER or ADMIN)_
```bash
curl -s http://localhost:8080/items/1 \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

**Response `200`**
```json
{ "id": 1, "name": "Laptop Pro 15", "description": "High-performance laptop", "price": 1299.99, "categoryId": 1, "categoryName": "Electronics" }
```

---

### POST /items — Create  _(ADMIN only)_
```bash
curl -s -X POST http://localhost:8080/items \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Pro 15",
    "description": "High-performance laptop for professionals",
    "price": 1299.99,
    "categoryId": 1
  }' | jq
```

Minimal body (description is optional):
```bash
curl -s -X POST http://localhost:8080/items \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "USB Cable", "price": 9.99, "categoryId": 1 }' | jq
```

**Response `201`**
```json
{ "id": 5, "name": "Laptop Pro 15", "description": "High-performance laptop for professionals", "price": 1299.99, "categoryId": 1, "categoryName": "Electronics" }
```

**Response `400`** (price = 0 or negative)
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "price must be greater than 0.0", "path": "/items" }
```

**Response `404`** (categoryId does not exist)
```json
{ "timestamp": "...", "status": 404, "error": "Not Found", "message": "Category not found: 99", "path": "/items" }
```

---

### PUT /items/{id} — Update  _(ADMIN only)_
```bash
curl -s -X PUT http://localhost:8080/items/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Pro 15 (2025)",
    "description": "Refreshed model with better battery",
    "price": 1199.99,
    "categoryId": 1
  }' | jq
```

**Response `200`**
```json
{ "id": 1, "name": "Laptop Pro 15 (2025)", "description": "Refreshed model with better battery", "price": 1199.99, "categoryId": 1, "categoryName": "Electronics" }
```

---

### DELETE /items/{id} — Delete  _(ADMIN only)_
```bash
curl -s -X DELETE http://localhost:8080/items/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /dev/null -w "%{http_code}"
```

**Response `204`** (no body)

---

## Common error responses

| Status | When |
|---|---|
| `400 Bad Request` | Validation failure on request body |
| `403 Forbidden` | Token present but wrong role |
| `401 Unauthorized` | No / expired token |
| `404 Not Found` | ID does not exist |
| `500 Internal Server Error` | Unexpected error |

---

## Quick token fetch from Keycloak (local)

```bash
export ADMIN_TOKEN=$(curl -s -X POST \
  http://localhost:8081/realms/reusable-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=service-client" \
  -d "username=admin-user" \
  -d "password=admin-password" \
  -d "grant_type=password" | jq -r '.access_token')

export USER_TOKEN=$(curl -s -X POST \
  http://localhost:8081/realms/reusable-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=service-client" \
  -d "username=regular-user" \
  -d "password=user-password" \
  -d "grant_type=password" | jq -r '.access_token')
```

> Adjust `client_id`, `username`, `password`, and realm URL to match your Keycloak setup.


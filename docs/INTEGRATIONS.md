# Integraciones y Conexiones — Kigo Web App

> Este documento describe todas las integraciones externas, APIs y servicios
> que la web app necesita para funcionar en producción. Para el prototipo,
> todos estos servicios están mockeados.

---

## Arquitectura del flujo

```
┌─────────────┐     link con ?session=xxx     ┌──────────────────┐
│ WhatsApp Bot │ ──────────────────────────────▶│  Kigo Web App    │
└─────────────┘                                │  (Browser móvil) │
                                               └────────┬─────────┘
                                                        │
                                            ┌───────────┼───────────┐
                                            ▼           ▼           ▼
                                     ┌──────────┐ ┌──────────┐ ┌──────────┐
                                     │ API Kigo │ │ Pagos    │ │Analytics │
                                     │ Backend  │ │ Provider │ │ (opt)    │
                                     └──────────┘ └──────────┘ └──────────┘
```

---

## 1. API Backend Kigo

| Campo | Valor |
|-------|-------|
| **Propósito** | Validar sesiones, obtener datos del usuario, registrar pagos |
| **Base URL** | Configurar en `VITE_API_BASE_URL` |
| **Autenticación** | Token de sesión (viene del bot via query param) |
| **Formato** | JSON REST |

### Endpoints esperados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/session/:id` | Valida el token de sesión y retorna datos del usuario |
| `GET` | `/user/:id/balance` | Obtiene saldo/monto pendiente del usuario |
| `POST` | `/payments/create-intent` | Crea intención de pago en el proveedor |
| `POST` | `/payments/confirm` | Confirma que el pago fue exitoso |
| `GET` | `/payments/:id/status` | Consulta estado de un pago |

### Respuestas mock (prototipo)

```json
// GET /session/abc123
{
  "valid": true,
  "user": {
    "id": "usr_001",
    "name": "Carlos García",
    "email": "carlos@example.com",
    "phone": "+5215512345678"
  },
  "parking": {
    "location": "Plaza Kigo - Nivel 2, Cajón B-14",
    "vehicle": "Toyota Corolla 2022 — ABC-123",
    "entry_time": "2026-06-23T14:30:00Z",
    "duration_minutes": 90,
    "amount_due": 45.00,
    "currency": "MXN"
  }
}
```

```json
// POST /payments/create-intent
// Body: { session_id, amount, currency, provider }
{
  "payment_intent_id": "pi_mock_123456",
  "client_secret": "pi_mock_123456_secret_abc",
  "status": "requires_payment_method"
}
```

```json
// POST /payments/confirm
// Body: { payment_intent_id }
{
  "status": "succeeded",
  "receipt_url": "https://pay.kigo.app/receipt/pi_mock_123456",
  "timestamp": "2026-06-23T16:05:00Z"
}
```

---

## 2. Servicio de Pagos

### Stripe (recomendado)

| Campo | Valor |
|-------|-------|
| **SDK** | `@stripe/stripe-js` (client) |
| **Llave pública** | `VITE_STRIPE_PUBLISHABLE_KEY` |
| **Llave secreta** | `STRIPE_SECRET_KEY` (solo backend) |
| **Webhook secret** | `STRIPE_WEBHOOK_SECRET` (solo backend) |
| **Modo test** | Usar llaves `pk_test_` / `sk_test_` |
| **Docs** | https://docs.stripe.com/payments/quickstart |

### MercadoPago (alternativa LATAM)

| Campo | Valor |
|-------|-------|
| **SDK** | MercadoPago JS SDK v2 |
| **Llave pública** | `VITE_MERCADOPAGO_PUBLIC_KEY` |
| **Access token** | `MERCADOPAGO_ACCESS_TOKEN` (solo backend) |
| **Modo test** | Usar credenciales de prueba desde el dashboard |
| **Docs** | https://www.mercadopago.com.mx/developers |

### PayPal (alternativa)

| Campo | Valor |
|-------|-------|
| **SDK** | PayPal JS SDK |
| **Client ID** | `VITE_PAYPAL_CLIENT_ID` |
| **Modo sandbox** | Usar credenciales sandbox |
| **Docs** | https://developer.paypal.com/docs/checkout/ |

---

## 3. WhatsApp Bot

| Campo | Valor |
|-------|-------|
| **Propósito** | Disparar el flujo enviando un link al usuario |
| **Parámetro de sesión** | `?session=<token>` en la URL |
| **Proveedor sugerido** | Meta Business API / Twilio / 360dialog |
| **Token API** | `WHATSAPP_API_TOKEN` (solo backend del bot) |
| **Phone Number ID** | `WHATSAPP_PHONE_NUMBER_ID` (solo backend) |

La web app **no se comunica directamente con WhatsApp**. Solo recibe el
query param `session` para identificar al usuario y su contexto.

---

## 4. Analytics y Monitoreo (opcional)

| Servicio | Variable | Propósito |
|----------|----------|-----------|
| Google Analytics 4 | `VITE_GA_MEASUREMENT_ID` | Tracking de conversión y uso |
| Sentry | `VITE_SENTRY_DSN` | Captura de errores en producción |

---

## 5. Base de datos (solo backend)

| Campo | Valor |
|-------|-------|
| **Motor sugerido** | PostgreSQL / PlanetScale (MySQL) |
| **Connection string** | `DATABASE_URL` (solo backend) |
| **ORM sugerido** | Drizzle / Prisma |

La web app **no se conecta directamente a la DB**. Todo pasa por la API backend.

---

## 6. Seguridad

| Aspecto | Implementación |
|---------|---------------|
| **Sesiones** | Token temporal generado por el bot, con expiración (15-30 min) |
| **Cifrado** | `SESSION_ENCRYPTION_KEY` para firmar/verificar tokens |
| **JWT** | `JWT_SECRET` si se usa JWT como formato de sesión |
| **HTTPS** | Obligatorio en producción |
| **CORS** | Backend debe permitir solo el dominio de la web app |

---

## Checklist para ir a producción

- [ ] Reemplazar valores mock en `.env` con credenciales reales
- [ ] Configurar `VITE_ENABLE_MOCK_MODE=false`
- [ ] Desplegar backend con endpoints reales
- [ ] Configurar webhooks de Stripe/MercadoPago en el backend
- [ ] Configurar WhatsApp Bot para enviar URLs con token de sesión real
- [ ] Activar HTTPS en el dominio de la web app
- [ ] Configurar CORS en el backend
- [ ] Activar Sentry y Analytics
- [ ] Hacer pruebas end-to-end con pagos reales en modo test
- [ ] Pasar a llaves `live` del proveedor de pagos

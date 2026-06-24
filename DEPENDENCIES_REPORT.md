# Reporte de Dependencias

Snapshot del `package.json` actual. Versiones son mínimas (`^`) salvo donde se indique pinned.

## Stack base (obligatorio)

| Paquete | Versión | Rol |
| --- | --- | --- |
| `react`, `react-dom` | ^19.2.0 | UI runtime |
| `@tanstack/react-start` | ^1.167.50 | Framework full-stack (SSR + server functions) |
| `@tanstack/react-router` | ^1.168.25 | Router file-based |
| `@tanstack/router-plugin` | ^1.167.28 | Generación de `routeTree.gen.ts` |
| `@tanstack/react-query` | ^5.83.0 | Data fetching / cache |
| `vite` | ^8.0.16 | Build / dev server |
| `@tailwindcss/vite`, `tailwindcss` | ^4.2.1 | Estilos |
| `typescript` | ^5.8.3 | Lenguaje |
| `nitro` | 3.0.260603-beta | Server bundling para edge targets |
| `@lovable.dev/vite-tanstack-config` | 2.5.3 | Preset Vite con todos los plugins ya cableados |

## Dependencias de producción

### Routing / Data
- `@tanstack/react-router`, `@tanstack/router-plugin`, `@tanstack/react-start`, `@tanstack/react-query`

### UI primitives (Radix)
`@radix-ui/react-accordion`, `react-alert-dialog`, `react-aspect-ratio`, `react-avatar`, `react-checkbox`, `react-collapsible`, `react-context-menu`, `react-dialog`, `react-dropdown-menu`, `react-hover-card`, `react-label`, `react-menubar`, `react-navigation-menu`, `react-popover`, `react-progress`, `react-radio-group`, `react-scroll-area`, `react-select`, `react-separator`, `react-slider`, `react-slot`, `react-switch`, `react-tabs`, `react-toggle`, `react-toggle-group`, `react-tooltip`

### Componentes / UX
- `lucide-react` — set de iconos
- `cmdk` — command palette
- `embla-carousel-react` — carrusel
- `input-otp` — input OTP
- `react-day-picker` + `date-fns` — calendarios y fechas
- `react-resizable-panels` — paneles redimensionables
- `recharts` — gráficos
- `sonner` — notificaciones toast
- `vaul` — drawers móviles
- `tw-animate-css` — utilidades de animación Tailwind

### Forms y validación
- `react-hook-form`, `zod`, `@hookform/resolvers`

### Utilidades
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `vite-tsconfig-paths`

## Dependencias de desarrollo

- TypeScript: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`
- Lint/format: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier`
- Build: `vite`, `@vitejs/plugin-react`, `nitro`, `@lovable.dev/vite-tanstack-config`

## Librerías UI utilizadas

- **Sistema:** shadcn/ui (estilo "new-york") configurado en `components.json`
- **Base:** Radix UI primitives + Tailwind v4
- **Iconos:** `lucide-react`

## Componentes shadcn/ui presentes en `src/components/ui/`

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip.

## Integraciones externas

Ninguna actualmente. El proyecto es 100% front-end con SSR local; no hay backend, base de datos, autenticación, pagos reales ni APIs de terceros conectadas. El flujo de pago en `src/routes/index.tsx` es simulado (mock).

## APIs consumidas

Ninguna. No hay llamadas `fetch` a servicios externos en el código actual.

## Variables de entorno requeridas

Ninguna. No se requiere `.env` para ejecutar el proyecto. Convenciones a respetar si se añaden en el futuro:

- `VITE_*` → expuestas al cliente (`import.meta.env.VITE_*`)
- Resto → solo servidor, leerlas dentro de `.handler()` de `createServerFn` con `process.env.*`

# Kigo — Pago de Estacionamiento

Aplicación web móvil que permite a un usuario escanear o ingresar el folio de un boleto de estacionamiento y completar el pago. Construida sobre TanStack Start (React 19 + Vite 7) con Tailwind CSS v4.

## Arquitectura

- **Framework:** [TanStack Start v1](https://tanstack.com/start) (full-stack React 19 con SSR y server functions)
- **Build tool:** Vite 7 (configurado vía `@lovable.dev/vite-tanstack-config`, que ya incluye `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths` y nitro para targets edge / Cloudflare Workers)
- **Lenguaje:** TypeScript 5 estricto
- **Router:** `@tanstack/react-router` con file-based routing en `src/routes/` (genera `src/routeTree.gen.ts` automáticamente)
- **Estado servidor / data fetching:** `@tanstack/react-query` v5
- **Estilos:** Tailwind CSS v4 (vía `@tailwindcss/vite`) con tokens semánticos definidos en `src/styles.css`. Animaciones con `tw-animate-css`.
- **UI primitives:** shadcn/ui (New York style) sobre Radix UI + `lucide-react` para iconos
- **Formularios:** `react-hook-form` + `zod` + `@hookform/resolvers`
- **Notificaciones:** `sonner`
- **Gestor de paquetes:** **bun** (lockfile: `bun.lock`, con guardas en `bunfig.toml`)
- **Target de despliegue:** Cloudflare Workers / cualquier runtime edge soportado por Nitro

## Requisitos locales

- [Bun](https://bun.sh) >= 1.1 (recomendado) — también funciona con `npm`/`pnpm` regenerando el lockfile correspondiente
- Node.js >= 20 (necesario para tooling de TanStack/Vite)

## Instalación

```bash
bun install
```

## Comandos

| Acción | Comando |
| --- | --- |
| Desarrollo (HMR) | `bun run dev` |
| Build producción | `bun run build` |
| Build modo dev (prerender) | `bun run build:dev` |
| Preview build local | `bun run preview` |
| Lint | `bun run lint` |
| Formateo Prettier | `bun run format` |

El servidor de desarrollo arranca por defecto en `http://localhost:8080`.

## Estructura de carpetas

```
.
├── src/
│   ├── routes/              # File-based routing (TanStack Router)
│   │   ├── __root.tsx       # Layout raíz (html/head/body, providers)
│   │   └── index.tsx        # Pantalla principal: escáner + checkout
│   ├── components/ui/       # Componentes shadcn/ui (Radix + Tailwind)
│   ├── hooks/               # Hooks utilitarios (use-mobile, etc.)
│   ├── lib/                 # Utils (cn, error reporting, error-page)
│   ├── assets/              # Imágenes y logos (.asset.json + binarios)
│   ├── styles.css           # Tokens Tailwind v4 + estilos globales
│   ├── router.tsx           # Factory de router + QueryClient
│   ├── server.ts            # Entry SSR (wrapper de errores)
│   ├── start.ts             # Middlewares globales de TanStack Start
│   └── routeTree.gen.ts     # Generado — NO editar
├── components.json          # Config shadcn/ui
├── vite.config.ts           # Config Vite (delegado a lovable preset)
├── tsconfig.json
├── eslint.config.js
├── bunfig.toml
├── bun.lock
└── package.json
```

## Variables de entorno

El proyecto **no consume APIs externas** ni requiere claves para correr localmente. No hay archivo `.env` requerido. Si en el futuro se agregan integraciones:

- Variables expuestas al cliente: prefijo `VITE_*` y acceso vía `import.meta.env.VITE_*`
- Variables solo de servidor: leerlas dentro del `.handler()` de un `createServerFn`, usando `process.env.*`

## Despliegue fuera de Lovable

Nitro (incluido) puede generar el bundle para múltiples targets edge:

- Por defecto la config exporta para **Cloudflare Workers** (carpeta `.output/`)
- Puede adaptarse a Node, Vercel, Netlify, Bun u otros cambiando el preset de Nitro en `vite.config.ts`

Subir el repositorio a GitHub y conectar el provider deseado (Cloudflare Pages, Vercel, etc.) apuntando a `bun run build` como build command.

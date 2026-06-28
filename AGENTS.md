# ROSARIO-COMPARA — Progress & Context

## Goal
Build a price comparison platform for Rosario suppliers with scoring, category-based comparison, supplier profiles, responsive UI, and Flat Material design with dark mode.

## Stack
- React Router 8 + TypeScript + TailwindCSS v4 (CSS-first `@theme`) + MongoDB/Mongoose + Cloudinary (placeholder)
- Design: Flat Material, Teal primary (primary-*), Amber accent (accent-*), consistent rounded-lg, no shadows, tinted card backgrounds (primary-50)
- Dark mode: toggle with localStorage persistence + `@custom-variant dark (&:is(.dark *))`, anti-flash inline script
- Icons: lucide-react tree-shakeable
- Scoring: weighted algorithm (precio/envio/pedido/beneficios/cobertura) with configurable weights

## Environment
- `.env` required: `JWT_SECRET` always; `MONGODB_URI` solo para `pnpm dev`/producción (`pnpm mock` la inyecta automática)
- Cloudinary variables in `.env.example` as placeholder (not yet implemented)
- Scripts: `pnpm mock` (inicia MongoDB en memoria + seed + dev), `pnpm dev` (MongoDB real)

## Seed Data
- 3 proveedores, 2 clientes, 14 productos. Password: 123456. Login: proveedor1@test.com / cliente1@test.com

## What's Implemented

### Core Features
- Auth (login/register/logout, JWT, role-based, middleware)
- Scoring engine (weighted, shared types server+client, badges)
- Search grouped by category with ranked suppliers
- Product comparison by category, grouped by supplier, ranked
- Public supplier profile with grouped products
- Cart (add/remove products)
- Favorites (toggle favorite products)
- Orders (CRUD for proveedores, view for clientes, state machine transitions)
- Seed script with 3 proveedores + 2 clientes + 14 productos

### UI/Design
- Flat Material design system: teal/primary + amber/accent
- Dark mode with toggle, localStorage persistence, anti-flash inline script
- `@theme` in app.css with primary-* (teal) and accent-* (amber) scales
- Reusable components: Button (4 variants + 2 sizes), Card, Input/Textarea, Badge (6 colors), Stars, ThemeToggle, Spinner
- All emojis replaced with lucide-react icons
- Responsive layout with sidebar drawer (hamburger on mobile)

### Bugfixes applied
- Layout routes: `loaderData` via `useLoaderData()` hook, not `ComponentProps` (React Router 8 breaking change)
- Server-only modules: `await import()` dinámico inside `loader`/`action` to avoid "Server-only module referenced by client"
- Seed: ObjectId en vez de strings, `start-mock` cross-platform

### Gaps MVP — All Implemented (Jun 28)
1. Loading states (Spinner overlay in dashboard.tsx via `useNavigation`)
2. Delete producto (action + confirm dialog in dashboard.productos.tsx)
3. Teléfono editable + validación CUIT (dashboard.mi-perfil.tsx)
4. Máquina de estados pedidos (transiciones válidas en dashboard.pedidos.$id.tsx)
5. Feedback visual carrito/favoritos (toast via useFetcher en buscar.tsx)
6. Link a comparación (buscar.tsx + proveedor.$id.tsx)
7. Filtro por proveedor (buscar.tsx loader + form select)
8. Paginación (buscar.tsx, 50 items/page, page controls)

## Key Constraints
- No shadows (flat design)
- `rounded-lg` everywhere
- Tinted backgrounds (`bg-primary-50`) instead of `bg-white`
- `@custom-variant dark (&:is(.dark *))` in app.css
- `useLoaderData()` hook for layout route data (not props)
- Dynamic `import()` for server modules in routes

## Next Steps / Future Work
- Typecheck passes without errors
- Mark as MVP ready pending user approval
- Cloudinary integration (image upload for products/profiles)
- Real MongoDB deployment (Atlas) for production
- Email notifications
- Order management improvements (filter, status history)
- Admin panel
- Tests

## Commands
- `pnpm mock` — dev with in-memory MongoDB + seed + auto-reload
- `pnpm dev` — dev with real MongoDB
- `npm run typecheck` — verify types

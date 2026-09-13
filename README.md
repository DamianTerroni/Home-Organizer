# Hogar

App para llevar los gastos, aportes y compras del hogar entre varios integrantes. Web app instalable (PWA) — funciona desde el celular (Android/iPhone) o la compu, sin necesidad de una app nativa.

## Qué incluye

- **Gastos y aportes**: cada integrante carga sus pagos (ej. "Alquiler 850€ - Damian", "Mercado 70€ - Julieta") con categoría y fecha.
- **Filtros**: por monto mínimo, por integrante, por categoría.
- **Resumen con gráficas**: quién aportó más en el mes y cómo se reparten los gastos por categoría.
- **Lista de compras compartida**: se actualiza en vivo en todos los dispositivos (Supabase Realtime).
- **Multi-hogar**: se crea un hogar con un código de invitación; el resto de los integrantes se une con ese código.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) (base de datos Postgres, autenticación, realtime)
- Desplegable gratis en [Vercel](https://vercel.com)

## 1. Crear el proyecto de Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (plan gratuito).
2. En **SQL Editor**, pegá y ejecutá todo el contenido de [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas, los permisos de seguridad (RLS) y las funciones para crear/unirse a un hogar.
3. En **Project Settings → API**, copiá la **Project URL** y la **anon public key**.
4. (Opcional pero recomendado para no tener que confirmar el email de cada integrante) En **Authentication → Providers → Email**, desactivá "Confirm email".

## 2. Configurar las variables de entorno

Copiá `.env.local.example` a `.env.local` y completá con los datos del paso anterior:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 3. Correr en desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El primero que se registra crea el hogar; el resto se une con el **código de invitación** que aparece en el Resumen.

## 4. Publicar (para usarla desde el celular en cualquier lugar)

1. Subí este proyecto a un repositorio de GitHub.
2. Importalo en [Vercel](https://vercel.com/new).
3. Cargá las mismas dos variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en la configuración del proyecto en Vercel.
4. Deploy. Desde el celular, abrí la URL en Chrome y usá "Agregar a pantalla de inicio" para instalarla como app.

## Estructura

```
src/app/(main)/        Resumen, Gastos y Lista de compras (requieren hogar creado)
src/app/login/         Login
src/app/signup/        Registro
src/app/onboarding/    Crear hogar / unirse con código
src/lib/supabase/      Clientes de Supabase (browser, server, middleware)
supabase/schema.sql    Esquema de base de datos + seguridad (RLS) a ejecutar en Supabase
```

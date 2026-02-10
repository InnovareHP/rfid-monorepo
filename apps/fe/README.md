# Dashboard FE

Welcome to your new **TanStack**-powered dashboard frontend.

This app uses **React + TypeScript** with **Vite**, **TanStack Router**, **TanStack Query**, **Tailwind CSS**, and **shadcn/ui**. It ships with testing via **Vitest**.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm (or pnpm/yarn)

### Install & Run (Development)

```bash
npm install
npm run start
# or
npm run dev
```

> `npm run start` may alias to `dev` in this template.

### Build & Preview (Production)

```bash
npm run build
npm run preview
```

### Testing

This project uses [Vitest](https://vitest.dev/).

```bash
npm run test
# with coverage
npm run test -- --coverage
```

---

## 🧰 Tech Stack

- **Build Tool:** Vite
- **Routing:** [TanStack Router](https://tanstack.com/router)
- **Data Fetching:** [@tanstack/react-query](https://tanstack.com/query)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Testing:** Vitest

---

## 🗂️ Project Structure

A typical structure (your repo may vary):

```
src/
  components/
    ui/              # shadcn/ui components
  lib/               # clients, utils (e.g., authClient)
  routes/            # TanStack file-based routes
  styles/            # tailwind.css and global styles
  main.tsx           # app entry
  index.css
```

---

## 🎨 Styling & UI

### Tailwind

Utility-first styling. Configure in `tailwind.config.ts`.

### shadcn/ui

Add components using the latest CLI:

```bash
pnpx shadcn@latest add button
```

### Class Variants (CVA)

If you use `class-variance-authority`, import types correctly (TypeScript-only):

```ts
import { cva, type VariantProps } from "class-variance-authority";
```

Example:

```ts
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border bg-transparent",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
```

---

## 🧭 Routing (TanStack Router)

This template uses **file-based routing** under `src/routes`.

### Add a Route

Create a new file in `src/routes` and export a route. For example `src/routes/about.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: () => (
    <div>
      <h1>About</h1>
      <Link to="/">Go Home</Link>
    </div>
  ),
});
```

### Layouts

The root layout lives in `src/routes/__root.tsx`. Anything rendered there wraps all routes.

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
```

### SPA Navigation

Use `Link` from `@tanstack/react-router`:

```tsx
import { Link } from "@tanstack/react-router";
<Link to="/about">About</Link>;
```

---

## 📡 Data Fetching

You can fetch data via **route loaders** or **React Query**.

### Route Loader Example

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/people")({
  loader: async () => {
    const res = await fetch("https://swapi.dev/api/people");
    return (await res.json()) as {
      results: { name: string }[];
    };
  },
  component: () => {
    const data = Route.useLoaderData();
    return (
      <ul>
        {data.results.map((p) => (
          <li key={p.name}>{p.name}</li>
        ))}
      </ul>
    );
  },
});
```

### React Query Example

Install the deps first:

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

Wrap the app in a `QueryClientProvider` (e.g., `main.tsx`):

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

// ...
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>;
```

Use `useQuery` in components:

```tsx
import { useQuery } from "@tanstack/react-query";

const { data = [] } = useQuery({
  queryKey: ["people"],
  queryFn: async () => {
    const res = await fetch("https://swapi.dev/api/people");
    const json = await res.json();
    return json.results as { name: string }[];
  },
});
```

### Prefetch Pattern

Warm the cache for snappy UIs (e.g., on hover):

```tsx
import { useQueryClient } from "@tanstack/react-query";

const qc = useQueryClient();
const prefetchOrgs = () =>
  qc.prefetchQuery({
    queryKey: ["organizations"],
    queryFn: () => authClient.organization.list(),
    staleTime: 5 * 60 * 1000,
  });
```

---

## 🧪 Testing (Vitest)

Place tests next to files using `*.test.ts(x)`.

```bash
npm run test
```

---

## 🔧 Scripts

Common scripts (see `package.json`):

- `dev` / `start` – run the dev server
- `build` – build for production
- `preview` – preview the prod build
- `test` – run unit tests

---

## 📄 Environment Variables

If required, create a `.env` (or `.env.local`) based on `.env.example`.

---

## 🧱 State Management (Optional)

If you need lightweight global state, consider **TanStack Store**:

```bash
npm install @tanstack/store
```

---

## 🧭 Demo Files

Files prefixed with `demo*` are safe to delete and exist for exploration.

---

## 📚 Learn More

- TanStack: [https://tanstack.com](https://tanstack.com)
- Router Docs: [https://tanstack.com/router](https://tanstack.com/router)
- Query Docs: [https://tanstack.com/query](https://tanstack.com/query)
- Tailwind: [https://tailwindcss.com](https://tailwindcss.com)
- shadcn/ui: [https://ui.shadcn.com](https://ui.shadcn.com)
- Vitest: [https://vitest.dev](https://vitest.dev)

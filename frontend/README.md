# ILO CFP Classifier - Frontend

A modern React application built with TanStack Router, TanStack Query, and TypeScript, following a feature-based architecture pattern.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
  - [Feature-Based Architecture](#feature-based-architecture)
  - [Shared Components](#shared-components)
  - [Integrations](#integrations)
- [Authentication](#authentication)
  - [Keycloak Integration](#keycloak-integration)
  - [Local Development](#local-development)
- [Technology Stack](#technology-stack)
- [Development Guide](#development-guide)
  - [Styling](#styling)
  - [Linting & Formatting](#linting--formatting)
  - [Adding shadcn/ui Components](#adding-shadcnui-components)
- [Routing](#routing)
  - [Route Structure](#route-structure)
  - [Adding A Route](#adding-a-route)
  - [Navigation](#navigation)
  - [Route Layouts](#route-layouts)
  - [Protected Routes](#protected-routes)
- [Data Fetching](#data-fetching)
  - [TanStack Query Pattern](#tanstack-query-pattern)
  - [Mutations](#mutations)
- [Internationalization](#internationalization)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Best Practices](#best-practices)
- [Quick Reference](#quick-reference)
- [Learn More](#learn-more)

## Getting Started

To run this application:

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## Architecture

### Feature-Based Architecture

This frontend follows a **feature-based architecture** where code is organized by business domain rather than by technical concerns. Each feature is self-contained and independent, promoting modularity and maintainability.

#### Feature Structure

Each feature module is located in `src/features/<feature-name>/` and can contain any folders needed for that feature. **The key principle is that all content within a feature should only be used inside that feature.**

**Common folders you might use:**

```
src/features/<feature-name>/
├── components/           # Feature-specific React components
├── lib/                  # Feature-specific utilities, types, and API calls
│   ├── api.ts           # API endpoints for this feature
│   ├── types.ts         # TypeScript types/interfaces
│   ├── constants.ts     # Feature-specific constants
│   ├── utils.ts         # Feature-specific utility functions
│   └── query-options.ts # TanStack Query hooks and options
├── hooks/                # Feature-specific custom hooks (optional)
├── schemas/              # Form validation schemas (optional)
├── stores/               # Feature-specific state management (optional)
└── assets/               # Feature-specific images, icons (optional)
```

**You're not limited to just `components/` and `lib/`** - organize your feature however makes sense, as long as the code stays within the feature boundaries.

**Current Features:**

- **`auth/`** - Authentication components (login form, loading states)
- **`proposals/`** - CFP proposal management and AI-powered analysis
  - Includes complex components like AI chat interface, data tables, analysis views
- **`sources/`** - Data source configuration and management
- **`criterion-types/`** - Classification criterion type management
- **`notifications/`** - User notification system

#### How to Create a New Feature

1. **Create the feature directory structure:**

   ```bash
   mkdir -p src/features/my-feature
   ```

   Then add the folders you need (e.g., `components/`, `lib/`, `hooks/`, etc.)

2. **Define your types** in `lib/types.ts`:

   ```typescript
   // src/features/my-feature/lib/types.ts
   export type MyFeature = {
     id: string;
     name: string;
     description?: string;
   };
   // src/features/my-feature/lib/types.ts
   export type MyFeatureParams = {
     page?: number;
     pageSize?: number;
     search?: string;
   };
   ```

3. **Create API functions** in `lib/api.ts`:

   ```typescript
   // src/features/my-feature/lib/api.ts
   import client from '@/integrations/axios';
   import type { PaginatedResponse } from '@/lib/types';
   import type { MyFeature, MyFeatureParams } from './types';

   export async function getMyFeaturesApi(params?: MyFeatureParams) {
     const { data } = await client.get<PaginatedResponse<MyFeature>>(
       '/my-features',
       { params },
     );
     return data;
   }
   ```

4. **Create TanStack Query options** in `lib/query-options.ts`:

   ```typescript
   // src/features/my-feature/lib/query-options.ts
   import { queryOptions } from '@tanstack/react-query';
   import { getMyFeaturesApi, getMyFeatureApi } from './api';
   import type { MyFeatureParams } from './types';

   export const myFeaturesQueryOptions = (params?: MyFeatureParams) =>
     queryOptions({
       queryKey: ['my-features', params],
       queryFn: () => getMyFeaturesApi(params),
     });
   ```

5. **Build components** in `components/`:

   ```typescript
   // src/features/my-feature/components/my-feature-list.tsx
   import { useQuery } from '@tanstack/react-query';
   import { myFeaturesQueryOptions } from '../lib/query-options';
   import type { MyFeatureParams } from '../lib/types';

   type MyFeatureListProps = {
     params?: MyFeatureParams;
   }

   export function MyFeatureList({ params }: MyFeatureListProps) {
     const { data, isLoading, error } = useQuery(myFeaturesQueryOptions(params));

     if (isLoading) return <div>Loading...</div>;
     if (error) return <div>Error: {error.message}</div>;

     return (
       <div>
         {data?.content.map((feature) => (
           <div key={feature.id}>
             <h3>{feature.name}</h3>
             <p>{feature.description}</p>
           </div>
         ))}
       </div>
     );
   }
   ```

#### Feature Independence Rules

⚠️ **Critical Principle:** Features must be independent and self-contained. **All code within a feature should only be used by that feature.**

**✅ DO:**

```typescript
// ✅ Import from shared locations (src/components, src/lib, src/hooks, src/integrations)
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import client from '@/integrations/axios';
import type { PaginatedResponse } from '@/lib/types';

// ✅ Import within the same feature
import { myFeatureQueryOptions } from '../lib/query-options';
import type { MyFeature } from '../lib/types';
import { MyFeatureCard } from './my-feature-card';
```

**❌ DON'T:**

```typescript
// ❌ NEVER import from other features
import { sourceQueryOptions } from '@/features/sources/lib/query-options';
import type { Source } from '@/features/sources/lib/types';
import { SourcePicker } from '@/features/sources/components/source-picker';

// ❌ NEVER export feature code for use in other features
export { MyFeatureList } from '@/features/my-feature/components/my-feature-list';
// (importing this in another feature would violate independence)
```

**🔧 WHEN TO REFACTOR:**

If you need functionality from another feature, ask yourself:

1. **Is it generic enough to be shared?**
   - **YES** → Extract to `src/components/`, `src/lib/`, or `src/hooks/`
   - **NO** → Duplicate the code in your feature (better than coupling)

2. **Example - Sharing a Status Badge:**

   ```typescript
   // ❌ Before: Using from another feature
   import { StatusBadge } from '@/features/proposals/components/status-badge';

   // ✅ After: Extract to shared components
   // 1. Move to src/components/status-badge.tsx
   // 2. Make it generic and reusable
   import { StatusBadge } from '@/components/status-badge';

   // Usage in multiple features:
   <StatusBadge status="active" variant="success" />
   ```

3. **Example - Sharing Types:**

   ```typescript
   // ❌ Before: Using types from another feature
   import type { ProposalStatus } from '@/features/proposals/lib/types';

   // ✅ After: Extract to shared types
   // Add to src/lib/types.ts if it's a common domain concept
   export type Status = 'active' | 'inactive' | 'pending';

   import type { Status } from '@/lib/types';
   ```

**Why This Matters:**

- **Maintainability** - Changes to one feature don't break others
- **Scalability** - Features can be developed in parallel without conflicts
- **Testability** - Features can be tested in isolation
- **Deletability** - Features can be removed without cascading effects
- **Understanding** - Clear boundaries make code easier to reason about

### Shared Components

Code that is used across multiple features belongs in the main `src/` directory:

- **`src/components/`** - Reusable UI components
  - `ui/` - shadcn/ui base components (Button, Dialog, etc.)
  - `app-sidebar.tsx`, `nav-routes.tsx`, etc. - Application-level components
  - `theme-provider.tsx` - Theme/dark mode provider

- **`src/lib/`** - Shared utilities and types
  - `utils.ts` - Common utility functions (e.g., `cn()` for className merging)
  - `types.ts` - Global TypeScript types
  - `constants.ts` - Application-wide constants
  - `config.ts` - Configuration values

- **`src/hooks/`** - Custom React hooks
  - `use-debounce.ts` - Debounce hook
  - `use-mobile.ts` - Mobile detection hook

### Integrations

The `src/integrations/` directory contains third-party library configurations:

- **`auth.tsx`** - OIDC authentication provider (react-oidc-context)
- **`axios.tsx`** - Axios HTTP client with interceptors
- **`i18n.ts`** - i18next internationalization setup
- **`tanstack-query.tsx`** - TanStack Query client configuration
- **`tanstack-router.tsx`** - TanStack Router setup

## Authentication

### Keycloak Integration

**Important:** Keycloak runs as a **separate service**, not within the frontend package. The frontend connects to Keycloak using the OIDC (OpenID Connect) protocol via the `react-oidc-context` library.

#### Architecture

```
┌─────────────────┐      OIDC Protocol      ┌──────────────────┐
│                 │ ◄─────────────────────► │                  │
│  Frontend App   │    (OAuth 2.0 flows)    │  Keycloak Server │
│  (Port 3000)    │                         │  (Port 8180)     │
└─────────────────┘                         └──────────────────┘
```

The frontend:

1. Redirects users to Keycloak for login
2. Receives authentication tokens after successful login
3. Includes tokens in API requests (via axios interceptors)
4. Handles token refresh and silent authentication

#### Configuration

Authentication is configured in `src/integrations/auth.tsx`:

```typescript
const oidcConfig = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY, // Keycloak realm URL
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID, // App client ID
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI, // Callback URL
  scope: import.meta.env.VITE_OIDC_SCOPE, // Requested scopes
  post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI, // Logout redirect
  // ...
};
```

Environment variables are loaded from `.env` files.

### Local Development

For local development, a Keycloak instance is included in the main docker-compose setup.

**To start Keycloak:**

```bash
# From the project root (not frontend directory)
docker compose up keycloak
```

**Frontend configuration** (create a `.env` file for local development):

```bash
# OIDC Configuration
VITE_OIDC_AUTHORITY=http://localhost:8180/realms/local-dev
VITE_OIDC_CLIENT_ID=ilo-cfp-classifier-app
VITE_OIDC_REDIRECT_URI=http://localhost:3000
VITE_OIDC_SCOPE=openid email
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/login

# Dev Tools
VITE_SHOW_DEVTOOLS=false
```

**Keycloak Admin Console:**

- URL: http://localhost:8180
- Username: `admin` (configured via `KEYCLOAK_ADMIN` in `.env`)
- Password: `admin` (configured via `KEYCLOAK_ADMIN_PASSWORD` in `.env`)

**Test User:**

- Username: `oliver`
- Password: `password`

The realm configuration is pre-loaded from `../keycloak/keycloak-realm.json`.

**⚠️ Not for production use** - This setup is for development only.

## Technology Stack

### Core Framework

- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server

### Routing & State Management

- **TanStack Router** - Type-safe file-based routing
- **TanStack Query** - Server state management and data fetching
- **react-oidc-context** - OIDC authentication

### UI & Styling

- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library built on Radix UI
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Icon library

### AI & Internationalization

- **Vercel AI SDK** - AI chat and streaming capabilities
- **i18next** - Internationalization framework

### Developer Tools

- **Vitest** - Unit testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Development Guide

### Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling with the new Tailwind v4 Vite plugin.

### Linting & Formatting

```bash
npm run lint      # Check for linting errors
npm run format    # Check formatting
npm run check     # Auto-fix formatting and linting issues
```

### Adding shadcn/ui Components

Add new UI components using the latest version of [shadcn/ui](https://ui.shadcn.com/):

```bash
npx shadcn@latest add button
```

Components are added to `src/components/ui/`.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes/`.

### Route Structure

```
src/routes/
├── __root.tsx              # Root layout (wraps all routes)
├── index.tsx               # Home page (/)
├── (auth)/                 # Auth group (unauthenticated routes)
│   └── login.tsx          # Login page
└── (workspace)/            # Workspace group (authenticated routes)
    ├── proposals/
    ├── sources/
    └── settings/
```

### Adding A Route

Create a new file in `./src/routes/`. TanStack Router will automatically:

1. Generate the route configuration
2. The `routeTree.gen.ts` will be updated automatically.
3. Make the route available in your app

**Example:** Create `src/routes/about.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return <div>About Page</div>;
}
```

### Navigation

Use the `Link` component for SPA navigation:

```tsx
import { Link } from '@tanstack/react-router';

<Link to="/proposals">View Proposals</Link>;
```

### Route Layouts

Layouts are defined in `src/routes/__root.tsx`. The `<Outlet />` component renders child routes.

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <>
      <header>Navigation...</header>
      <Outlet /> {/* Child routes render here */}
      <footer>Footer...</footer>
    </>
  ),
});
```

### Protected Routes

Use `beforeLoad` to protect routes. It is preferred to use it inside `Layout` components.

```tsx
export const Route = createFileRoute('/(workspace)/settings')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: SettingsPage,
});
```

## Data Fetching

### TanStack Query Pattern

This app uses TanStack Query for server state management. All data fetching follows this pattern:

1. **Define API function** (`features/<feature>/lib/api.ts`)
2. **Create query options** (`features/<feature>/lib/query-options.ts`)
3. **Use in components** with `useQuery` or route loaders

**Example:**

```typescript
// 1. API function
export async function getProposalsApi(params?: ProposalsParams) {
  const { data } = await client.get<PaginatedResponse<Proposal>>('/proposals', {
    params,
  });
  return data;
}

// 2. Query options
export const proposalsQueryOptions = (params?: ProposalsParams) =>
  queryOptions({
    queryKey: ['proposals', params],
    queryFn: () => getProposalsApi(params),
  });

// 3. Use in component
function ProposalsList() {
  const { data, isLoading } = useQuery(
    proposalsQueryOptions({ page: 0, size: 10 }),
  );
  // ...
}
```

### Mutations

For data updates, use `useMutation` with proper cache invalidation:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createProposalApi } from '../lib/api';

function CreateProposalForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProposalApi,
    onSuccess: (newProposal) => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create proposal: ${error.message}`);
    },
  });

  const handleSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Proposal'}
      </button>
    </form>
  );
}
```

## Internationalization

The app supports multiple languages using **i18next**. Translation files are located in `public/locales/<lang>/`.

### Using Translations

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.description')}</p>

      {/* With interpolation */}
      <p>{t('greeting', { name: 'John' })}</p>

      {/* With pluralization */}
      <p>{t('items.count', { count: 5 })}</p>

      {/* Change language */}
      <button onClick={() => i18n.changeLanguage('fr')}>
        Français
      </button>
    </div>
  );
}
```

### Translation Files Structure

```
public/locales/
├── en/
│   └── translation.json
├── fr/
│   └── translation.json
├── es/
│   └── translation.json
└── de/
    └── translation.json
```

### Translation File Example

```json
{
  "welcome": {
    "title": "Welcome to CFP Classifier",
    "description": "Analyze and classify Call for Proposals"
  },
  "greeting": "Hello, {{name}}!",
  "items": {
    "count_one": "{{count}} item",
    "count_other": "{{count}} items"
  },
  "proposals": {
    "title": "Proposals",
    "create": "Create Proposal",
    "edit": "Edit Proposal",
    "delete": "Delete Proposal",
    "status": {
      "pending": "Pending",
      "analyzed": "Analyzed",
      "rejected": "Rejected"
    }
  }
}
```

### Best Practices for i18n

1. **Use namespaced keys:** `proposals.create` instead of `createProposal`
2. **Keep translations flat when possible:** Avoid deep nesting
3. **Use interpolation for dynamic content:** `t('greeting', { name })`
4. **Extract all user-facing text:** No hardcoded strings in components
5. **Use the same key structure across all languages**

### Adding a New Language

1. Create a new directory in `public/locales/<lang-code>/`
2. Add `translation.json` with all keys translated
3. Configure in `src/integrations/i18n.ts` if needed
4. Test all UI elements in the new language

## Environment Variables

Create a `.env` file in the frontend directory. You can use `.env.example` as a template.

**Required Configuration:**

```bash
# OIDC Configuration
VITE_OIDC_AUTHORITY=http://localhost:8180/realms/local-dev
VITE_OIDC_CLIENT_ID=ilo-cfp-classifier-app
VITE_OIDC_REDIRECT_URI=http://localhost:3000
VITE_OIDC_SCOPE=openid email
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/login

# Dev Tools
VITE_SHOW_DEVTOOLS=false
```

**Accessing Environment Variables:**

All Vite environment variables must be prefixed with `VITE_` to be exposed to the client.

```typescript
// Access in TypeScript/TSX files
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const authority = import.meta.env.VITE_OIDC_AUTHORITY;

// TypeScript type safety
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_AUTHORITY: string;
  readonly VITE_OIDC_CLIENT_ID: string;
  readonly VITE_API_BASE_URL: string;
  // Add other env vars here
}
```

**Environment Files:**

- `.env` - Default environment variables

## Project Structure

```
frontend/
├── public/                      # Static assets
│   ├── locales/                # Translation files
│   │   ├── en/translation.json
│   │   ├── fr/translation.json
│   │   ├── es/translation.json
│   │   └── de/translation.json
│   ├── manifest.json
│   └── robots.txt
│
├── src/
│   ├── components/             # Shared UI components
│   │   ├── ui/                # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── app-sidebar.tsx    # Application sidebar navigation
│   │   ├── nav-routes.tsx     # Route navigation component
│   │   ├── nav-user.tsx       # User menu/profile dropdown
│   │   ├── language-picker.tsx # Language selector
│   │   ├── mode-toggle.tsx    # Dark/light mode toggle
│   │   └── theme-provider.tsx # Theme context provider
│   │
│   ├── features/              # Feature modules (business domains)
│   │   ├── auth/              # Authentication
│   │   │   └── components/
│   │   │       ├── loading-card.tsx
│   │   │       └── login-form.tsx
│   │   ├── proposals/         # CFP Proposals
│   │   │   ├── components/
│   │   │   │   ├── cfp-table.tsx
│   │   │   │   ├── cfp-columns.tsx
│   │   │   │   ├── overview-tab.tsx
│   │   │   │   ├── chat-tab.tsx
│   │   │   │   └── ai-elements/
│   │   │   └── lib/
│   │   │       ├── api.ts
│   │   │       ├── types.ts
│   │   │       ├── constants.ts
│   │   │       └── query-options.ts
│   │   ├── sources/           # Data sources
│   │   │   ├── components/
│   │   │   │   └── sources-table.tsx
│   │   │   └── lib/
│   │   ├── criterion-types/   # Classification criteria
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── notifications/     # User notifications
│   │       └── components/
│   │
│   ├── hooks/                 # Shared custom React hooks
│   │   ├── use-debounce.ts
│   │   └── use-mobile.ts
│   │
│   ├── integrations/          # Third-party library configurations
│   │   ├── auth.tsx           # OIDC authentication setup
│   │   ├── axios.tsx          # HTTP client with interceptors
│   │   ├── i18n.ts            # i18next configuration
│   │   ├── tanstack-query.tsx # TanStack Query client
│   │   └── tanstack-router.tsx # TanStack Router setup
│   │
│   ├── lib/                   # Shared utilities and types
│   │   ├── utils.ts           # Utility functions (cn, etc.)
│   │   ├── types.ts           # Global TypeScript types
│   │   ├── constants.ts       # Application-wide constants
│   │   └── config.ts          # Configuration values
│   │
│   ├── routes/                # File-based routing
│   │   ├── __root.tsx         # Root layout
│   │   ├── index.tsx          # Home page
│   │   ├── (auth)/            # Unauthenticated routes
│   │   │   └── login.tsx
│   │   └── (workspace)/       # Authenticated routes
│   │       ├── proposals/
│   │       ├── sources/
│   │       └── settings/
│   │
│   ├── index.tsx              # Application entry point
│   ├── routeTree.gen.ts       # Auto-generated route tree
│   └── styles.css             # Global styles (Tailwind)
│
├── .env                       # Environment variables (git-ignored)
├── .env.example               # Example environment file
├── .gitignore
├── components.json            # shadcn/ui configuration
├── docker-compose.yml         # Frontend Docker setup
├── Dockerfile
├── eslint.config.js           # ESLint configuration
├── index.html                 # HTML entry point
├── nginx.conf                 # Nginx configuration for production
├── package.json
├── prettier.config.js         # Prettier configuration
├── README.md                  # This file
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite configuration
```

### Key Directories Explained

**`src/features/`** - Business logic organized by domain

- Each feature is independent and self-contained
- Never import from other features
- Can contain any structure needed (components, lib, hooks, etc.)

**`src/components/`** - Reusable UI components

- Used across multiple features
- Includes shadcn/ui components in `ui/` subdirectory
- Application-level layout components

**`src/integrations/`** - Third-party library setup

- One file per major integration
- Provides centralized configuration
- Exports providers and configured instances

**`src/lib/`** - Shared utilities

- Common helper functions
- Global TypeScript types
- Application constants and configuration

**`src/routes/`** - File-based routing

- Managed by TanStack Router
- Automatic route tree generation
- Group routes with parentheses: `(auth)/`, `(workspace)/`

## Best Practices

### 1. Feature Independence

**The Golden Rule:** Features must be completely independent. Never import from other features.

```typescript
// ❌ BAD - Creates tight coupling
import { SourceSelector } from '@/features/sources/components/source-selector';

// ✅ GOOD - Use shared components
import { SourceSelector } from '@/components/source-selector';
```

**When to extract to shared:**

- Component is used by 2+ features → Extract to `src/components/`
- Utility function is used by 2+ features → Extract to `src/lib/utils.ts`
- Type is used by 2+ features → Extract to `src/lib/types.ts`
- Hook is used by 2+ features → Extract to `src/hooks/`

**When NOT to extract:**

- Feature-specific business logic → Keep in feature
- Single-use components → Keep in feature
- Feature-specific types → Keep in feature

### 2. Type Safety

**Define comprehensive types:**

```typescript
// ✅ Good - Strict typing with all properties
export type Proposal = {
  id: string;
  title: string;
  status: ProposalStatus;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
  metadata: ProposalMetadata;
};

export type ProposalStatus = 'pending' | 'analyzed' | 'rejected';

export type ProposalMetadata = {
  author?: string;
  tags: string[];
  priority: number;
};

// ✅ Good - Utility types for different use cases
export type CreateProposalInput = Omit<
  Proposal,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateProposalInput = Partial<CreateProposalInput> & { id: string };
```

**Use strict API typing:**

```typescript
// ✅ Type both request and response
export async function updateProposalApi(
  id: string,
  data: UpdateProposalInput,
): Promise<Proposal> {
  const { data: response } = await client.patch<Proposal>(
    `/proposals/${id}`,
    data,
  );
  return response;
}
```

### 3. Data Fetching Best Practices

**Use query options for consistency:**

```typescript
// ✅ Good - Centralized configuration
export const proposalsQueryOptions = (params?: ProposalsParams) =>
  queryOptions({
    queryKey: ['proposals', params],
    queryFn: () => getProposalsApi(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
```

**Handle loading and error states:**

```typescript
// ✅ Good - Comprehensive state handling
function ProposalList() {
  const { data, isLoading, isError, error, refetch } = useQuery(
    proposalsQueryOptions()
  );

  if (isLoading) {
    return <Skeleton count={5} />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <Button onClick={() => refetch()}>Retry</Button>
      </Alert>
    );
  }

  if (!data?.content.length) {
    return <EmptyState message="No proposals found" />;
  }

  return <Table data={data.content} />;
}
```

**Invalidate queries after mutations:**

```typescript
// ✅ Good - Specific invalidation
onSuccess: (newProposal) => {
  // Invalidate list queries
  queryClient.invalidateQueries({ queryKey: ['proposals'] });
};

// ❌ Bad - Too broad, refetches everything
onSuccess: () => {
  queryClient.invalidateQueries();
};
```

### 4. Error Handling

**Use toast notifications for user feedback:**

```typescript
// ✅ Good - User-friendly error messages
import { toast } from 'sonner';

const mutation = useMutation({
  mutationFn: deleteProposalApi,
  onSuccess: () => {
    toast.success('Proposal deleted successfully');
  },
  onError: (error) => {
    if (error.response?.status === 403) {
      toast.error('You do not have permission to delete this proposal');
    } else if (error.response?.status === 404) {
      toast.error('Proposal not found');
    } else {
      toast.error('Failed to delete proposal. Please try again.');
    }
  },
});
```

### 5. Performance Optimization

**Use proper query keys:**

```typescript
// ✅ Good - Specific keys with params
queryKey: ['proposals', { page, pageSize, status, search }];

// ❌ Bad - Too generic, can't invalidate specifically
queryKey: ['proposals'];
```

**Implement pagination:**

```typescript
function ProposalList() {
  const [pagination, setPagination] = useState({ page: 0, pageSize: 20 });

  const { data } = useQuery(
    proposalsQueryOptions(pagination)
  );

  return (
    <>
      <Table data={data?.content} />
      <Pagination
        page={pagination.page}
        totalPages={data?.totalPages}
        onPageChange={(page) => setPagination({ ...pagination, page })}
      />
    </>
  );
}
```

**Debounce search inputs:**

```typescript
import { useDebounce } from '@/hooks/use-debounce';

function ProposalSearch() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data } = useQuery(
    proposalsQueryOptions({ search: debouncedSearch })
  );

  return <Input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

### 6. Code Style and Consistency

**Keep imports organized:**

```typescript
// 1. External dependencies
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

// 2. Shared imports (alphabetically by category)
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { PaginatedResponse } from '@/lib/types';

// 3. Feature imports (relative)
import { createProposalApi } from '../lib/api';
import { proposalsQueryOptions } from '../lib/query-options';
import type { Proposal } from '../lib/types';
import { ProposalCard } from './proposal-card';
```

## Learn More

- [TanStack Router Documentation](https://tanstack.com/router) - File-based routing and loaders
- [TanStack Query Documentation](https://tanstack.com/query) - Server state management
- [React OIDC Context](https://github.com/authts/react-oidc-context) - OIDC authentication
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Vitest](https://vitest.dev/) - Testing framework
- [i18next](https://www.i18next.com/) - Internationalization

## Quick Reference

### File Naming Conventions

```bash
# Components/Utilities/Hooks (kebab-case)
user-profile.tsx
use-debounce.ts
query-options.ts
api.ts

# Types (kebab-case or same as component)
types.ts
proposal-types.ts

# Routes (kebab-case)
index.tsx
login.tsx
$id.tsx  # Dynamic parameter
```

### Import Aliases

```typescript
@/components/*     # src/components
@/features/*       # src/features
@/hooks/*          # src/hooks
@/lib/*            # src/lib
@/integrations/*   # src/integrations
@/routes/*         # src/routes
```

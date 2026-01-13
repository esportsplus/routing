# @esportsplus/routing

Type-safe client-side router with radix tree matching, middleware pipelines, and reactive navigation.

## Install

```bash
pnpm add @esportsplus/routing
```

## Features

- Type-safe route names and path parameters
- Radix tree matching (static > params > wildcards)
- Composable middleware pipeline
- Reactive navigation via `@esportsplus/reactivity`
- Named routes with URI generation
- Route factories for modular definitions
- Subdomain routing
- HTTP method routing (GET, POST, PUT, DELETE)

## Usage

### Define Routes

```typescript
import { router, Middleware, Next, Request, Route, RouteFactory } from '@esportsplus/routing/client';

type Response = HTMLElement;

// Route factory for modular definitions
const homeRoutes: RouteFactory<Response> = (r) => r
    .get({
        name: 'home',
        path: '/',
        responder: (req) => renderHome()
    })
    .get({
        name: 'about',
        path: '/about',
        responder: (req) => renderAbout()
    });

const userRoutes: RouteFactory<Response> = (r) => r
    .get({
        name: 'user',
        path: '/users/:id',
        responder: (req) => renderUser(req.data.parameters?.id)
    })
    .get({
        name: 'user.settings',
        path: '/users/:id/settings',
        middleware: [authMiddleware],
        responder: (req) => renderSettings(req.data.parameters?.id)
    });
```

### Create Router

```typescript
// Compose route factories
const app = router(homeRoutes, userRoutes);

// Navigate
app.redirect('home');
app.redirect('user', { id: 123 });

// Generate URIs
app.uri('user', { id: 456 }); // '#/users/456'

// History navigation
app.back();
app.forward();
```

### Middleware

```typescript
const authMiddleware: Middleware<Response> = (req, next) => {
    if (!isAuthenticated()) {
        return renderLogin();
    }
    return next(req);
};

const loggerMiddleware: Middleware<Response> = (req, next) => {
    console.log(`${req.method} ${req.path}`);
    return next(req);
};

// Apply global middleware and dispatch
app.middleware(loggerMiddleware).dispatch;
```

### Reactive Matching

```typescript
// Create fallback route
const notFound: Route<Response> = {
    name: 'not-found',
    path: null,
    pipeline: pipeline<Request<Response>, Response>(),
    subdomain: null
};

// Middleware that reactively matches routes
const matchMiddleware = app.middleware.match(notFound);

// Compose and dispatch
app.middleware(matchMiddleware, loggerMiddleware).dispatch;
```

### Route Groups

```typescript
const apiRoutes: RouteFactory<Response> = (r) => r
    .group({
        path: '/api/v1',
        middleware: [apiAuth]
    })
    .routes((r) => r
        .get({
            name: 'api.users',
            path: '/users',
            responder: handleUsers
        })
        .post({
            name: 'api.users.create',
            path: '/users',
            responder: handleCreateUser
        })
    );
```

### Path Parameters

```typescript
// Required parameter
.get({ name: 'user', path: '/users/:id', responder })

// Optional parameter (prefix with ?)
.get({ name: 'archive', path: '/posts/?:year/?:month', responder })

// Wildcard (captures rest of path)
.get({ name: 'files', path: '/files/*:path', responder })
```

### Subdomain Routing

```typescript
const adminRoutes: RouteFactory<Response> = (r) => r
    .get({
        name: 'admin.dashboard',
        path: '/dashboard',
        subdomain: 'admin',
        responder: renderAdminDashboard
    });
```

## Types

```typescript
// Route factory function
type RouteFactory<T> = (router: Router<T, any>) => Router<T, RouteRegistry>;

// Middleware function
type Middleware<T> = (input: Request<T>, next: Next<T>) => T;

// Next function in middleware chain
type Next<T> = (input: Request<T>) => T;

// Request object
type Request<T> = {
    data: Record<PropertyKey, unknown> & { parameters?: Record<string, unknown>; route?: Route<T> };
    hostname: string;
    href: string;
    method: string;
    origin: string;
    path: string;
    port: string;
    protocol: string;
    query: Record<string, unknown>;
    subdomain?: string;
};

// Route definition
type Route<T> = {
    name: string | null;
    path: string | null;
    pipeline: Pipeline<Request<T>, T>;
    subdomain: string | null;
};
```

## Route Matching Priority

1. **Static paths** - exact match (`/users`)
2. **Parameters** - dynamic segments (`/users/:id`)
3. **Wildcards** - catch-all (`/files/*:path`)

Static paths always take precedence over parameterized paths for the same position.

## Hash-Based Navigation

Routes use hash-based URLs (`#/path`) for client-side navigation without server configuration.

```typescript
// URL: https://example.com/#/users/123?tab=profile

request.path     // '/users/123'
request.query    // { tab: 'profile' }
request.hostname // 'example.com'
```

## License

MIT

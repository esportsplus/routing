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
import { router, Middleware, Next, Request, Route, Router } from '@esportsplus/routing/client';

type Response = HTMLElement;

const app = router(
    (r) => r
        .get({ name: 'home', path: '/', responder: () => renderHome() })
        .get({ name: 'user', path: '/users/:id', responder: (req) => renderUser(req.data.parameters?.id) })
);
```

### Create Router

```typescript
// Navigate
app.redirect('home');
app.redirect('user', { id: 123 });

// Generate URIs
app.uri('user', { id: 456 }); // '/users/456'

// History navigation
app.back();
app.forward();

// Intercept plain same-origin anchors so <a href="/users/456"> routes
// without a full page reload. Bind it wherever suits your frontend.
document.addEventListener('click', app.listener);
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

// Apply middleware chain — match route, log, then dispatch to route handler
let matchMiddleware = app.middleware.match(notFound);

app.middleware(matchMiddleware, loggerMiddleware, app.middleware.dispatch);
```

### Fallback Route

```typescript
// Create fallback route for unmatched paths
const notFound: Route<Response> = {
    name: 'not-found',
    path: null,
    handler: () => renderNotFound(),
    subdomain: null
};
```

### Route Groups

```typescript
const apiRoutes = (r: Router<Response>) => r
    .group({
        name: 'api.',
        path: '/api/v1',
        subdomain: 'api',
        middleware: [apiAuth]
    })
    .routes((r) => r
        .get({
            name: 'users',
            path: '/users',
            responder: handleUsers
        })
        .post({
            name: 'users.create',
            path: '/users',
            responder: handleCreateUser
        })
    );
```

### Path Parameters

```typescript
// Required parameter
.get({ name: 'user', path: '/users/:id', responder })

// Optional parameter (its own segment)
.get({ name: 'archive', path: '/posts/?:year/?:month', responder })

// Wildcard (captures one or more remaining segments)
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

`www` is normalised to the default subdomain (`''`). Group `name` and `path` values are prefixes; an inner non-empty `subdomain` overrides its group's subdomain.

## Compile-time route checks

Route names, paths, and subdomains should be string literals. Literal routes are checked while compiling: duplicate names and method/path shapes, conflicting parameter names, unknown route names, and missing required URI parameters are errors rather than runtime throws. Use an expression-body `routes()` callback, as above, so routes declared in a group remain visible to the type registry.

## Types

```typescript
// Middleware function
type Middleware<T> = (input: Request<T>, next: Next<T>) => T;

// Next function in middleware chain
type Next<T> = (input: Request<T>) => T;

// Request object
type Request<T> = {
    data: { parameters?: Readonly<Record<string, string>>; route?: Readonly<Route<T>> };
    hostname: string;
    href: string;
    method: string;
    origin: string;
    path: string;
    port: string;
    protocol: string;
    query: Record<string, string>;
    subdomain?: string;
};

// Route definition
type Route<T> = {
    name: string | null;
    path: string | null;
    handler: Next<T>;
    subdomain: string | null;
};
```

## Route Matching Priority

1. **Static paths** - exact match (`/users`)
2. **Parameters** - dynamic segments (`/users/:id`)
3. **Wildcards** - catch-all (`/files/*:path`)

Static paths always take precedence over parameterized paths for the same position.

## History-Based Navigation

Routes use the History API (`pushState`) for clean, hash-free client-side URLs. This
requires the server to serve the application shell for any matched path (SPA fallback).

```typescript
// URL: https://example.com/users/123?tab=profile

request.path     // '/users/123'
request.query    // { tab: 'profile' }
request.hostname // 'example.com'
```

`redirect()` navigates via `pushState`, browser back/forward is handled through
`popstate`, and `listener` intercepts same-origin anchor clicks (skipping
modifier-clicks, non-`_self` targets, `download`, and external links) so plain
`<a href="/path">` links navigate without a reload.

### Server Configuration (SPA Fallback)

Because routes are real URLs, the server must return the application shell
(`index.html`) for **any** path the client router owns. Without this, a direct
visit or a refresh on `/users/123` returns a `404` — the file does not exist on
disk; only the client knows how to render it.

Configure your host to rewrite unmatched, non-asset requests to `index.html`:

```nginx
# nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```js
// Express — register AFTER your API routes and static middleware
app.use(express.static('dist'));
app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
```

```
# Netlify — _redirects
/*  /index.html  200
```

```json
// Vercel — vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Keep the fallback below your static-asset and API handlers so real files and
endpoints are served directly and only client routes fall through to the shell.

## License

MIT

import { router } from './index';
import { Router } from './router';


let noop = () => 'x';


// ── B1-syntax: path literal validation ─────────────────────────────
new Router<string>().get({ path: '/users/:id', responder: noop });
new Router<string>().get({ path: '/users/?:id', responder: noop });
new Router<string>().get({ path: '/files/*:path', responder: noop });

// @ts-expect-error path must start with '/'
new Router<string>().get({ path: 'users/:id', responder: noop });
// @ts-expect-error optional parameter must be its own segment
new Router<string>().get({ path: '/users?:id', responder: noop });
// @ts-expect-error wildcard parameter must be the last segment
new Router<string>().get({ path: '/files/*:path/download', responder: noop });
// @ts-expect-error parameter name must not be empty
new Router<string>().get({ path: '/users/:', responder: noop });


// ── B4: duplicate path shape per method + subdomain ────────────────
new Router<string>()
    .get({ path: '/a', responder: noop })
    .get({ path: '/b', responder: noop });

new Router<string>()
    .get({ path: '/a', responder: noop })
    // @ts-expect-error path already registered
    .get({ path: '/a', responder: noop });

new Router<string>()
    .get({ path: '/users/:id', responder: noop })
    // @ts-expect-error identical dynamic shape
    .get({ path: '/users/:uid', responder: noop });

// Different method or subdomain is a different bucket.
new Router<string>()
    .get({ path: '/a', responder: noop })
    .post({ path: '/a', responder: noop });

new Router<string>()
    .get({ path: '/a', responder: noop })
    .get({ path: '/a', responder: noop, subdomain: 'api' });


// ── B4-name: duplicate full name ───────────────────────────────────
new Router<string>()
    .get({ name: 'home', path: '/a', responder: noop })
    // @ts-expect-error route name already in use
    .get({ name: 'home', path: '/b', responder: noop });

new Router<string>()
    .get({ name: 'home', path: '/a', responder: noop })
    .get({ name: 'about', path: '/b', responder: noop });


// ── B3: parameter-name conflict at same position ───────────────────
new Router<string>()
    .get({ path: '/users/:id/posts', responder: noop })
    // @ts-expect-error parameter name conflicts with an existing route
    .get({ path: '/users/:uid/comments', responder: noop });

new Router<string>()
    .get({ path: '/users/:id/posts', responder: noop })
    .get({ path: '/users/:id/comments', responder: noop });


// ── B10/B2/B11/B12: uri argument checks ────────────────────────────
let app = router(
    (r) => r
        .get({ name: 'home', path: '/', responder: noop })
        .get({ name: 'user', path: '/users/:id', responder: noop })
        .get({ name: 'archive', path: '/posts/?:year', responder: noop })
        .get({ name: 'files', path: '/files/*:path', responder: noop })
);

app.uri('home');
app.uri('user', { id: 1 });
app.uri('archive');
app.uri('archive', { year: 2026 });
app.uri('files', { path: 'a' });
app.uri('files', { path: ['a', 'b'] });

// @ts-expect-error required parameter cannot be omitted (B10)
app.uri('user');
// @ts-expect-error required parameter missing from object (B2)
app.uri('user', {});
// @ts-expect-error missing route name (B11)
app.uri('missing');
// @ts-expect-error wildcard parameter is required (B12)
app.uri('files');

app.redirect('user', { id: 1 });
app.redirect('https://example.com/away');
// @ts-expect-error required parameter cannot be omitted
app.redirect('user');


// ── B16: grouped route name / path prefix ──────────────────────────
let grouped = router(
    (r) => r
        .group({ name: 'api.', path: '/orgs/:org' })
        .routes((g) => g
            .get({ name: 'users', path: '/users/:id', responder: noop })
        )
);

grouped.uri('api.users', { org: 1, id: 2 });
// @ts-expect-error relative name is not registered
grouped.uri('users', { org: 1, id: 2 });
// @ts-expect-error group parameter :org is required
grouped.uri('api.users', { id: 2 });


// ── Unnamed routes do not widen the name registry (B11) ────────────
let anon = router((r) => r.get({ path: '/a', responder: noop }));

// @ts-expect-error no named routes exist
anon.uri('a');


// ── Cross-factory duplicate detection at router(...) ───────────────
router(
    (r) => r.get({ name: 'home', path: '/a', responder: noop }),
    (r) => r.get({ name: 'about', path: '/b', responder: noop })
);

router(
    // @ts-expect-error duplicate route name between route factories
    (r) => r.get({ name: 'home', path: '/a', responder: noop }),
    (r) => r.get({ name: 'home', path: '/b', responder: noop })
);

router(
    // @ts-expect-error duplicate path between route factories
    (r) => r.get({ path: '/shared', responder: noop }),
    (r) => r.get({ path: '/shared', responder: noop })
);


// ── ~100-route budget fixture across 5 factories ───────────────────
let budget = router(
    (r) => r
        .get({ name: 'a00', path: '/a/00', responder: noop })
        .get({ name: 'a01', path: '/a/01', responder: noop })
        .get({ name: 'a02', path: '/a/02/:id', responder: noop })
        .get({ name: 'a03', path: '/a/03', responder: noop })
        .get({ name: 'a04', path: '/a/04/:id/edit', responder: noop })
        .get({ name: 'a05', path: '/a/05', responder: noop })
        .get({ name: 'a06', path: '/a/06', responder: noop })
        .get({ name: 'a07', path: '/a/07/*:rest', responder: noop })
        .get({ name: 'a08', path: '/a/08', responder: noop })
        .get({ name: 'a09', path: '/a/09', responder: noop })
        .get({ name: 'a10', path: '/a/10', responder: noop })
        .get({ name: 'a11', path: '/a/11/:id', responder: noop })
        .get({ name: 'a12', path: '/a/12', responder: noop })
        .get({ name: 'a13', path: '/a/13', responder: noop })
        .get({ name: 'a14', path: '/a/14', responder: noop })
        .get({ name: 'a15', path: '/a/15/?:page', responder: noop })
        .get({ name: 'a16', path: '/a/16', responder: noop })
        .get({ name: 'a17', path: '/a/17', responder: noop })
        .get({ name: 'a18', path: '/a/18', responder: noop })
        .get({ name: 'a19', path: '/a/19', responder: noop }),
    (r) => r
        .get({ name: 'b00', path: '/b/00', responder: noop })
        .get({ name: 'b01', path: '/b/01', responder: noop })
        .get({ name: 'b02', path: '/b/02/:id', responder: noop })
        .get({ name: 'b03', path: '/b/03', responder: noop })
        .get({ name: 'b04', path: '/b/04/:id/edit', responder: noop })
        .get({ name: 'b05', path: '/b/05', responder: noop })
        .get({ name: 'b06', path: '/b/06', responder: noop })
        .get({ name: 'b07', path: '/b/07/*:rest', responder: noop })
        .get({ name: 'b08', path: '/b/08', responder: noop })
        .get({ name: 'b09', path: '/b/09', responder: noop })
        .get({ name: 'b10', path: '/b/10', responder: noop })
        .get({ name: 'b11', path: '/b/11/:id', responder: noop })
        .get({ name: 'b12', path: '/b/12', responder: noop })
        .get({ name: 'b13', path: '/b/13', responder: noop })
        .get({ name: 'b14', path: '/b/14', responder: noop })
        .get({ name: 'b15', path: '/b/15/?:page', responder: noop })
        .get({ name: 'b16', path: '/b/16', responder: noop })
        .get({ name: 'b17', path: '/b/17', responder: noop })
        .get({ name: 'b18', path: '/b/18', responder: noop })
        .get({ name: 'b19', path: '/b/19', responder: noop }),
    (r) => r
        .get({ name: 'c00', path: '/c/00', responder: noop })
        .get({ name: 'c01', path: '/c/01', responder: noop })
        .get({ name: 'c02', path: '/c/02/:id', responder: noop })
        .get({ name: 'c03', path: '/c/03', responder: noop })
        .get({ name: 'c04', path: '/c/04/:id/edit', responder: noop })
        .get({ name: 'c05', path: '/c/05', responder: noop })
        .get({ name: 'c06', path: '/c/06', responder: noop })
        .get({ name: 'c07', path: '/c/07/*:rest', responder: noop })
        .get({ name: 'c08', path: '/c/08', responder: noop })
        .get({ name: 'c09', path: '/c/09', responder: noop })
        .get({ name: 'c10', path: '/c/10', responder: noop })
        .get({ name: 'c11', path: '/c/11/:id', responder: noop })
        .get({ name: 'c12', path: '/c/12', responder: noop })
        .get({ name: 'c13', path: '/c/13', responder: noop })
        .get({ name: 'c14', path: '/c/14', responder: noop })
        .get({ name: 'c15', path: '/c/15/?:page', responder: noop })
        .get({ name: 'c16', path: '/c/16', responder: noop })
        .get({ name: 'c17', path: '/c/17', responder: noop })
        .get({ name: 'c18', path: '/c/18', responder: noop })
        .get({ name: 'c19', path: '/c/19', responder: noop }),
    (r) => r
        .get({ name: 'd00', path: '/d/00', responder: noop })
        .get({ name: 'd01', path: '/d/01', responder: noop })
        .get({ name: 'd02', path: '/d/02/:id', responder: noop })
        .get({ name: 'd03', path: '/d/03', responder: noop })
        .get({ name: 'd04', path: '/d/04/:id/edit', responder: noop })
        .get({ name: 'd05', path: '/d/05', responder: noop })
        .get({ name: 'd06', path: '/d/06', responder: noop })
        .get({ name: 'd07', path: '/d/07/*:rest', responder: noop })
        .get({ name: 'd08', path: '/d/08', responder: noop })
        .get({ name: 'd09', path: '/d/09', responder: noop })
        .get({ name: 'd10', path: '/d/10', responder: noop })
        .get({ name: 'd11', path: '/d/11/:id', responder: noop })
        .get({ name: 'd12', path: '/d/12', responder: noop })
        .get({ name: 'd13', path: '/d/13', responder: noop })
        .get({ name: 'd14', path: '/d/14', responder: noop })
        .get({ name: 'd15', path: '/d/15/?:page', responder: noop })
        .get({ name: 'd16', path: '/d/16', responder: noop })
        .get({ name: 'd17', path: '/d/17', responder: noop })
        .get({ name: 'd18', path: '/d/18', responder: noop })
        .get({ name: 'd19', path: '/d/19', responder: noop }),
    (r) => r
        .get({ name: 'e00', path: '/e/00', responder: noop })
        .get({ name: 'e01', path: '/e/01', responder: noop })
        .get({ name: 'e02', path: '/e/02/:id', responder: noop })
        .get({ name: 'e03', path: '/e/03', responder: noop })
        .get({ name: 'e04', path: '/e/04/:id/edit', responder: noop })
        .get({ name: 'e05', path: '/e/05', responder: noop })
        .get({ name: 'e06', path: '/e/06', responder: noop })
        .get({ name: 'e07', path: '/e/07/*:rest', responder: noop })
        .get({ name: 'e08', path: '/e/08', responder: noop })
        .get({ name: 'e09', path: '/e/09', responder: noop })
        .get({ name: 'e10', path: '/e/10', responder: noop })
        .get({ name: 'e11', path: '/e/11/:id', responder: noop })
        .get({ name: 'e12', path: '/e/12', responder: noop })
        .get({ name: 'e13', path: '/e/13', responder: noop })
        .get({ name: 'e14', path: '/e/14', responder: noop })
        .get({ name: 'e15', path: '/e/15/?:page', responder: noop })
        .get({ name: 'e16', path: '/e/16', responder: noop })
        .get({ name: 'e17', path: '/e/17', responder: noop })
        .get({ name: 'e18', path: '/e/18', responder: noop })
        .get({ name: 'e19', path: '/e/19', responder: noop })
);

budget.uri('a02', { id: 1 });
budget.uri('e15', { page: 2 });
budget.uri('c07', { rest: ['x', 'y'] });

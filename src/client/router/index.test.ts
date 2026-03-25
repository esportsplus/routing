import { describe, expect, it } from 'vitest';
import { Router } from './index';


type Mw = (input: unknown, next: Responder) => string;
type Responder = (input: unknown) => string;


function responder(label: string): Responder {
    return () => label;
}

function mw(label: string): Mw {
    return (_input, next) => label + ':' + next(_input);
}


describe('Router', () => {
    describe('match()', () => {
        it('matches static GET path', () => {
            let router = new Router<string>();

            router.get({ path: '/home', responder: responder('home') });

            let result = router.match('GET', '/home');

            expect(result.route).toBeDefined();
            expect(result.route!.path).toBe('/home');
        });

        it('matches dynamic path with parameters', () => {
            let router = new Router<string>();

            router.get({ path: '/users/:id', responder: responder('user') });

            let result = router.match('GET', '/users/42');

            expect(result.route).toBeDefined();
            expect(result.parameters).toEqual({ id: '42' });
        });

        it('returns empty for unregistered method', () => {
            let router = new Router<string>();

            router.get({ path: '/home', responder: responder('home') });

            let result = router.match('POST', '/home');

            expect(result.route).toBeUndefined();
        });

        it('returns empty for unregistered path', () => {
            let router = new Router<string>();

            router.get({ path: '/home', responder: responder('home') });

            let result = router.match('GET', '/missing');

            expect(result.route).toBeUndefined();
        });

        it('normalizes path (adds leading /, strips trailing /)', () => {
            let router = new Router<string>();

            router.get({ path: '/users', responder: responder('users') });

            let noLeading = router.match('GET', 'users'),
                trailing = router.match('GET', '/users/');

            expect(noLeading.route).toBeDefined();
            expect(noLeading.route!.path).toBe('/users');
            expect(trailing.route).toBeDefined();
            expect(trailing.route!.path).toBe('/users');
        });

        it('matches with subdomain bucketing', () => {
            let router = new Router<string>();

            router.get({ path: '/api', responder: responder('api'), subdomain: 'api' });

            let withSubdomain = router.match('GET', '/api', 'api'),
                withoutSubdomain = router.match('GET', '/api');

            expect(withSubdomain.route).toBeDefined();
            expect(withoutSubdomain.route).toBeUndefined();
        });

        it('static match takes priority over tree match', () => {
            let router = new Router<string>(),
                dynamicResponder = responder('dynamic'),
                staticResponder = responder('static');

            router.get({ path: '/users/:id', responder: dynamicResponder });
            router.get({ path: '/users/all', responder: staticResponder });

            let result = router.match('GET', '/users/all');

            expect(result.route).toBeDefined();
            expect(result.route!.path).toBe('/users/all');
            expect(result.route!.middleware).toContain(staticResponder);
        });
    });


    describe('on()', () => {
        it('registers route for single method', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/test', responder: responder('test') });

            let result = router.match('GET', '/test');

            expect(result.route).toBeDefined();
        });

        it('registers route for multiple methods', () => {
            let router = new Router<string>();

            router.on(['GET', 'POST'], { path: '/test', responder: responder('test') });

            let getResult = router.match('GET', '/test'),
                postResult = router.match('POST', '/test');

            expect(getResult.route).toBeDefined();
            expect(postResult.route).toBeDefined();
        });

        it('throws on duplicate route name', () => {
            let router = new Router<string>();

            router.on(['GET'], { name: 'home', path: '/home', responder: responder('home') });

            expect(() => {
                router.on(['GET'], { name: 'home', path: '/home2', responder: responder('home2') });
            }).toThrow("@esportsplus/routing: 'home' is already in use");
        });

        it('throws on duplicate static path', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/home', responder: responder('home1') });

            expect(() => {
                router.on(['GET'], { path: '/home', responder: responder('home2') });
            }).toThrow("@esportsplus/routing: static path '/home' is already in use");
        });

        it('expands optional parameters', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/users?:id', responder: responder('users') });

            let base = router.match('GET', '/users'),
                withParam = router.match('GET', '/users/42');

            expect(base.route).toBeDefined();
            expect(withParam.route).toBeDefined();
            expect(withParam.parameters).toEqual({ id: '42' });
        });

        it('registers subdomain (lowercased)', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/test', responder: responder('test'), subdomain: 'API' });

            expect(router.subdomains).toContain('api');
        });

        it('normalizes www subdomain to empty string', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/test', responder: responder('test'), subdomain: 'www' });

            let result = router.match('GET', '/test', '');

            expect(result.route).toBeDefined();
            expect(router.subdomains).toBeNull();
        });

        it('expands multiple optional parameters', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/items?:a?:b', responder: responder('items') });

            let base = router.match('GET', '/items'),
                oneParam = router.match('GET', '/items/x'),
                twoParams = router.match('GET', '/items/x/y');

            expect(base.route).toBeDefined();
            expect(oneParam.route).toBeDefined();
            expect(oneParam.parameters).toEqual({ a: 'x' });
            expect(twoParams.route).toBeDefined();
            expect(twoParams.parameters).toEqual({ a: 'x', b: 'y' });
        });

        it('stores named route in routes registry', () => {
            let router = new Router<string>();

            router.on(['GET'], { name: 'dashboard', path: '/dashboard', responder: responder('dash') });

            expect(router.routes['dashboard']).toBeDefined();
            expect(router.routes['dashboard'].path).toBe('/dashboard');
        });
    });


    describe('uri()', () => {
        it('generates static URI (no params)', () => {
            let router = new Router<string>();

            router.get({ name: 'home', path: '/home', responder: responder('home') });

            let uri = (router as any).uri('home');

            expect(uri).toBe('/home');
        });

        it('generates URI with required params', () => {
            let router = new Router<string>();

            router.get({ name: 'user', path: '/users/:id', responder: responder('user') });

            let uri = (router as any).uri('user', [42]);

            expect(uri).toBe('/users/42');
        });

        it('generates URI with optional params present', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            let uri = (router as any).uri('users', [7]);

            expect(uri).toBe('/users/7');
        });

        it('generates URI with optional params absent (stops at first missing)', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            let uri = (router as any).uri('users');

            expect(uri).toBe('/users');
        });

        it('generates URI with wildcard params', () => {
            let router = new Router<string>();

            router.get({ name: 'files', path: '/files/*:path', responder: responder('files') });

            let uri = (router as any).uri('files', ['docs', 'readme.txt']);

            expect(uri).toBe('/files/docs/readme.txt');
        });

        it('throws for non-existent route name', () => {
            let router = new Router<string>();

            expect(() => {
                (router as any).uri('missing');
            }).toThrow("@esportsplus/routing: route name 'missing' does not exist or it does not provide a path");
        });
    });


    describe('group()', () => {
        it('prefixes path to child routes', () => {
            let router = new Router<string>();

            router.group({ path: '/api' }).routes((r) => {
                r.get({ path: '/users', responder: responder('users') });
            });

            let result = router.match('GET', '/api/users');

            expect(result.route).toBeDefined();
        });

        it('cascades middleware to child routes', () => {
            let router = new Router<string>(),
                authMw = mw('auth');

            router.group({ middleware: [authMw as any] }).routes((r) => {
                r.get({ path: '/protected', responder: responder('protected') });
            });

            let result = router.match('GET', '/protected');

            expect(result.route).toBeDefined();
            expect(result.route!.middleware).toContain(authMw);
        });

        it('applies subdomain to child routes', () => {
            let router = new Router<string>();

            router.group({ subdomain: 'api' }).routes((r) => {
                r.get({ path: '/data', responder: responder('data') });
            });

            let withSubdomain = router.match('GET', '/data', 'api'),
                withoutSubdomain = router.match('GET', '/data');

            expect(withSubdomain.route).toBeDefined();
            expect(withoutSubdomain.route).toBeUndefined();
        });

        it('cleans up group stack after callback', () => {
            let router = new Router<string>();

            router.group({ path: '/api' }).routes((r) => {
                r.get({ path: '/inner', responder: responder('inner') });
            });

            router.get({ path: '/outer', responder: responder('outer') });

            let inner = router.match('GET', '/api/inner'),
                outer = router.match('GET', '/outer'),
                wrongOuter = router.match('GET', '/api/outer');

            expect(inner.route).toBeDefined();
            expect(outer.route).toBeDefined();
            expect(wrongOuter.route).toBeUndefined();
        });

        it('handles nested groups (path accumulation)', () => {
            let router = new Router<string>();

            router.group({ path: '/api' }).routes((r) => {
                r.group({ path: '/v1' }).routes((r2) => {
                    r2.get({ path: '/users', responder: responder('users') });
                });
            });

            let result = router.match('GET', '/api/v1/users');

            expect(result.route).toBeDefined();
        });
    });


    describe('HTTP method shortcuts', () => {
        it('get() registers for GET method', () => {
            let router = new Router<string>();

            router.get({ path: '/test', responder: responder('test') });

            let getResult = router.match('GET', '/test'),
                postResult = router.match('POST', '/test');

            expect(getResult.route).toBeDefined();
            expect(postResult.route).toBeUndefined();
        });

        it('post() registers for POST method', () => {
            let router = new Router<string>();

            router.post({ path: '/test', responder: responder('test') });

            let getResult = router.match('GET', '/test'),
                postResult = router.match('POST', '/test');

            expect(postResult.route).toBeDefined();
            expect(getResult.route).toBeUndefined();
        });

        it('put() registers for PUT method', () => {
            let router = new Router<string>();

            router.put({ path: '/test', responder: responder('test') });

            let putResult = router.match('PUT', '/test'),
                getResult = router.match('GET', '/test');

            expect(putResult.route).toBeDefined();
            expect(getResult.route).toBeUndefined();
        });

        it('delete() registers for DELETE method', () => {
            let router = new Router<string>();

            router.delete({ path: '/test', responder: responder('test') });

            let deleteResult = router.match('DELETE', '/test'),
                getResult = router.match('GET', '/test');

            expect(deleteResult.route).toBeDefined();
            expect(getResult.route).toBeUndefined();
        });
    });
});

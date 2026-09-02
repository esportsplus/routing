import { Request } from '../types';
import { describe, expect, it } from 'vitest';
import { Router } from './index';


type Mw = (input: Request<string>, next: Responder) => string;
type Responder = (input: Request<string>) => string;


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
            let router = new Router<string>();

            router.get({ path: '/users/:id', responder: responder('dynamic') });
            router.get({ path: '/users/all', responder: responder('static') });

            let result = router.match('GET', '/users/all');

            expect(result.route).toBeDefined();
            expect(result.route!.path).toBe('/users/all');
            expect(result.route!.handler({} as Request<string>)).toBe('static');
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

        it('expands optional parameters', () => {
            let router = new Router<string>();

            router.on(['GET'], { path: '/users/?:id', responder: responder('users') });

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

            router.on(['GET'], { path: '/items/?:a/?:b', responder: responder('items') });

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

            let uri = router.get({ name: 'home', path: '/home', responder: responder('home') }).uri('home');

            expect(uri).toBe('/home');
        });

        it('generates URI with required params', () => {
            let router = new Router<string>();

            router.get({ name: 'user', path: '/users/:id', responder: responder('user') });

            let uri = router.get({ name: 'user', path: '/users/:id', responder: responder('user') }).uri('user', { id: 42 });

            expect(uri).toBe('/users/42');
        });

        it('generates URI with optional params present', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            let uri = router.get({ name: 'users', path: '/users/?:id', responder: responder('users') }).uri('users', { id: 7 });

            expect(uri).toBe('/users/7');
        });

        it('generates URI with optional params absent (stops at first missing)', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            let uri = router.get({ name: 'users', path: '/users/?:id', responder: responder('users') }).uri('users');

            expect(uri).toBe('/users');
        });

        it('generates URI with wildcard params', () => {
            let router = new Router<string>();

            router.get({ name: 'files', path: '/files/*:path', responder: responder('files') });

            let uri = router.get({ name: 'files', path: '/files/*:path', responder: responder('files') }).uri('files', { path: ['docs', 'readme.txt'] });

            expect(uri).toBe('/files/docs/readme.txt');
        });

        it('generates URI from named params object', () => {
            let router = new Router<string>();

            router.get({ name: 'user', path: '/users/:id', responder: responder('user') });

            let uri = router.get({ name: 'user', path: '/users/:id', responder: responder('user') }).uri('user', { id: 42 });

            expect(uri).toBe('/users/42');
        });

        it('generates URI from named object with optional params present', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            let uri = router.get({ name: 'users', path: '/users/?:id', responder: responder('users') }).uri('users', { id: 7 });

            expect(uri).toBe('/users/7');
        });

        it('generates URI from named object with optional params absent', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            let uri = router.get({ name: 'users', path: '/users/?:id', responder: responder('users') }).uri('users', {});

            expect(uri).toBe('/users');
        });

        it('generates URI from named object with wildcard array', () => {
            let router = new Router<string>();

            router.get({ name: 'files', path: '/files/*:path', responder: responder('files') });

            let uri = router.get({ name: 'files', path: '/files/*:path', responder: responder('files') }).uri('files', { path: ['docs', 'readme.txt'] });

            expect(uri).toBe('/files/docs/readme.txt');
        });

        it('generates URI from named object with a scalar wildcard', () => {
            let router = new Router<string>();

            router.get({ name: 'files', path: '/files/*:path', responder: responder('files') });

            let uri = router.get({ name: 'files', path: '/files/*:path', responder: responder('files') }).uri('files', { path: 'docs' });

            expect(uri).toBe('/files/docs');
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
            let router = new Router<string>();

            router.group({ middleware: [mw('auth')] }).routes((r) => {
                r.get({ path: '/protected', responder: responder('protected') });
            });

            let result = router.match('GET', '/protected');

            expect(result.route).toBeDefined();
            expect(result.route!.handler({} as Request<string>)).toBe('auth:protected');
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


    describe('phase 1 fixes', () => {
        it('round-trips canonical optional path (B1)', () => {
            let router = new Router<string>();

            router.get({ name: 'users', path: '/users/?:id', responder: responder('users') });

            expect(router.match('GET', '/users').route).toBeDefined();
            expect(router.match('GET', '/users/42').route).toBeDefined();
            expect(router.match('GET', '/users/42').parameters).toEqual({ id: '42' });
            let typed = router.get({ name: 'typed-users', path: '/users/?:id', responder: responder('users') });

            expect(typed.uri('typed-users', { id: 42 })).toBe('/users/42');
            expect(typed.uri('typed-users')).toBe('/users');
        });

        it('round-trips multiple optional segments (B1)', () => {
            let router = new Router<string>();

            router.get({ name: 'items', path: '/items/?:a/?:b', responder: responder('items') });

            expect(router.match('GET', '/items').route).toBeDefined();
            expect(router.match('GET', '/items/x').parameters).toEqual({ a: 'x' });
            expect(router.match('GET', '/items/x/y').parameters).toEqual({ a: 'x', b: 'y' });
            let typed = router.get({ name: 'typed-items', path: '/items/?:a/?:b', responder: responder('items') });

            expect(typed.uri('typed-items', { a: 'x', b: 'y' })).toBe('/items/x/y');
            expect(typed.uri('typed-items', { a: 'x' })).toBe('/items/x');
        });

        it('inner subdomain overrides the group subdomain (B5)', () => {
            let router = new Router<string>();

            router.group({ subdomain: 'api' }).routes((r) => {
                r.get({ path: '/v1', responder: responder('v1'), subdomain: 'v1' });
            });

            let inner = router.match('GET', '/v1', 'v1'),
                outer = router.match('GET', '/v1', 'api');

            expect(inner.route).toBeDefined();
            expect(outer.route).toBeUndefined();
        });

        it('dedupes subdomains and stores longest-first (B6)', () => {
            let router = new Router<string>();

            router.group({ subdomain: 'api' }).routes((r) => {
                r.get({ path: '/a', responder: responder('a') });
                r.get({ path: '/b', responder: responder('b') });
                r.get({ path: '/c', responder: responder('c') });
            });

            router.get({ path: '/d', responder: responder('d'), subdomain: 'api-v2' });

            expect(router.subdomains).toEqual(['api-v2', 'api']);
        });

        it('pops the group stack when the callback throws (B8)', () => {
            let router = new Router<string>();

            expect(() => {
                router.group({ path: '/api' }).routes(() => {
                    throw new Error('boom');
                });
            }).toThrow('boom');

            expect(router.groups.length).toBe(0);
        });

        it('does not capture an empty segment as a parameter (B9)', () => {
            let router = new Router<string>();

            router.get({ path: '/a/:x', responder: responder('a') });

            let result = router.match('GET', '/a//');

            expect(result.route).toBeUndefined();
        });
    });
});

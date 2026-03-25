import { describe, expect, it } from 'vitest';
import { PARAMETER, STATIC, WILDCARD } from '../constants';
import { Node } from './node';


type MockRoute = { name: string; path: null; middleware: never[]; subdomain: null };


function route(name: string): MockRoute {
    return { name, path: null, middleware: [], subdomain: null };
}


describe('Node', () => {
    describe('add', () => {
        it('adds static path (single segment)', () => {
            let root = new Node<unknown>(),
                r = route('home');

            root.add('home', r);

            expect(root.static?.get('home')).toBeDefined();
            expect(root.static?.get('home')?.route).toBe(r);
        });

        it('adds multi-segment static path', () => {
            let root = new Node<unknown>(),
                r = route('about-team');

            root.add('about/team', r);

            let aboutNode = root.static?.get('about');

            expect(aboutNode).toBeDefined();
            expect(aboutNode?.static?.get('team')?.route).toBe(r);
        });

        it('adds parameter path and creates parameter child with correct name', () => {
            let root = new Node<unknown>(),
                r = route('user');

            root.add('users/:id', r);

            let usersNode = root.static?.get('users');

            expect(usersNode).toBeDefined();
            expect(usersNode?.parameter).toBeDefined();
            expect(usersNode?.parameter?.name).toBe('id');
            expect(usersNode?.parameter?.route).toBe(r);
        });

        it('adds wildcard path and creates wildcard child with correct name', () => {
            let root = new Node<unknown>(),
                r = route('catchall');

            root.add('files/*:path', r);

            let filesNode = root.static?.get('files');

            expect(filesNode).toBeDefined();
            expect(filesNode?.wildcard).toBeDefined();
            expect(filesNode?.wildcard?.name).toBe('path');
            expect(filesNode?.wildcard?.route).toBe(r);
        });

        it('adds mixed path (static + parameter segments)', () => {
            let root = new Node<unknown>(),
                r = route('user-post');

            root.add('users/:id/posts', r);

            let usersNode = root.static?.get('users');

            expect(usersNode?.parameter?.name).toBe('id');
            expect(usersNode?.parameter?.static?.get('posts')?.route).toBe(r);
        });

        it('reuses existing static nodes for shared prefixes', () => {
            let root = new Node<unknown>(),
                r1 = route('team'),
                r2 = route('contact');

            root.add('about/team', r1);
            root.add('about/contact', r2);

            let aboutNode = root.static?.get('about');

            expect(aboutNode?.static?.get('team')?.route).toBe(r1);
            expect(aboutNode?.static?.get('contact')?.route).toBe(r2);
        });

        it('reuses existing parameter node', () => {
            let root = new Node<unknown>(),
                r1 = route('user-posts'),
                r2 = route('user-comments');

            root.add('users/:id/posts', r1);
            root.add('users/:id/comments', r2);

            let paramNode = root.static?.get('users')?.parameter;

            expect(paramNode?.name).toBe('id');
            expect(paramNode?.static?.get('posts')?.route).toBe(r1);
            expect(paramNode?.static?.get('comments')?.route).toBe(r2);
        });

        it('handles unnamed parameters with auto-increment naming', () => {
            let root = new Node<unknown>(),
                r = route('unnamed');

            root.add(':/:', r);

            expect(root.parameter?.name).toBe('0');
            expect(root.parameter?.parameter?.name).toBe('1');
        });

        it('handles unnamed wildcard parameters', () => {
            let root = new Node<unknown>(),
                r = route('unnamed-wildcard');

            root.add('files/*:', r);

            let filesNode = root.static?.get('files');

            expect(filesNode?.wildcard?.name).toBe('0');
        });

        it('sets path, route, and type on terminal node', () => {
            let root = new Node<unknown>(),
                r1 = route('static-route'),
                r2 = route('param-route'),
                r3 = route('wild-route');

            let n1 = root.add('about', r1),
                n2 = root.add('users/:id', r2),
                n3 = root.add('files/*:path', r3);

            expect(n1.path).toBe('about');
            expect(n1.route).toBe(r1);
            expect(n1.type).toBe(STATIC);

            expect(n2.path).toBe('users/:id');
            expect(n2.route).toBe(r2);
            expect(n2.type).toBe(PARAMETER);

            expect(n3.path).toBe('files/*:path');
            expect(n3.route).toBe(r3);
            expect(n3.type).toBe(WILDCARD);
        });

        it('reuses existing wildcard node', () => {
            let root = new Node<unknown>(),
                r1 = route('catchall-1'),
                r2 = route('catchall-2');

            root.add('files/*:path', r1);
            root.add('docs/*:path', r2);

            let filesWildcard = root.static?.get('files')?.wildcard,
                docsWildcard = root.static?.get('docs')?.wildcard;

            expect(filesWildcard?.route).toBe(r1);
            expect(docsWildcard?.route).toBe(r2);
        });

        it('returns the terminal node', () => {
            let root = new Node<unknown>(),
                r = route('terminal');

            let result = root.add('a/b/c', r);

            expect(result).toBeInstanceOf(Node);
            expect(result.route).toBe(r);
            expect(result.path).toBe('a/b/c');
        });

        it('sets parent on child nodes', () => {
            let root = new Node<unknown>(),
                r = route('user');

            root.add('users/:id', r);

            let usersNode = root.static?.get('users');

            expect(usersNode?.parent).toBe(root);
            expect(usersNode?.parameter?.parent).toBe(usersNode);
        });
    });

    describe('find', () => {
        it('finds exact static path', () => {
            let root = new Node<unknown>(),
                r = route('home');

            root.add('home', r);

            let result = root.find('home');

            expect(result.route).toBe(r);
            expect(result.parameters).toBeUndefined();
        });

        it('returns empty object for no match', () => {
            let root = new Node<unknown>();

            root.add('home', route('home'));

            let result = root.find('about');

            expect(result.route).toBeUndefined();
            expect(result.parameters).toBeUndefined();
        });

        it('finds parameter path and extracts params', () => {
            let root = new Node<unknown>(),
                r = route('user');

            root.add('users/:id', r);

            let result = root.find('users/42');

            expect(result.route).toBe(r);
            expect(result.parameters).toEqual({ id: '42' });
        });

        it('static segment takes priority over parameter', () => {
            let root = new Node<unknown>(),
                rStatic = route('users-all'),
                rParam = route('user-by-id');

            root.add('users/:id', rParam);
            root.add('users/all', rStatic);

            let result = root.find('users/all');

            expect(result.route).toBe(rStatic);
            expect(result.parameters).toBeUndefined();
        });

        it('falls back to wildcard when no match', () => {
            let root = new Node<unknown>(),
                r = route('catchall');

            root.add('files/*:path', r);

            let result = root.find('files/docs/readme.txt');

            expect(result.route).toBe(r);
            expect(result.parameters).toEqual({ path: 'docs/readme.txt' });
        });

        it('wildcard captures remaining segments joined with /', () => {
            let root = new Node<unknown>(),
                r = route('catchall');

            root.add('api/*:rest', r);

            let result = root.find('api/v1/users/42/posts');

            expect(result.route).toBe(r);
            expect(result.parameters).toEqual({ rest: 'v1/users/42/posts' });
        });

        it('finds mixed static + parameter paths', () => {
            let root = new Node<unknown>(),
                r = route('user-posts');

            root.add('users/:id/posts', r);

            let result = root.find('users/7/posts');

            expect(result.route).toBe(r);
            expect(result.parameters).toEqual({ id: '7' });
        });

        it('returns empty when no parameter node and no static match', () => {
            let root = new Node<unknown>();

            root.add('users/list', route('users-list'));

            let result = root.find('users/999');

            expect(result.route).toBeUndefined();
            expect(result.parameters).toBeUndefined();
        });

        it('finds root-level segments', () => {
            let root = new Node<unknown>(),
                r = route('root-param');

            root.add(':slug', r);

            let result = root.find('hello');

            expect(result.route).toBe(r);
            expect(result.parameters).toEqual({ slug: 'hello' });
        });

        it('wildcard fallback when terminal node has no route', () => {
            let root = new Node<unknown>(),
                rWild = route('catchall');

            // Add wildcard at root level
            root.add('*:rest', rWild);

            // Add a static node that does NOT have a route (intermediate only)
            root.add('api/v1/endpoint', route('endpoint'));

            // "api/v1" matches static nodes but the "v1" node has no route
            let result = root.find('api/v1');

            expect(result.route).toBe(rWild);
            expect(result.parameters).toEqual({ rest: 'api/v1' });
        });

        it('multiple parameters in path', () => {
            let root = new Node<unknown>(),
                r = route('user-post');

            root.add('users/:userId/posts/:postId', r);

            let result = root.find('users/5/posts/99');

            expect(result.route).toBe(r);
            expect(result.parameters).toEqual({ userId: '5', postId: '99' });
        });

        it('finds multi-segment static path', () => {
            let root = new Node<unknown>(),
                r = route('deep');

            root.add('a/b/c/d', r);

            let result = root.find('a/b/c/d');

            expect(result.route).toBe(r);
            expect(result.parameters).toBeUndefined();
        });

        it('returns empty on empty root with no routes', () => {
            let root = new Node<unknown>();

            let result = root.find('anything');

            expect(result.route).toBeUndefined();
            expect(result.parameters).toBeUndefined();
        });

        it('parameter fallback when static does not exist for segment', () => {
            let root = new Node<unknown>(),
                rParam = route('by-id'),
                rStatic = route('known');

            root.add('items/:id', rParam);
            root.add('items/known', rStatic);

            let result = root.find('items/unknown-value');

            expect(result.route).toBe(rParam);
            expect(result.parameters).toEqual({ id: 'unknown-value' });
        });
    });
});

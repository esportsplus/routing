import { Router } from '../src/client/router';
import { test } from 'vitest';


let responder = () => 'x';


function build() {
    return new Router<string>()
        .get({ name: 'about', path: '/about', responder })
        .get({ name: 'comments', path: '/users/:id/posts/:postId/comments', responder })
        .get({ name: 'files', path: '/files/*:path', responder })
        .get({ name: 'home', path: '/', responder })
        .get({ name: 'optional', path: '/archive/:year/?:month', responder })
        .get({ name: 'user', path: '/users/:id', responder });
}


let router = build();


test('Router.match', async ({ bench }) => {
    await bench.compare(
        bench('static hit', () => {
            router.match('GET', '/about');
        }),
        bench('3-deep param hit', () => {
            router.match('GET', '/users/1/posts/2/comments');
        }),
        bench('wildcard fallback', () => {
            router.match('GET', '/files/a/b/c.txt');
        }),
        bench('miss', () => {
            router.match('GET', '/nope/nope/nope');
        })
    );
});

test('Router.uri', async ({ bench }) => {
    await bench.compare(
        bench('static', () => {
            router.uri('about');
        }),
        bench('2 named params', () => {
            router.uri('comments', { id: 1, postId: 2 });
        }),
        bench('optional omitted', () => {
            router.uri('optional', { year: 2026 });
        }),
        bench('wildcard', () => {
            router.uri('files', { path: ['a', 'b', 'c.txt'] });
        })
    );
});

import { bench, describe } from 'vitest';
import { Router } from '../src/client/router';


let responder = () => 'x';

function build() {
    let router = new Router<string>();

    router.get({ path: '/', responder });
    router.get({ path: '/about', responder });
    router.get({ path: '/users/:id', responder });
    router.get({ path: '/users/:id/posts/:postId/comments', responder });
    router.get({ path: '/files/*:path', responder });

    return router;
}


let router = build();


describe('Router.match', () => {
    bench('static hit', () => {
        router.match('GET', '/about');
    });

    bench('3-deep param hit', () => {
        router.match('GET', '/users/1/posts/2/comments');
    });

    bench('wildcard fallback', () => {
        router.match('GET', '/files/a/b/c.txt');
    });

    bench('miss', () => {
        router.match('GET', '/nope/nope/nope');
    });
});

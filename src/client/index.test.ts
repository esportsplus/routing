// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { router } from './index';
import type { Request, Route, Router } from './types';


function fallback(request: Request<string>): string {
    return request.path;
}

function route(): Route<string> {
    return {
        handler: fallback,
        name: null,
        path: null,
        subdomain: null
    };
}

function setUrl(url: string) {
    window.location.href = url;
}


afterEach(() => {
    setUrl('http://localhost/');
    document.body.replaceChildren();
});


describe('client router', () => {
    it('skips clicks the browser must handle', () => {
        let app = router((r: Router<string>) => r.get({ name: 'next', path: '/next', responder: fallback })),
            anchor = document.createElement('a'),
            event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

        anchor.href = '/next';
        Object.defineProperty(event, 'target', { value: anchor });
        app.listener(event);
        expect(event.defaultPrevented).toBe(false);

        anchor.target = '_top';
        event = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'target', { value: anchor });
        app.listener(event);
        expect(event.defaultPrevented).toBe(false);

        event = new MouseEvent('click', { bubbles: true, cancelable: true });
        event.preventDefault();
        Object.defineProperty(event, 'target', { value: anchor });
        app.listener(event);
        expect(window.location.pathname).toBe('/');

        anchor.removeAttribute('target');
        anchor.href = 'https://outside.example/next';
        event = new MouseEvent('click', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'target', { value: anchor });
        app.listener(event);
        expect(event.defaultPrevented).toBe(false);
    });

    it('redirect updates the reactive request', () => {
        let app = router((r: Router<string>) => r
                .get({ name: 'home', path: '/', responder: fallback })
                .get({ name: 'next', path: '/next', responder: fallback })
            ),
            match = app.middleware.match(route()),
            run = () => app.middleware(match, app.middleware.dispatch);

        expect(run()).toBe('/');
        app.redirect('next');
        expect(window.location.pathname).toBe('/next');
        expect(run()).toBe('/next');
    });

    it('matches the longest complete subdomain and exposes it', () => {
        setUrl('https://api-v2.example.com/');

        let app = router((r: Router<string>) => r
                .get({ path: '/', subdomain: 'api', responder: (request) => request.subdomain || '' })
                .get({ path: '/', subdomain: 'api-v2', responder: (request) => request.subdomain || '' })
            ),
            match = app.middleware.match(route()),
            run = () => app.middleware(match, app.middleware.dispatch);

        expect(run()).toBe('api-v2');

        setUrl('https://apiary.example.com/');
        app = router((r: Router<string>) => r.get({ path: '/', subdomain: 'api', responder: (request) => request.subdomain || '' }));
        match = app.middleware.match(route());
        run = () => app.middleware(match, app.middleware.dispatch);

        expect(run()).toBe('/');
    });
});

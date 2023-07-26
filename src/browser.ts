import { effect, reactive, root } from '@esportsplus/reactivity';
import { html } from '@esportsplus/template';
import { Middleware, Next, Request, Router } from './types';
import pipeline from '@esportsplus/pipeline';
import factory from './router';


let cache: Request<any>[] = [];


function back() {
    window.history.back();
}

function forward() {
    window.history.forward();
}

function href<T>(): Request<T> {
    let { hash, hostname, href, origin, port, protocol } = new URL( window.location?.href || '' ),
        path = hash ? hash.slice(1).split('?') : ['/', ''];

    return {
        data: {},
        href,
        hostname,
        method: 'GET',
        origin,
        path: path[0],
        port,
        protocol,
        query: path[1] ? Object.fromEntries( (new URLSearchParams(path[1])).entries() ) : {},
    };
}

function normalize(uri: string) {
    if (uri[0] === '/') {
        return '#' + uri;
    }

    return uri;
}

function onpopstate() {
    let values = href();

    for (let i = 0, n = cache.length; i < n; i++) {
        let state = cache[i];

        for (let key in values) {
            // @ts-ignore
            state[key] = values[key];
        }
    }
}


export default <T>(instance?: Router<T>) => {
    let request = reactive( href<T>() ),
        router = instance || factory<T>();

    if (cache.push(request) === 1) {
        window.addEventListener('hashchange', onpopstate);
    }

    function match(subdomain?: string) {
        if (router.subdomains !== null) {
            for (let i = 0, n = router.subdomains.length; i < n; i++) {
                if (!request.hostname.startsWith(router.subdomains[i])) {
                    continue;
                }

                subdomain = router.subdomains[i];
                break;
            }
        }

        return router.match(request.method, request.path, subdomain || '');
    }

    match.middleware = (subdomain?: string) => {
        let state = reactive<ReturnType<typeof router.match>>({
                parameters: undefined,
                route: undefined
            });

        effect(() => {
            let { parameters, route } = match(subdomain);

            state.parameters = parameters;
            state.route = route;
        });

        return (request: Request<T>, next: Next<T>) => {
            return html`${() => {
                if (state.route === undefined) {
                    throw new Error(`Routing: route is undefined!`);
                }

                return root(() => {
                    request.data.parameters = state.parameters;
                    request.data.route = state.route;

                    return next(request);
                });
            }}`;
        };
    };

    return {
        back,
        forward,
        match,
        middleware: (...middleware: Middleware<T>[]) => {
            let instance = pipeline(...middleware);

            return () => instance(request);
        },
        redirect: (path: string, values: unknown[] = []) => {
            if (path.indexOf('://') !== -1) {
                return window.location.replace(path);
            }

            window.location.hash = normalize( router.uri(path, values) );
        },
        router,
        uri: (path: string, values: unknown[] = []) => {
            return normalize( router.uri(path, values) );
        }
    };
};
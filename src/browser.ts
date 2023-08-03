import { effect, reactive, root, Root, Scheduler } from '@esportsplus/reactivity';
import { html } from '@esportsplus/template';
import { Middleware, Next, Request, Route, Router } from './types';
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

function match<T>(request: Request<T>, router: Router<T>, subdomain?: string) {
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

function middleware<T>(request: Request<T>, router: Router<T>) {
    function host(...middleware: Middleware<T>[]) {
        let instance = pipeline(...middleware);

        return () => instance(request);
    };

    host.dispatch = (request: Request<T>) => {
        let { route } = request.data;

        if (route === undefined) {
            throw new Error(`Middleware: route is undefined!`);
        }

        return route.dispatch(request);
    };

    host.match = (fallback: Route<T>, scheduler: Scheduler, subdomain?: string) => {
        let state = reactive<ReturnType<typeof router.match> & { root?: Root }>({
                parameters: undefined,
                route: undefined,
                root: undefined
            });

        if (fallback === undefined) {
            throw new Error('Middleware: fallback route does not exist');
        }

        effect(() => {
            let { parameters, route } = match(request, router, subdomain);

            state.parameters = parameters;
            state.route = route || fallback;
        });

        return (request: Request<T>, next: Next<T>) => {
            return html`${() => {
                if (state.route === undefined) {
                    throw new Error('Routing: route is undefined');
                }

                if (state.root !== undefined) {
                    state.root.dispose();
                }

                return root((instance) => {
                    request.data.parameters = state.parameters;
                    request.data.route = state.route;

                    state.root = instance;

                    return next(request);
                }, scheduler);
            }}`;
        };
    };

    return host;
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

    return {
        back,
        forward,
        middleware: middleware(request, router),
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
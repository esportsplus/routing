import { effect, reactive, root, Root } from '@esportsplus/reactivity';
import { Middleware, Next, Request, Route, Router } from './types';
import { next } from '@esportsplus/pipeline';
import factory from './router';


let cache: Request<any>[] = [];


function back() {
    window.history.back();
}

function forward() {
    window.history.forward();
}

function href<T>() {
    let data = new URL( window.location?.href || '' ),
        path = data.hash ? data.hash.slice(1).split('?') : ['/', ''],
        request = {
            href: data.href,
            hostname: data.hostname,
            method: 'GET',
            origin: data.origin,
            path: path[0],
            port: data.port,
            protocol: data.protocol,
            query: {} as Record<PropertyKey, unknown>
        };

    if (path[1]) {
        for (let [key, value] of (new URLSearchParams(path[1])).entries()) {
            request.query[key] = value;
        }
    }

    return request as Request<T>;
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
        return middleware[0](request, next(1, middleware));
    };

    host.dispatch = (request: Request<T>) => {
        let { route } = request.data;

        if (route === undefined) {
            throw new Error(`Routing: route is undefined!`);
        }

        return route.pipeline.dispatch(request);
    };

    host.match = (fallback: Route<T>) => {
        let state = reactive<ReturnType<typeof router.match> & { root?: Root }>({
                parameters: undefined,
                root: undefined,
                route: undefined
            });

        if (fallback === undefined) {
            throw new Error('Routing: fallback route does not exist');
        }

        effect(() => {
            let { parameters, route } = match(request, router);

            state.parameters = parameters;
            state.route = route || fallback;
        });

        return (request: Request<T>, next: Next<T>) => {
            if (state.route === undefined) {
                throw new Error('Routing: route is undefined');
            }

            if (state.root !== undefined) {
                state.root.dispose();
            }

            return root((root) => {
                request.data = {
                    parameters: state.parameters,
                    route: state.route
                };
                state.root = root;

                return next(request);
            });
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
    let request = reactive( Object.assign(href<T>(), { data: {} } as any) as Request<T> ),
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
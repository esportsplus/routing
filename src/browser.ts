import { effect, reactive, root } from '@esportsplus/reactivity';
import pipeline from '@esportsplus/pipeline';
import { Middleware, Next, PathParamsTuple, Request, Route, Router, RouteRegistry } from './types';
import { Router as RouterClass } from './router';
import factory from './router';


let cache: Request<any>[] = [],
    location = window.location;


function back() {
    window.history.back();
}

function forward() {
    window.history.forward();
}

function href<T>() {
    let hash = location.hash || '#/',
        path = hash ? hash.slice(1).split('?') : ['/', ''],
        request = {
            hostname: location.hostname,
            href: location.href,
            method: 'GET',
            origin: location.origin,
            path: path[0],
            port: location.port,
            protocol: location.protocol,
            query: {} as Record<PropertyKey, unknown>
        };

    if (path[1]) {
        let params = new URLSearchParams(path[1]),
            query = request.query;

        for (let [key, value] of params.entries()) {
            query[key] = value;
        }
    }

    return request as Request<T>;
}

function match<T>(request: Request<T>, router: Router<T>, subdomain?: string) {
    if (router.subdomains !== null) {
        let hostname = request.hostname,
            subdomains = router.subdomains;

        for (let i = 0, n = subdomains.length; i < n; i++) {
            if (!hostname.startsWith(subdomains[i])) {
                continue;
            }

            subdomain = subdomains[i];
            break;
        }
    }

    return router.match(request.method, request.path, subdomain || '');
}

function middleware<T>(request: Request<T>, router: Router<T>) {
    function host(...middleware: Middleware<T>[]) {
        return pipeline(middleware);
    };

    host.dispatch = (request: Request<T>) => {
        let { route } = request.data;

        if (route === undefined) {
            throw new Error(`Routing: route is undefined!`);
        }

        return route.pipeline.dispatch(request);
    };

    host.match = (fallback: Route<T>) => {
        let state = reactive<ReturnType<typeof router.match>>({
                parameters: undefined,
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

            return root(() => {
                request.data = {
                    parameters: state.parameters,
                    route: state.route
                };

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


export default <T, TRoutes extends RouteRegistry = {}>(instance?: RouterClass<T, TRoutes>) => {
    let request = reactive( Object.assign(href<T>(), { data: {} } as any) as Request<T> ),
        router = instance || factory<T>() as RouterClass<T, TRoutes>;

    if (cache.push(request) === 1) {
        window.addEventListener('hashchange', onpopstate);
    }

    return {
        back,
        forward,
        middleware: middleware(request, router as Router<T>),
        redirect: <TName extends keyof TRoutes & string>(
            name: TName,
            values: PathParamsTuple<TRoutes[TName]['path']> = [] as any
        ) => {
            if ((name as string).indexOf('://') !== -1) {
                return window.location.replace(name);
            }

            window.location.hash = normalize( router.uri(name, values) );
        },
        router,
        uri: <TName extends keyof TRoutes & string>(
            name: TName,
            values: PathParamsTuple<TRoutes[TName]['path']> = [] as any
        ) => {
            return normalize( router.uri(name, values) );
        }
    };
};
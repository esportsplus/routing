import { effect, reactive, root } from '@esportsplus/reactivity';
import { AccumulateRoutes, ExtractOptionalParams, ExtractRequiredParams, InferOutput, Middleware, Next, PathParamsObject, Request, Route, RouteFactory, RoutePath } from './types';
import { Router } from './router';
import pipeline from '@esportsplus/pipeline';
import { PACKAGE_NAME } from './constants';


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
    let middleware = pipeline<Request<T>, T>();

    function host(...stages: Middleware<T>[]) {
        for (let i = 0, n = stages.length; i < n; i++) {
            middleware.add( stages[i] );
        }

        return middleware.dispatch(request) as T;
    };

    host.dispatch = (request: Request<T>) => {
        let { route } = request.data;

        if (route === undefined) {
            throw new Error(`${PACKAGE_NAME}: route is undefined!`);
        }

        return route.pipeline.dispatch(request);
    };

    host.match = (fallback: Route<T>) => {
        let state = reactive<ReturnType<typeof router.match>>({
                parameters: undefined,
                route: undefined
            });

        if (fallback === undefined) {
            throw new Error(`${PACKAGE_NAME}: fallback route does not exist`);
        }

        effect(() => {
            let { parameters, route } = match(request, router);

            state.parameters = parameters;
            state.route = route || fallback;
        });

        return (request: Request<T>, next: Next<T>) => {
            if (state.route === undefined) {
                throw new Error(`${PACKAGE_NAME}: route is undefined`);
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


const router = <const Factories extends readonly RouteFactory<any>[]>(...factories: Factories) => {
    type Routes = AccumulateRoutes<Factories>;
    type T = InferOutput<Factories[number]>;

    let instance = factories.reduce(
            (r, factory) => factory(r),
            new Router<T, {}>() as Router<T, any>
        ) as Router<T, Routes>,
        request = reactive<Request<T>>(Object.assign(href<T>(), { data: {} } as any));

    if (cache.push(request) === 1) {
        window.addEventListener('hashchange', onpopstate);
    }

    return {
        back,
        forward,
        middleware: middleware(request, instance as Router<T>),
        redirect: <RouteName extends keyof Routes>(
            name: RouteName,
            ...values: ExtractRequiredParams<RoutePath<Routes, RouteName>> extends never
                ? ExtractOptionalParams<RoutePath<Routes, RouteName>> extends never
                    ? []
                    : [params?: PathParamsObject<RoutePath<Routes, RouteName>>]
                : [params: PathParamsObject<RoutePath<Routes, RouteName>>]
        ) => {
            if ((name as string).indexOf('://') !== -1) {
                return window.location.replace(name as any);
            }

            window.location.hash = normalize(instance.uri(name as any, values as any));
        },
        routes: instance.routes,
        uri: <RouteName extends keyof Routes>(
            name: RouteName,
            ...values: ExtractRequiredParams<RoutePath<Routes, RouteName>> extends never
                ? ExtractOptionalParams<RoutePath<Routes, RouteName>> extends never
                    ? []
                    : [params?: PathParamsObject<RoutePath<Routes, RouteName>>]
                : [params: PathParamsObject<RoutePath<Routes, RouteName>>]
        ) => {
            return normalize(instance.uri(name as any, values as any));
        }
    };
};


export { router };
export type {
    Middleware,
    Next,
    Request, Route, Router, RouteFactory
} from './types';

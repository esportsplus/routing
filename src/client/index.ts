import { effect, reactive, root } from '@esportsplus/reactivity';
import { AccumulateRoutes, ExtractOptionalParams, ExtractRequiredParams, InferOutput, Middleware, Next, PathParamsObject, Request, RequestState, Route, RouteFactory, RoutePath } from './types';
import { Router } from './router';
import { PACKAGE_NAME } from './constants';


let location = window.location,
    requests: RequestState[] = [];


function back() {
    window.history.back();
}

function build<T>(stages: Middleware<T>[]): Next<T> {
    let chain: Next<T> = () => { throw new Error(`${PACKAGE_NAME}: final stage did not return a value`); };

    for (let i = stages.length - 1; i >= 0; i--) {
        let next = chain,
            stage = stages[i];

        chain = (input) => stage(input, next);
    }

    return chain;
}

function forward() {
    window.history.forward();
}

function href<T>() {
    let request = {
            hostname: location.hostname,
            href: location.href,
            method: 'GET',
            origin: location.origin,
            path: location.pathname || '/',
            port: location.port,
            protocol: location.protocol,
            query: {} as Record<string, string>
        };

    if (location.search) {
        let params = new URLSearchParams(location.search),
            query = request.query;

        for (let [key, value] of params.entries()) {
            query[key] = value;
        }
    }

    return request as Request<T>;
}

function listener(event: MouseEvent) {
    let anchor = (event.target as Element | null)?.closest('a');

    if (!anchor) {
        return;
    }

    if (
        event.altKey || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey ||
        anchor.hasAttribute('download') || anchor.origin !== location.origin || anchor.target === '_blank'
    ) {
        return;
    }

    event.preventDefault();
    window.history.pushState(null, '', anchor.href);
    update();
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
    let stages: Middleware<T>[] = [];

    function host(...middleware: Middleware<T>[]) {
        for (let i = 0, n = middleware.length; i < n; i++) {
            stages.push( middleware[i] );
        }

        return build(stages)(request);
    };

    host.dispatch = (request: Request<T>) => {
        let { route } = request.data as { route: Route<T> | undefined };

        if (route === undefined) {
            throw new Error(`${PACKAGE_NAME}: route is undefined!`);
        }

        if (typeof route.middleware !== 'function') {
            route.middleware = build(route.middleware);
        }

        return route.middleware(request);
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

function update() {
    let values = href();

    for (let i = 0, n = requests.length; i < n; i++) {
        let request = requests[i];

        request.hostname = values.hostname;
        request.href = values.href;
        request.method = values.method;
        request.origin = values.origin;
        request.path = values.path;
        request.port = values.port;
        request.protocol = values.protocol;
        request.query = values.query;
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

    if (requests.push(request) === 1) {
        window.addEventListener('popstate', update);
    }

    return {
        back,
        forward,
        listener,
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

            window.history.pushState(null, '', instance.uri(name as any, values[0] as any));
            update();
        },
        uri: <RouteName extends keyof Routes>(
            name: RouteName,
            ...values: ExtractRequiredParams<RoutePath<Routes, RouteName>> extends never
                ? ExtractOptionalParams<RoutePath<Routes, RouteName>> extends never
                    ? []
                    : [params?: PathParamsObject<RoutePath<Routes, RouteName>>]
                : [params: PathParamsObject<RoutePath<Routes, RouteName>>]
        ) => {
            return instance.uri(name as any, values[0] as any);
        }
    };
};


export { router };
export type {
    Middleware,
    Next,
    Request, Route, Router, RouteFactory
} from './types';

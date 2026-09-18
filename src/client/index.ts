import { effect, reactive, root } from '@esportsplus/reactivity';
import { PACKAGE_NAME } from './constants';
import { build, Router } from './router';
import type { AccumulateRoutes, Group, Middleware, Next, UriArguments, Registry, Request, Route, RouteFactory, ValidateFactories } from './types';


let requests: Omit<Request<unknown>, 'data' | 'subdomain'>[] = [];


function back() {
    window.history.back();
}

function forward() {
    window.history.forward();
}

function href<T>() {
    let location = window.location,
        request = {
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

    if (!anchor || event.defaultPrevented) {
        return;
    }

    if (
        event.altKey || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey ||
        anchor.hasAttribute('download') || anchor.origin !== window.location.origin ||
        (anchor.target && anchor.target !== '_self')
    ) {
        return;
    }

    event.preventDefault();
    window.history.pushState(null, '', anchor.href);
    update();
}

function match<T>(request: Request<T>, router: Router<T, Registry, Group>, subdomain?: string) {
    if (router.subdomains !== null) {
        let hostname = request.hostname,
            subdomains = router.subdomains;

        for (let i = 0, n = subdomains.length; i < n; i++) {
            if (!hostname.startsWith(subdomains[i] + '.')) {
                continue;
            }

            subdomain = subdomains[i];
            request.subdomain = subdomain;
            break;
        }
    }

    return router.match(request.method, request.path, subdomain || '');
}

function middleware<T>(request: Request<T>, router: Router<T, Registry, Group>) {
    let stages: Middleware<T>[] = [];

    function host(...middleware: Middleware<T>[]) {
        for (let i = 0, n = middleware.length; i < n; i++) {
            stages.push( middleware[i] );
        }

        return build(stages)(request);
    };

    host.dispatch = (request: Request<T>) => {
        let { route } = request.data;

        if (route === undefined) {
            throw new Error(`${PACKAGE_NAME}: route is undefined!`);
        }

        return route.handler(request);
    };

    host.match = (fallback: Route<T>) => {
        if (fallback === undefined) {
            throw new Error(`${PACKAGE_NAME}: fallback route does not exist`);
        }

        let matching = reactive<ReturnType<typeof router.match>>({
                parameters: undefined,
                route: undefined
            });

        effect(() => {
            let { parameters, route } = match(request, router);

            matching.parameters = parameters;
            matching.route = route || fallback;
        });

        return (request: Request<T>, next: Next<T>) => {
            let parameters = matching.parameters,
                route = matching.route;

            if (route === undefined) {
                throw new Error(`${PACKAGE_NAME}: route is undefined`);
            }

            return root(() => {
                request.data = {
                    parameters,
                    route
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


const router = <T, const Factories extends readonly RouteFactory<T>[]>(...factories: Factories & readonly RouteFactory<T>[] & ValidateFactories<Factories, T>) => {
    type Routes = AccumulateRoutes<Factories, T>;

    let router = factories.reduce(
            (router, factory) => factory(router as Router<T, { names: {}; paths: never }, { name: ''; path: ''; subdomain: '' }>),
            new Router<T, { names: {}; paths: never }, { name: ''; path: ''; subdomain: '' }>() as Router<T, Registry, { name: ''; path: ''; subdomain: '' }>
        ) as Router<T, Routes, { name: ''; path: ''; subdomain: '' }>,
        request = reactive<Request<T>>(Object.assign(href<T>(), { data: { parameters: undefined, route: undefined } }));

    if (requests.push(request) === 1) {
        document.addEventListener('click', listener);
        window.addEventListener('popstate', update);
    }

    let uri = router.uri.bind(router);

    return {
        back,
        forward,
        middleware: middleware(request, router),
        redirect: <Name extends keyof Routes['names'] & string>(name: Name, ...values: UriArguments<Routes, Name>) => {
            if (name.indexOf('://') !== -1) {
                window.location.replace(name);
                return;
            }

            window.history.pushState(null, '', uri(name, ...values));
            update();
        },
        shutdown: () => {
            let index = requests.indexOf(request);

            if (index !== -1) {
                requests.splice(index, 1);
            }

            if (requests.length === 0) {
                document.removeEventListener('click', listener);
                window.removeEventListener('popstate', update);
            }
        },
        uri
    };
};


export { router };
export type { Middleware, Next, Request, Route, Router, RouteFactory, UriArguments } from './types';

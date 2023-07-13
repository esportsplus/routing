import { reactive } from '@esportsplus/reactivity';
import { Middleware, Request, Response, Router } from './types';
import middleware from '@esportsplus/middleware';


let cache: Request[] = [],
    registered = false;


function back() {
    window.history.back();
}

function forward() {
    window.history.forward();
}

function normalize(uri: string) {
    if (uri[0] === '/') {
        return '#' + uri;
    }

    return uri;
}

function request(): Request {
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
        query: path[1] ? Object.fromEntries( (new URLSearchParams(path[1])).entries() ) : {}
    };
}

function event() {
    let values = request();

    for (let i = 0, n = cache.length; i < n; i++) {
        let state = cache[i];

        for (let key in values) {
            // @ts-ignore
            state[key] = values[key];
        }
    }
}


export default <R>(router: Router<R>) => {
    let state = reactive( request() );

    cache.push(state);

    if (!registered) {
        registered = true;
        window.addEventListener('popstate', event);
    }

    return {
        back,
        forward,
        middleware: (...fns: Middleware<R>[]) => {
            let pipeline = middleware<Request, Response<R>>(...fns);

            return () => pipeline(state);
        },
        redirect: (path: string, { state, values }: { state?: Record<PropertyKey, unknown>; values?: unknown[] }) => {
            if (path.startsWith('https://') || path.startsWith('http://')) {
                return window.location.replace(path);
            }

            window.history.pushState( (state || {}), '', normalize(router.uri(path, values || [])) );
        },
        uri: (path: string, values: unknown[] = []) => {
            return normalize( router.uri(path, values || []) );
        }
    };
};
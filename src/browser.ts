import { reactive } from '@esportsplus/reactivity';
import { Middleware, Request, Response, Router } from './types';
import pipeline from '@esportsplus/pipeline';
import factory from './router';


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

function onpopstate() {
    let values = request();

    for (let i = 0, n = cache.length; i < n; i++) {
        let state = cache[i];

        for (let key in state) {
            // @ts-ignore
            state[key] = values[key];
        }
    }
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
        query: path[1] ? Object.fromEntries( (new URLSearchParams(path[1])).entries() ) : {},
    };
}


export default <R>(instance?: Router<R>) => {
    let router = instance || factory<R>(),
        state = reactive( request() );

    cache.push(state);

    if (!registered) {
        registered = true;
        window.addEventListener('popstate', onpopstate);
    }

    return {
        back,
        forward,
        middleware: (...fns: Middleware<R>[]) => {
            let instance = pipeline<Request, Response<R>>(...fns);

            return () => instance(state);
        },
        redirect: (path: string, { state, values }: { state?: Record<PropertyKey, unknown>; values?: unknown[] }) => {
            if (path.startsWith('https://') || path.startsWith('http://')) {
                return window.location.replace(path);
            }

            window.history.pushState( (state || {}), '', normalize(router.uri(path, values || [])) );
        },
        router,
        uri: (path: string, values: unknown[] = []) => {
            return normalize( router.uri(path, values || []) );
        }
    };
};
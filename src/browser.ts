import { reactive } from '@esportsplus/reactivity';
import { Middleware, Request, Router } from './types';
import pipeline from '@esportsplus/pipeline';
import factory from './router';


let cache: Request<any>[] = [],
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

        for (let key in values) {
            // @ts-ignore
            state[key] = values[key];
        }
    }
}

function request<T>(): Request<T> {
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


export default <T>(instance?: Router<T>) => {
    let router = instance || factory<T>(),
        state = reactive( request<T>() );

    cache.push(state);

    if (!registered) {
        registered = true;
        window.addEventListener('hashchange', onpopstate);
    }

    return {
        back,
        forward,
        middleware: (...middleware: Middleware<T>[]) => {
            let instance = pipeline(...middleware);

            return {
                pipeline: () => instance(state),
                request: state
            };
        },
        redirect: (path: string, values: unknown[] = []) => {
            if (path.startsWith('https://') || path.startsWith('http://')) {
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
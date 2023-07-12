import { Request, Router } from './types';


type Cache<T = Record<string, unknown>> = {
    factory: () => T;
    state: T;
};


let cache: Cache[] = [];


function request(url: string = window?.location?.href || ''): Request {
    let { hash, hostname, href, origin, port, protocol } = new URL( url ),
        path = hash?.replace('#/', '/')?.split('?') || ['/', ''];

    return {
        data: {},
        href,
        hostname,
        method: 'GET',
        origin,
        path: path[0],
        port,
        protocol,
        query: Object.fromEntries( (new URLSearchParams(path[1])).entries() )
    };
}

function update() {
    for (let i = 0, n = cache.length; i < n; i++) {
        let { factory, state } = cache[i],
            values = factory();

        for (let key in values) {
            state[key] = values[key];
        }
    }
}


const back = () => window.history.back();

const forward = () => window.history.forward();


export default (router: Router, fn: Cache['factory'] = request) => {
    let state = {} as ReturnType< typeof fn >;

    cache.push({
        factory: fn,
        state
    });

    update();

    window.addEventListener('popstate', update);

    return {
        back,
        forward,
        redirect: (path: string, { state, values }: { state?: Record<PropertyKey, unknown>; values?: unknown[] }) => {
            if (path.startsWith('http://') || path.startsWith('https://')) {
                return window.location.replace(path);
            }

            let uri = router.uri(path, values || []);

            if (uri[0] === '/') {
                uri = '#' + uri;
            }

            window.history.pushState(state || {}, '', uri);
        },
        request: state,
        uri: (path: string, values: unknown[] = []) => {
            let uri = router.uri(path, values || []);

            if (uri[0] === '/') {
                uri = '#' + uri;
            }

            return uri;
        }
    };
};
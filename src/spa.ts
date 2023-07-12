import { Request, Router } from './types';


type Cache = {
    factory: typeof request;
    state: Request;
};


let cache: Cache[] = [];


function update() {
    for (let i = 0, n = cache.length; i < n; i++) {
        let { factory, state } = cache[i],
            values: Request = factory();

        for (let key in values) {
            // @ts-ignore STFU
            state[key] = values[key];
        }
    }
}


const back = () => window.history.back();

const forward = () => window.history.forward();

const request = (url: string = window?.location?.href || ''): Request => {
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
};


export default (router: Router, state: Cache['state'], factory?: Cache['factory']) => {
    cache.push({
        factory: factory || request,
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
        request: factory || request,
        uri: (path: string, values: unknown[] = []) => {
            let uri = router.uri(path, values || []);

            if (uri[0] === '/') {
                uri = '#' + uri;
            }

            return uri;
        }
    };
};
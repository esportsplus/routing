import { Request, Router } from './types';


let state = request();


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

function request<R>(): Request<R> {
    let { hash, hostname, href, origin, port, protocol } = new URL( window?.location?.href || '' ),
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
    let values = request();

    for (let key in values) {
        // @ts-ignore
        state[key] = values[key];
    }
}


export default <R>(router: Router<R>) => {
    window.addEventListener('popstate', update);

    return {
        back,
        forward,
        redirect: (path: string, { state, values }: { state?: Record<PropertyKey, unknown>; values?: unknown[] }) => {
            if (path.startsWith('https://') || path.startsWith('http://')) {
                return window.location.replace(path);
            }

            window.history.pushState( (state || {}), '', normalize(router.uri(path, values || [])) );
        },
        request: state,
        uri: (path: string, values: unknown[] = []) => {
            return normalize( router.uri(path, values || []) );
        }
    };
};
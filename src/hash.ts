import { Router } from './types';


let cache: {
        factory: typeof request;
        state: Record<PropertyKey, unknown>;
    }[] = [],
    registered = false;


function update() {
    for (let i = 0, n = cache.length; i < n; i++) {
        let { factory, state } = cache[i],
            values = factory();

        for (let key in values) {
            state[key] = values[key as keyof typeof values];
        }
    }
}


const back = () => window.history.back();

const forward = () => window.history.forward();

const listener = {
    register: (factory: typeof cache[0]['factory'], state: typeof cache[0]['state']) => {
        cache.push({ factory, state });

        if (!registered) {
            registered = true;
            update();

            window.addEventListener('popstate', update);
        }

        return () => {
            listener.remove(state);
        };
    },
    remove: (state: typeof cache[0]['state']) => {
        for (let i = 0, n = cache.length; i < n; i++) {
            if (cache[i].state !== state) {
                continue;
            }

            cache[i] = cache[n - 1];
            cache.pop();

            if (cache.length === 0) {
                window.removeEventListener('popstate', update);
            }
            return;
        }
    }
};

const factory = {
    redirect: (router: Router) => {
        return (path: string, { state, values }: { state?: Record<PropertyKey, unknown>; values?: unknown[] }) => {
            if (path.startsWith('http://') || path.startsWith('https://')) {
                return window.location.replace(path);
            }

            let uri = router.uri(path, values || []);

            if (uri[0] === '/') {
                uri = '#' + uri;
            }

            window.history.pushState(state || {}, '', uri);
        };
    },
    uri: (router: Router) => {
        return (path: string, values: unknown[] = []) => {
            let uri = router.uri(path, values || []);

            if (uri[0] === '/') {
                uri = '#' + uri;
            }

            return uri;
        };
    }
};

const request = (url: string = window?.location?.href || '') => {
    let { hash, hostname, href, origin, port, protocol } = new URL( url ),
        path = hash?.replace('#/', '/')?.split('?') || ['/', ''];

    return {
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


export default { back, factory, forward, listener, request };
export { back, factory, forward, listener, request };
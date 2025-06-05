import { ON_DELETE, ON_GET, ON_POST, ON_PUT, STATIC } from '~/constants';
import { Name, Options, Request, Route, RouteOptions } from '~/types';
import { Node } from './node';
import pipeline from '@esportsplus/pipeline';


function normalize(path: string) {
    if (path[0] !== '/') {
        path = '/' + path;
    }

    if (path.at(-1) === '/') {
        path = path.slice(0, -1);
    }

    return path || '/';
}

function radixkey(method: string, path: string, subdomain?: string | null) {
    return ((subdomain ? subdomain + ' ' : '') + method).toUpperCase() + ' ' + normalize(path);
}

function set<T>(route: Route<T>, options: Options<T> | RouteOptions<T>) {
    for (let key in options) {
        let value = options[key as keyof typeof options] as any;

        if (key === 'middleware') {
            for (let i = 0, n = value.length; i < n; i++) {
                route.pipeline.add(value[i]);
            }
        }
        else if (key === 'responder') {
            route.pipeline.add(value);
        }
        else {
            // @ts-ignore
            route[key] = (route[key] || '') + value;
        }
    }
}


class Router<T> {
    groups: Options<T>[] = [];
    root: Node<T>;
    routes: Record<Name, Route<T>> = {};
    static: Record<Name, Route<T>> = {};
    subdomains: string[] | null = null;


    constructor() {
        this.root = new Node();
    }


    private add(radixkey: string, route: Route<T>) {
        if (radixkey.indexOf(':') === -1 || this.root.add(radixkey, route).type === STATIC) {
            if (this.static[radixkey]) {
                throw new Error(`Routing: static path '${radixkey}' is already in use`);
            }

            this.static[radixkey] = route;
        }

        return this;
    }

    private route(options: RouteOptions<T>) {
        let groups = this.groups,
            route: Route<T> = {
                name: null,
                path: null,
                pipeline: pipeline<Request<T>, T>(),
                subdomain: null
            };

        for (let i = 0, n = groups.length; i < n; i++) {
            set(route, groups[i]);
        }

        set(route, options);

        if (route.path) {
            route.path = normalize(route.path);
        }

        if (route.subdomain === 'www') {
            route.subdomain = '';
        }

        return route;
    }


    delete(options: RouteOptions<T>) {
        return this.on(ON_DELETE, options);
    }

    get(options: RouteOptions<T>) {
        return this.on(ON_GET, options);
    }

    group(options: Options<T>) {
        return {
            routes: (fn: (router: Router<T>) => void) => {
                this.groups.push(options);
                fn(this);
                this.groups.pop();
            }
        }
    }

    match(method: string, path: string, subdomain?: string | null) {
        let key = radixkey(method, path, subdomain);

        if (key in this.static) {
            return {
                route: this.static[key] as Readonly<Route<T>>
            };
        }

        return this.root.find(key);
    }

    on(methods: string[], options: RouteOptions<T>) {
        let route = this.route(options);

        if (route.name) {
            if (this.routes[route.name]) {
                throw new Error(`Routing: '${route.name}' is already in use`);
            }

            this.routes[route.name] = route;
        }

        if (route.path) {
            for (let i = 0, n = methods.length; i < n; i++) {
                let key = radixkey(methods[i], route.path, route.subdomain);

                if (key.indexOf('?:') !== -1) {
                    let segments = key.split('?:'),
                        url = '';

                    for (let i = 0, n = segments.length; i < n; i++) {
                        this.add((url += (i > 0 ? '/:' : '/') + segments[i]), route);
                    }
                }
                else {
                    this.add(key, route);
                }
            }
        }

        if (route.subdomain) {
            if (!this.subdomains) {
                this.subdomains = [route.subdomain];
            }
            else {
                this.subdomains.push(route.subdomain);
            }
        }

        return this;
    }

    post(options: RouteOptions<T>) {
        return this.on(ON_POST, options);
    }

    put(options: RouteOptions<T>) {
        return this.on(ON_PUT, options);
    }

    uri(name: Name, values: unknown[] = []) {
        let path = this.routes[name]?.path;

        if (!path) {
            throw new Error(`Routing: route name '${name}' does not exist or it does not provide a path`);
        }

        let resolved = [] as typeof values,
            segments = path.split('/'),
            v = 0;

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                symbol = segment[0];

            if (symbol === ':') {
                resolved.push(values[v++]);
            }
            else if (symbol === '?') {
                if (values[v] === undefined) {
                    break;
                }

                resolved.push(values[v++]);
            }
            else if (symbol === '*') {
                for (let n = values.length; v < n; v++) {
                    resolved.push( values[v] );
                }
                break;
            }
            else {
                resolved.push(segment);
            }
        }

        return resolved.join('/');
    }
}


export default <T>() => new Router<T>();
export { Router };
export type { Route };
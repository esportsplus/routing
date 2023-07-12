import { STATIC } from '~/constants';
import { Options } from '~/types';
import { Node } from './node';
import { normalize, radixkey } from './path';
import { Route } from './route';


let { isArray } = Array;


function set(route: Route, key: keyof Route, value?: unknown) {
    if (!value) {
        return;
    }

    if (!route[key]) {
        (route[key] as unknown) = value;
    }
    else if (typeof value === 'string') {
        if (typeof route[key] === 'string') {
            (route[key] as string) += value;
        }
    }
    else if (isArray(value)) {
        if (isArray(route[key])) {
            (route[key] as unknown[]).push( ...value );
        }
    }
}


class Router {
    groups: Omit<Options, 'responder'>[] = [];
    root: Node;
    routes: Record<string, Route> = {};
    static: Record<string, Route> = {};
    subdomains: string[] | null = null;


    constructor() {
        this.root = new Node();
    }


    private add(radixkey: string, route: Route) {
        if (radixkey.indexOf(':') === -1 || this.root.add(radixkey, route).type === STATIC) {
            if (this.static[radixkey]) {
                throw new Error(`Routing: static path '${radixkey}' is already in use`);
            }

            this.static[radixkey] = route;
        }

        return this;
    }

    private route({ middleware, name, path, responder, subdomain }: Options) {
        let route = new Route(responder);

        for (let i = 0, n = this.groups.length; i < n; i++) {
            let { middleware, name, path, subdomain } = this.groups[i];

            set(route, 'name', name);
            set(route, 'path', path);
            set(route, 'stack', middleware);
            set(route, 'subdomain', subdomain);
        }

        set(route, 'name', name);
        set(route, 'path', path);
        set(route, 'stack', middleware);
        set(route, 'subdomain', subdomain);

        if (route.path) {
            route.path = normalize(route.path);
        }

        if (route.subdomain === 'www') {
            route.subdomain = '';
        }

        return route;
    }


    delete(options: Options) {
        this.on(['DELETE'], options);
        return this;
    }

    get(options: Options) {
        this.on(['GET'], options);
        return this;
    }

    group(options: Router['groups'][0]) {
        return {
            routes: (fn: (router: Router) => void) => {
                this.groups.push(options);
                fn(this);
                this.groups.pop();
            }
        }
    }

    match(method: string, path: string, subdomain?: string | null): ReturnType<Node['find']> {
        let key = radixkey(path, { method, subdomain });

        if (key in this.static) {
            return { route: this.static[key] };
        }

        return this.root.find(key);
    }

    on(methods: string[], options: Options) {
        let route = this.route(options);

        if (route.name) {
            if (this.routes[route.name]) {
                throw new Error(`Routing: '${route.name}' is already in use`);
            }

            this.routes[route.name] = route;
        }

        if (route.path) {
            for (let i = 0, n = methods.length; i < n; i++) {
                let key = radixkey(route.path, {
                        method: methods[i],
                        subdomain: route.subdomain
                    });

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

    post(options: Options) {
        this.on(['POST'], options);
        return this;
    }

    put(options: Options) {
        this.on(['PUT'], options);
        return this;
    }

    uri(name: string, values: unknown[] = []) {
        let path = this.routes[name]?.path;

        if (!path) {
            throw new Error(`Routing: route name '${name}' does not exist or it does not provide a path`);
        }

        let resolved = [] as typeof values,
            segments = path.split('/');

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                symbol = segment[0];

            if (symbol === ':') {
                resolved.push(values[i]);
            }
            else if (symbol === '?') {
                if (values[i] === undefined) {
                    break;
                }

                resolved.push(values[i]);
            }
            else if (symbol === '*') {
                resolved.push( ...values.slice(i) );
                break;
            }
            else {
                resolved.push(segment);
            }
        }

        return resolved.join('/');
    }
}


export default () => new Router();
export { Router, Route };
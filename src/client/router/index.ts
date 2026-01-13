import { ON_DELETE, ON_GET, ON_POST, ON_PUT, PACKAGE_NAME } from '../constants';
import { Route, Name, Options, PathParamsTuple, Request, RouteOptions, RouteRegistry } from '../types';
import { Node } from './node';
import pipeline from '@esportsplus/pipeline';


function key(method: string, subdomain?: string | null) {
    return (method + (subdomain ? ' ' + subdomain : '')).toUpperCase();
}

function normalize(path: string) {
    if (path) {
        if (path[0] !== '/') {
            path = '/' + path;
        }

        if (path.length > 1 && path[path.length - 1] === '/') {
            path = path.slice(0, -1);
        }
    }

    return path || '/';
}

function set<T>(route: Route<T>, options: Options<T> | RouteOptions<T>) {
    let pipeline = route.pipeline;

    for (let key in options) {
        let value = options[key as keyof typeof options] as any;

        if (key === 'middleware') {
            for (let i = 0, n = value.length; i < n; i++) {
                pipeline.add(value[i]);
            }
        }
        else if (key === 'responder') {
            pipeline.add(value);
        }
        else {
            // @ts-ignore
            route[key] = (route[key] || '') + value;
        }
    }
}


class Router<T, TRoutes extends RouteRegistry = {}> {
    bucket: Record<ReturnType<typeof key>, { root: Node<T>, static: Record<string, Route<T>> }> = {};
    groups: Options<T>[] = [];
    routes: Record<Name, Route<T>> = {};
    subdomains: string[] | null = null;


    private add(method: string, path: string, route: Route<T>) {
        let bucket = this.bucket[ key(method, route.subdomain) ] ??= {
                root: new Node(),
                static: {}
            };

        if (path.indexOf(':') === -1) {
            if (path in bucket.static) {
                throw new Error(`${PACKAGE_NAME}: static path '${path}' is already in use`);
            }

            bucket.static[path] = route;
        }
        else {
            bucket.root.add(path, route);
        }

        return this;
    }

    private create(options: RouteOptions<T>) {
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


    delete<RouteName extends string = string, RoutePath extends string = string>(
        options: RouteOptions<T> & { name?: RouteName; path?: RoutePath }
    ): Router<
        T,
        TRoutes & (
            RouteName extends string
                ? RoutePath extends string
                    ? { [K in RouteName]: { path: RoutePath } }
                    : TRoutes
                : TRoutes
        )
    > {
        this.on(ON_DELETE, options);
        return this as any;
    }

    get<RouteName extends string = string, RoutePath extends string = string>(
        options: RouteOptions<T> & { name?: RouteName; path?: RoutePath }
    ): Router<
        T,
        TRoutes & (
            RouteName extends string
                ? RoutePath extends string
                    ? { [K in RouteName]: { path: RoutePath } }
                    : TRoutes
                : TRoutes
        )
    > {
        this.on(ON_GET, options);
        return this as any;
    }

    group(options: Options<T>): {
        routes: (fn: (router: Router<T, TRoutes>) => void) => Router<T, TRoutes>
    } {
        return {
            routes: (fn: (router: Router<T, TRoutes>) => void) => {
                this.groups.push(options);
                fn(this);
                this.groups.pop();
                return this;
            }
        };
    }

    match(method: string, path: string, subdomain?: string | null) {
        let bucket = this.bucket[ key(method, subdomain) ];

        if (!bucket) {
            return {};
        }

        path = normalize(path);

        if (path in bucket.static) {
            return { route: bucket.static[path] };
        }

        return bucket.root.find(path);
    }

    on<RouteName extends string = string, RoutePath extends string = string>(
        methods: string[],
        options: RouteOptions<T> & { name?: RouteName; path?: RoutePath }
    ): Router<
        T,
        TRoutes & (
            RouteName extends string
                ? RoutePath extends string
                    ? { [K in RouteName]: { path: RoutePath } }
                    : TRoutes
                : TRoutes
        )
    > {
        let route = this.create(options);

        let name = route.name,
            path = route.path,
            subdomain = route.subdomain;

        if (name) {
            if (this.routes[name]) {
                throw new Error(`${PACKAGE_NAME}: '${name}' is already in use`);
            }

            this.routes[name] = route;
        }

        if (path) {
            for (let i = 0, n = methods.length; i < n; i++) {
                let method = methods[i];

                if (path.indexOf('?:') !== -1) {
                    let segments = path.split('?:'),
                        url = segments[0];

                    this.add(method, url, route);

                    for (let i = 1; i < segments.length; i++) {
                        url += '/:' + segments[i];
                        this.add(method, url, route);
                    }
                }
                else {
                    this.add(method, path, route);
                }
            }
        }

        if (subdomain) {
            (this.subdomains ??= []).push( subdomain.toLowerCase() );
        }

        return this as any;
    }

    post<RouteName extends string = string, RoutePath extends string = string>(
        options: RouteOptions<T> & { name?: RouteName; path?: RoutePath }
    ): Router<
        T,
        TRoutes & (
            RouteName extends string
                ? RoutePath extends string
                    ? { [K in RouteName]: { path: RoutePath } }
                    : TRoutes
                : TRoutes
        )
    > {
        this.on(ON_POST, options);
        return this as any;
    }

    put<RouteName extends string = string, RoutePath extends string = string>(
        options: RouteOptions<T> & { name?: RouteName; path?: RoutePath }
    ): Router<
        T,
        TRoutes & (
            RouteName extends string
                ? RoutePath extends string
                    ? { [K in RouteName]: { path: RoutePath } }
                    : TRoutes
                : TRoutes
        )
    > {
        this.on(ON_PUT, options);
        return this as any;
    }

    uri<RouteName extends keyof TRoutes & string>(
        name: RouteName,
        values: PathParamsTuple<TRoutes[RouteName]['path']> = [] as any
    ): string {
        let path = this.routes[name]?.path;

        if (!path) {
            throw new Error(`${PACKAGE_NAME}: route name '${name}' does not exist or it does not provide a path`);
        }

        let resolved: (string | number)[] = [],
            segments = path.split('/'),
            v = 0;

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                symbol = segment[0];

            if (symbol === ':') {
                resolved.push((values as (string | number)[])[v++]);
            }
            else if (symbol === '?') {
                if ((values as (string | number)[])[v] === undefined) {
                    break;
                }

                resolved.push((values as (string | number)[])[v++]);
            }
            else if (symbol === '*') {
                for (let n = values.length; v < n; v++) {
                    resolved.push((values as (string | number)[])[v]);
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


export { Router };
export type { Route };
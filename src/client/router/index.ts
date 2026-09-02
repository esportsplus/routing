import { EmptyRegistry, Group, MergeGroup, Middleware, Next, Options, Register, Registry, Root, Route, RouteOptions, UriArguments, ValidateName, ValidatePath } from '../types';
import { ON_DELETE, ON_GET, ON_POST, ON_PUT, PACKAGE_NAME } from '../constants';
import { Node } from './node';


function build<T>(stages: Middleware<T>[]): Next<T> {
    let chain: Next<T> = () => { throw new Error(`${PACKAGE_NAME}: final stage did not return a value`); };

    for (let i = stages.length - 1; i >= 0; i--) {
        let next = chain,
            stage = stages[i];

        chain = (input) => stage(input, next);
    }

    return chain;
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

function set<T>(state: { name: string | null; path: string | null; subdomain: string | null }, middleware: Middleware<T>[], options: Options<T> | RouteOptions<T>) {
    if (options.middleware) {
        for (let i = 0, n = options.middleware.length; i < n; i++) {
            middleware.push(options.middleware[i]);
        }
    }

    if ('responder' in options) {
        middleware.push((options as RouteOptions<T>).responder);
    }

    if (options.name) {
        state.name = (state.name || '') + options.name;
    }

    if (options.path) {
        state.path = (state.path || '') + options.path;
    }

    if (options.subdomain) {
        state.subdomain = options.subdomain;
    }
}


class Router<T, TRegistry extends Registry = EmptyRegistry, TGroup extends Group = Root> {
    bucket: Record<string, Record<string, { root: Node<T>, static: Record<string, Route<T>> }>> = {};
    groups: Options<T>[] = [];
    routes: Record<string, Route<T>> = {};
    subdomains: string[] | null = null;


    private add(method: string, path: string, route: Route<T>) {
        let bucket = (this.bucket[method] ??= {})[route.subdomain || ''] ??= {
                root: new Node(),
                static: {}
            };

        if (path.indexOf(':') === -1) {
            bucket.static[path] = route;
        }
        else {
            bucket.root.add(path, route);
        }
    }

    private as<TRegistry2 extends Registry, TGroup2 extends Group>(): Router<T, TRegistry2, TGroup2> {
        return this as Router<T, Registry, Group> as Router<T, TRegistry2, TGroup2>;
    }

    private create(options: RouteOptions<T>): Route<T> {
        let groups = this.groups,
            middleware: Middleware<T>[] = [],
            state = {
                name: null as string | null,
                path: null as string | null,
                subdomain: null as string | null
            };

        for (let i = 0, n = groups.length; i < n; i++) {
            set(state, middleware, groups[i]);
        }

        set(state, middleware, options);

        if (state.path) {
            state.path = normalize(state.path);
        }

        if (state.subdomain) {
            state.subdomain = state.subdomain.toLowerCase();

            if (state.subdomain === 'www') {
                state.subdomain = '';
            }
        }

        return {
            handler: build(middleware),
            name: state.name,
            path: state.path,
            subdomain: state.subdomain
        };
    }

    private register(methods: string[], options: RouteOptions<T>) {
        let route = this.create(options),
            path = route.path,
            subdomain = route.subdomain;

        if (route.name) {
            this.routes[route.name] = route;
        }

        if (path) {
            for (let i = 0, n = methods.length; i < n; i++) {
                let method = methods[i].toUpperCase();

                if (path.indexOf('/?:') !== -1) {
                    let segments = path.split('/'),
                        url = '';

                    for (let j = 0, m = segments.length; j < m; j++) {
                        let segment = segments[j];

                        if (segment[0] === '?') {
                            this.add(method, url || '/', route);
                            url += '/:' + segment.slice(2);
                        }
                        else if (segment) {
                            url += '/' + segment;
                        }
                    }

                    this.add(method, url, route);
                }
                else {
                    this.add(method, path, route);
                }
            }
        }

        if (subdomain) {
            let subdomains = this.subdomains ??= [];

            if (subdomains.indexOf(subdomain) === -1) {
                subdomains.push(subdomain);
                subdomains.sort((a, b) => b.length - a.length);
            }
        }
    }


    delete<const Name extends string = '', const Path extends string = string, const Sub extends string = ''>(
        options: RouteOptions<T>
            & { name?: Name; path?: Path; subdomain?: Sub }
            & { name?: ValidateName<TRegistry, TGroup, Name>; path?: ValidatePath<TRegistry, TGroup, 'DELETE', Sub, Path> }
    ): Register<T, TRegistry, TGroup, 'DELETE', Name, Sub, Path> {
        this.register(ON_DELETE, options);
        return this.as<Registry, TGroup>() as Register<T, TRegistry, TGroup, 'DELETE', Name, Sub, Path>;
    }

    get<const Name extends string = '', const Path extends string = string, const Sub extends string = ''>(
        options: RouteOptions<T>
            & { name?: Name; path?: Path; subdomain?: Sub }
            & { name?: ValidateName<TRegistry, TGroup, Name>; path?: ValidatePath<TRegistry, TGroup, 'GET', Sub, Path> }
    ): Register<T, TRegistry, TGroup, 'GET', Name, Sub, Path> {
        this.register(ON_GET, options);
        return this.as<Registry, TGroup>() as Register<T, TRegistry, TGroup, 'GET', Name, Sub, Path>;
    }

    group<const G extends Partial<Group>>(options: Options<T> & G): {
        routes: <R extends Registry = TRegistry>(
            fn: (router: Router<T, TRegistry, MergeGroup<TGroup, G>>) => Router<T, R, MergeGroup<TGroup, G>> | void
        ) => Router<T, R, TGroup>;
    } {
        return {
            routes: (fn) => {
                this.groups.push(options);

                try {
                    fn(this.as<TRegistry, MergeGroup<TGroup, G>>());
                }
                finally {
                    this.groups.pop();
                }

                return this.as();
            }
        };
    }

    match(method: string, path: string, subdomain?: string | null): {
        parameters?: Readonly<Record<string, string>>;
        route?: Readonly<Route<T>>;
    } {
        let bucket = this.bucket[method]?.[subdomain || ''];

        if (!bucket) {
            return {};
        }

        path = normalize(path);

        if (path in bucket.static) {
            return { route: bucket.static[path] };
        }

        return bucket.root.find(path);
    }

    on<const Name extends string = '', const Path extends string = string, const Sub extends string = ''>(
        methods: string[],
        options: RouteOptions<T>
            & { name?: Name; path?: Path; subdomain?: Sub }
            & { name?: ValidateName<TRegistry, TGroup, Name>; path?: ValidatePath<TRegistry, TGroup, string, Sub, Path> }
    ): Register<T, TRegistry, TGroup, string, Name, Sub, Path> {
        this.register(methods, options);
        return this.as<Registry, TGroup>() as Register<T, TRegistry, TGroup, string, Name, Sub, Path>;
    }

    post<const Name extends string = '', const Path extends string = string, const Sub extends string = ''>(
        options: RouteOptions<T>
            & { name?: Name; path?: Path; subdomain?: Sub }
            & { name?: ValidateName<TRegistry, TGroup, Name>; path?: ValidatePath<TRegistry, TGroup, 'POST', Sub, Path> }
    ): Register<T, TRegistry, TGroup, 'POST', Name, Sub, Path> {
        this.register(ON_POST, options);
        return this.as<Registry, TGroup>() as Register<T, TRegistry, TGroup, 'POST', Name, Sub, Path>;
    }

    put<const Name extends string = '', const Path extends string = string, const Sub extends string = ''>(
        options: RouteOptions<T>
            & { name?: Name; path?: Path; subdomain?: Sub }
            & { name?: ValidateName<TRegistry, TGroup, Name>; path?: ValidatePath<TRegistry, TGroup, 'PUT', Sub, Path> }
    ): Register<T, TRegistry, TGroup, 'PUT', Name, Sub, Path> {
        this.register(ON_PUT, options);
        return this.as<Registry, TGroup>() as Register<T, TRegistry, TGroup, 'PUT', Name, Sub, Path>;
    }

    uri<Name extends keyof TRegistry['names'] & string>(name: Name, ...values: UriArguments<TRegistry, Name>): string {
        let input = ([...values][0] ?? {}) as Record<string, string | number | (string | number)[]> | (string | number)[],
            path = this.routes[name].path!,
            array = Array.isArray(input),
            named = input as Record<string, string | number | (string | number)[]>,
            positional = input as (string | number)[],
            resolved: (string | number)[] = [],
            segments = path.split('/'),
            v = 0;

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                symbol = segment[0];

            if (symbol === ':') {
                resolved.push(array ? positional[v++] : named[segment.slice(1)] as string | number);
            }
            else if (symbol === '?') {
                let value = array ? positional[v++] : named[segment.slice(2)];

                if (value === undefined) {
                    break;
                }

                resolved.push(value as string | number);
            }
            else if (symbol === '*') {
                if (array) {
                    for (let n = positional.length; v < n; v++) {
                        resolved.push(positional[v]);
                    }
                }
                else {
                    let value = named[segment.slice(2)];

                    if (Array.isArray(value)) {
                        for (let j = 0, m = value.length; j < m; j++) {
                            resolved.push(value[j]);
                        }
                    }
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

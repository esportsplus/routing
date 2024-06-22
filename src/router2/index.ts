import { METHOD_NAME_ALL, PATH_ERROR } from './constants';
import { Trie } from './trie';
import { HandlerMap, HandlerMetadata, Matcher, Method, ParameterMap, ParameterMetadata, Path, Result, StaticMap } from './types';


const NULL_MATCHER = [/^$/, [], Object.create(null)] as Matcher<any>;


let empty: any[] = [],
    wildcardCache: Record<Path, RegExp> = Object.create(null);


function buildMatcherFromPreprocessedRoutes<T>(routes: [Path, HandlerMap<T>[]][]): Matcher<T> {
    if (routes.length === 0) {
        return NULL_MATCHER;
    }

    let handlerMetadata: HandlerMetadata<T>[] = [],
        routesWithStaticPathFlag = routes
            .map(
                (route) => [!/\*|\/:/.test(route[0]), ...route] as [boolean, Path, HandlerMap<T>[]]
            )
            .sort(([isStaticA, pathA], [isStaticB, pathB]) =>
                isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
            ),
        staticMap: StaticMap<T> = Object.create(null),
        trie = new Trie();

    for (let i = 0, j = -1, n = routesWithStaticPathFlag.length; i < n; i++) {
        let [ validatePathOnly, path, handlers ] = routesWithStaticPathFlag[i];

        if (validatePathOnly) {
            staticMap[path] = [ handlers.map(([h]) => [h, Object.create(null)]), empty ]
        }
        else {
            j++
        }

        let parameterMetadata: ParameterMetadata;

        try {
            parameterMetadata = trie.insert(path, j, validatePathOnly)
        }
        catch (e) {
            throw e === PATH_ERROR ? new Error(`Routing: '${path}' is not supported`) : e
        }

        if (validatePathOnly) {
            continue
        }

        handlerMetadata[j] = handlers.map(([h, i]) => {
            let paramIndexMap: ParameterMap = Object.create(null);

            i -= 1;

            for (; i >= 0; i--) {
                let [key, value] = parameterMetadata[i];

                paramIndexMap[key] = value;
            }

            return [h, paramIndexMap];
        })
    }

    let [regexp, handlerReplacementMap, parameterReplacementMap] = trie.build();

    for (let i = 0, n = handlerMetadata.length; i < n; i++) {
        let metadata = handlerMetadata[i];

        for (let j = 0, n = metadata.length; j < n; j++) {
            let map = metadata[j]?.[1];

            if (!map) {
                continue;
            }

            for (let key in map) {
                map[key] = parameterReplacementMap[ map[key] ];
            }
        }
    }

    let handlerMap: HandlerMetadata<T>[] = [];

    for (let i = 0, n = handlerReplacementMap.length; i < n; i++) {
        handlerMap[i] = handlerMetadata[handlerReplacementMap[i]];
    }

    return [regexp, handlerMap, staticMap] as Matcher<T>;
}

function buildWildcardRegExp(path: Path): RegExp {
    return (wildcardCache[path] ??= new RegExp(
        path === '*'
            ? ''
            : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, char) =>
                char ? `\\${char}` : '(?:|/.*)'
            )}$`
    ))
}

function clearWildcardCache() {
    wildcardCache = Object.create(null);
}

function findMiddleware<T>(middleware: Record<string, T[]> | undefined, path: Path): T[] | undefined {
    if (!middleware) {
        return undefined;
    }

    let keys = Object.keys(middleware).sort((a, b) => b.length - a.length);

    for (let i = 0, n = keys.length; i < n; i++) {
        if (buildWildcardRegExp(keys[i]).test(path)) {
            return [...middleware[keys[i]]];
        }
    }

    return undefined;
}

// If path is `/api/animals/:type?` [`/api/animals`, `/api/animals/:type`] else null
function findOptionalParameters(path: Path): string[] | null {
    if (!path.match(/\:.+\?$/)) {
        return null
    }

    let base = '',
        results: string[] = [],
        segments = path.split('/');

    for (let i = 0, n = segments.length; i < n; i++) {
        let segment = segments[i];

        if (segment !== '' && !/\:/.test(segment)) {
            base += '/' + segment;
        }
        else if (/\:/.test(segment)) {
            if (/\?/.test(segment)) {
                if (results.length === 0 && base === '') {
                    results.push('/');
                }
                else {
                    results.push(base);
                }

                base += '/' + segment.replace('?', '');
                results.push(base);
            }
            else {
                base += '/' + segment;
            }
        }
    }

    return results.filter((v, i, a) => a.indexOf(v) === i);
}


class Router<T> {
    middleware?: Record<Method, Record<Path, HandlerMap<T>[]>>
    routes?: Record<Method, Record<Path, HandlerMap<T>[]>>


    constructor() {
        this.middleware = {
            [METHOD_NAME_ALL]: Object.create(null)
        };
        this.routes = {
            [METHOD_NAME_ALL]: Object.create(null)
        };
    }


    private buildAllMatchers(): Record<Method, Matcher<T> | null> {
        let matchers: Record<Method, Matcher<T> | null> = Object.create(null);

        for (let method in this.middleware) {
            matchers[method] ||= this.buildMatcher(method);
        }

        for (let method in this.routes) {
            matchers[method] ||= this.buildMatcher(method);
        }

        this.middleware = this.routes = undefined;

        return matchers;
    }

    private buildMatcher(method: Method): Matcher<T> | null {
        let isAll = method === METHOD_NAME_ALL,
            properties = [this.middleware, this.routes],
            property,
            routes: [Path, HandlerMap<T>[]][] = [];

        while (property = properties.pop()) {
            let values = property[method]
                    ? Object.keys(property[method]).map((path) => [path, property![method][path]])
                    : [];

            if (values.length !== 0) {
                isAll ||= true;
                routes.push(...(values as typeof routes));
            }
            else if (method !== METHOD_NAME_ALL) {
                routes.push(
                    ...(Object.keys(property[METHOD_NAME_ALL]).map((path) => [path, property![METHOD_NAME_ALL][path]]) as typeof routes)
                );
            }
        }

        return isAll === true ? buildMatcherFromPreprocessedRoutes(routes) : null;
    }

    add(method: Method, path: Path, handler: T) {
        let { middleware, routes } = this;

        if (!middleware || !routes) {
            throw new Error('Routing: Cannot add route after matcher has been built.');
        }

        if (!middleware[method]) {
            let properties = [middleware, routes],
                property;

            while (property = properties.pop()) {
                let copy = property[METHOD_NAME_ALL],
                    into = property[method];

                property[method] = Object.create(null);

                for (let path in copy) {
                    into[path] = [ ...copy[path] ];
                }
            }
        }

        if (path === '/*') {
            path = '*';
        }

        let parameters = (path.match(/\/:/g) || []).length;

        if (/\*$/.test(path)) {
            let regex = buildWildcardRegExp(path);

            if (method === METHOD_NAME_ALL) {
                for (let m in middleware) {
                    middleware[m][path] ||=
                        findMiddleware(middleware[m], path) ||
                        findMiddleware(middleware[METHOD_NAME_ALL], path) ||
                        [];
                }
            }
            else {
                middleware[method][path] ||=
                    findMiddleware(middleware[method], path) ||
                    findMiddleware(middleware[METHOD_NAME_ALL], path) ||
                    [];
            }

            let properties = [middleware, routes],
                property;

            while (property = properties.pop()) {
                for (let m in property) {
                    if (method === METHOD_NAME_ALL || method === m) {
                        let routes = property[m];

                        for (let path in routes) {
                            regex.test(path) && routes[path].push([handler, parameters]);
                        }
                    }
                }
            }

            return;
        }

        let paths = findOptionalParameters(path) || [path];

        for (let i = 0, n = paths.length; i < n; i++) {
            let path = paths[i];

            for (let m in routes) {
                if (method === METHOD_NAME_ALL || method === m) {
                    let r = routes[m];

                    r[path] ||= [
                        ...(findMiddleware(middleware[m], path) ||
                            findMiddleware(middleware[METHOD_NAME_ALL], path) ||
                            []),
                    ];
                    r[path].push([handler, parameters - n + i + 1]);
                }
            }
        }
    }

    match(method: Method, path: Path): Result<T> {
        clearWildcardCache();

        let matchers = this.buildAllMatchers();

        this.match = (method, path) => {
            let matcher = (matchers[method] || matchers[METHOD_NAME_ALL]) as Matcher<T>,
                staticMatch = matcher[2][path];

            if (staticMatch) {
                return staticMatch;
            }

            let match = path.match(matcher[0]);

            if (!match) {
                return [[], empty];
            }

            return [matcher[1][match.indexOf('', 1)], match];
        }

        return this.match(method, path);
    }
}


export { Router };
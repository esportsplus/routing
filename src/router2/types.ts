type HandlerMap<T> = [T, number];

type HandlerMetadata<T> = [T, ParameterMap][];

type Indexes = number[];

type Matcher<T> = [RegExp, HandlerMetadata<T>[], StaticMap<T>];

type Method = string;

type ParameterMap = Record<string, number>;

type ParameterMetadata = [string, number][];

type Path = string;

/**
 * The result can be in one of two formats:
 * 1. An array of handlers with their corresponding parameter index maps, followed by a parameter stash.
 * 2. An array of handlers with their corresponding parameter maps.
 *
 * Example:
 *
 * [[handler, paramIndexMap][], paramArray]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                     // '*'
 *     [funcA,       {'id': 0}],              // '/user/:id/*'
 *     [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
 *   ],
 *   ['123', 'abc']
 * ]
 * ```
 *
 * [[handler, params][]]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                             // '*'
 *     [funcA,       {'id': '123'}],                  // '/user/:id/*'
 *     [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
 *   ]
 * ]
 * ```
 */
type Result<T> = [ [T, ParameterMap][], string[] ] | [ [T, Record<string, string>][] ];

type StaticMap<T> = Record<Path, Result<T>>;


export {
    HandlerMap, HandlerMetadata,
    Indexes,
    Matcher, Method,
    ParameterMap, ParameterMetadata, Path,
    Result,
    StaticMap
};

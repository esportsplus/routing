import { NeverAsync } from '@esportsplus/utilities';
import { Router } from './router';


type PACKAGE_NAME = '@esportsplus/routing';


type AccumulateRoutes<Factories extends readonly RouteFactory<any>[]> =
    Factories extends readonly [infer F extends RouteFactory<any>, ...infer Rest extends readonly RouteFactory<any>[]]
        ? MergeRegistry<RegistryOf<F>, AccumulateRoutes<Rest>>
        : EmptyRegistry;

type Bucket<Method extends string, Sub extends string> =
    `${Method}|${Uppercase<Sub extends 'www' ? '' : Sub>}`;

type ClientRedirect<TRegistry extends Registry> =
    (<Name extends keyof TRegistry['names'] & string>(name: Name, ...values: UriArguments<TRegistry, Name>) => void) &
    ((url: `${string}://${string}`) => void);

type ClientUri<TRegistry extends Registry> =
    <Name extends keyof TRegistry['names'] & string>(name: Name, ...values: UriArguments<TRegistry, Name>) => string;

type Cmp<A extends string, B extends string> =
    A extends `:${infer AN}`
        ? B extends `:${infer BN}` ? (Eq<AN, BN> extends true ? 'align' : 'conflict') : 'diverge'
        : A extends `*:${infer AN}`
            ? B extends `*:${infer BN}` ? (Eq<AN, BN> extends true ? 'align' : 'conflict') : 'diverge'
            : B extends `:${string}`
                ? 'diverge'
                : B extends `*:${string}`
                    ? 'diverge'
                    : Eq<A, B> extends true ? 'align' : 'diverge';

type ConflictWalk<E extends string, N extends string> =
    E extends `/${infer ES}/${infer ER}`
        ? N extends `/${infer NS}/${infer NR}`
            ? Cmp<ES, NS> extends 'conflict'
                ? true
                : Cmp<ES, NS> extends 'align' ? ConflictWalk<`/${ER}`, `/${NR}`> : false
            : N extends `/${infer NS}`
                ? Cmp<ES, NS> extends 'conflict' ? true : false
                : false
        : E extends `/${infer ES}`
            ? N extends `/${infer NS}/${string}`
                ? Cmp<ES, NS> extends 'conflict' ? true : false
                : N extends `/${infer NS}`
                    ? Cmp<ES, NS> extends 'conflict' ? true : false
                    : false
            : false;

type DuplicatePath<TRegistry extends Registry, TGroup extends Group, Method extends string, Sub extends string, Path extends string> =
    string extends Method
        ? ''
        : Extract<`${Bucket<Method, RouteSubdomain<TGroup, Sub>>}|${Shape<FullPath<TGroup, Path>>}`, ShapeKeysOfPaths<TRegistry['paths']>> extends never
            ? ''
            : `${PACKAGE_NAME}: path '${FullPath<TGroup, Path>}' is already registered for ${Method}`;

type EmptyRegistry = { names: {}; paths: never };

type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type EraseNames<Path extends string> =
    Path extends `/${infer Seg}/${infer Rest}`
        ? `/${EraseSeg<Seg>}${EraseNames<`/${Rest}`>}`
        : Path extends `/${infer Seg}`
            ? `/${EraseSeg<Seg>}`
            : '';

type EraseSeg<Seg extends string> =
    Seg extends `:${string}` ? ':' : Seg extends `*:${string}` ? '*' : Seg;

type Expand<Path extends string, Acc extends string = ''> =
    Path extends `/${infer Seg}/${infer Rest}`
        ? Seg extends `?:${infer N}`
            ? Acc | Expand<`/${Rest}`, `${Acc}/:${N}`>
            : Expand<`/${Rest}`, `${Acc}/${Seg}`>
        : Path extends `/${infer Seg}`
            ? Seg extends `?:${infer N}`
                ? Acc | `${Acc}/:${N}`
                : `${Acc}/${Seg}`
            : Acc;

type ExtractOptionalParams<Path extends string> =
    Path extends `/${infer Segment}/${infer Rest}`
        ? (Segment extends `?:${infer Param}` ? Param : never) | ExtractOptionalParams<`/${Rest}`>
        : Path extends `/${infer Segment}`
            ? (Segment extends `?:${infer Param}` ? Param : never)
            : never;

type ExtractRequiredParams<Path extends string> =
    Path extends `/${infer Segment}/${infer Rest}`
        ? (Segment extends `:${infer Param}` ? Param : never) | ExtractRequiredParams<`/${Rest}`>
        : Path extends `/${infer Segment}`
            ? (Segment extends `:${infer Param}` ? Param : never)
            : never;

type ExtractWildcardParams<Path extends string> =
    Path extends `/${infer Segment}/${infer Rest}`
        ? (Segment extends `*:${infer Param}` ? Param : never) | ExtractWildcardParams<`/${Rest}`>
        : Path extends `/${infer Segment}`
            ? (Segment extends `*:${infer Param}` ? Param : never)
            : never;

type FullName<TGroup extends Group, Name extends string> = `${TGroup['name']}${Name}`;

type FullPath<TGroup extends Group, Path extends string> = `${TGroup['path']}${Path}`;

type Group = { name: string; path: string; subdomain: string };

type InferOutput<F> = F extends RouteFactory<infer T> ? T : never;

type MergeGroup<TGroup extends Group, G extends Partial<Group>> = {
    name: `${TGroup['name']}${G extends { name: infer N extends string } ? N : ''}`;
    path: `${TGroup['path']}${G extends { path: infer P extends string } ? P : ''}`;
    subdomain: G extends { subdomain: infer S extends string }
        ? '' extends S ? TGroup['subdomain'] : S
        : TGroup['subdomain'];
};

type MergeRegistry<A extends Registry, B extends Registry> = {
    names: A['names'] & B['names'];
    paths: A['paths'] | B['paths'];
};

type Middleware<T> = NeverAsync<(input: Request<T>, next: Next<T>) => T>;

type Next<T> = NeverAsync<(input: Request<T>) => T>;

type NormalSeg<Seg extends string> =
    Seg extends `:${string}` ? '/:' : Seg extends `*:${string}` ? '/*' : `/${Seg}`;

type Options<T> = {
    middleware?: Middleware<T>[];
    name?: string;
    path?: string;
    subdomain?: string;
};

type ParamConflict<TRegistry extends Registry, TGroup extends Group, Method extends string, Sub extends string, Path extends string> =
    string extends Method
        ? ''
        : PathsConflict<`${Bucket<Method, RouteSubdomain<TGroup, Sub>>}|${Expand<FullPath<TGroup, Path>>}`, TRegistry['paths']> extends true
            ? `${PACKAGE_NAME}: parameter name at path '${FullPath<TGroup, Path>}' conflicts with an existing route`
            : '';

type PathParamsObject<Path extends string> =
    { [K in ExtractRequiredParams<Path>]: string | number } &
    { [K in ExtractOptionalParams<Path>]?: string | number } &
    { [K in ExtractWildcardParams<Path>]: string | number | (string | number)[] };

type PathsConflict<A extends string, B extends string> =
    (A extends any
        ? B extends any
            ? Eq<A extends `${infer Bk}|/${string}` ? Bk : never, B extends `${infer Bk}|/${string}` ? Bk : never> extends true
                ? ConflictWalk<A extends `${string}|/${infer P}` ? `/${P}` : never, B extends `${string}|/${infer P}` ? `/${P}` : never> extends true
                    ? true
                    : never
                : never
            : never
        : never) extends never ? false : true;

type PriorRegistry<Factories extends readonly RouteFactory<any>[], I extends PropertyKey, Acc extends Registry = EmptyRegistry, Idx extends readonly unknown[] = []> =
    `${Idx['length']}` extends I
        ? Acc
        : Factories[Idx['length']] extends infer F extends RouteFactory<any>
            ? PriorRegistry<Factories, I, MergeRegistry<Acc, RegistryOf<F>>, [...Idx, unknown]>
            : Acc;

type Register<T, TRegistry extends Registry, TGroup extends Group, Method extends string, Name extends string, Sub extends string, Path extends string> =
    Router<T, {
        names: TRegistry['names'] & RegisterNames<TGroup, Name, Path>;
        paths: TRegistry['paths'] | RegisterPaths<TGroup, Method, RouteSubdomain<TGroup, Sub>, Path>;
    }, TGroup>;

type RegisterNames<TGroup extends Group, Name extends string, Path extends string> =
    string extends Name
        ? {}
        : Name extends ''
            ? {}
            : { [K in FullName<TGroup, Name>]: { path: FullPath<TGroup, Path> } };

type RegisterPaths<TGroup extends Group, Method extends string, Sub extends string, Path extends string> =
    string extends Method
        ? never
        : string extends Path
            ? never
            : `${Bucket<Method, Sub>}|${Expand<FullPath<TGroup, Path>>}`;

type Registry = {
    names: Record<string, { path: string }>;
    paths: string;
};

type RegistryConflict<A extends Registry, B extends Registry> =
    keyof A['names'] & keyof B['names'] extends never
        ? Extract<ShapeKeysOfPaths<A['paths']>, ShapeKeysOfPaths<B['paths']>> extends never
            ? PathsConflict<A['paths'], B['paths']> extends true
                ? `${PACKAGE_NAME}: parameter name conflicts between route factories`
                : ''
            : `${PACKAGE_NAME}: duplicate path between route factories`
        : `${PACKAGE_NAME}: duplicate route name between route factories`;

type RegistryOf<F> =
    F extends (router: Router<infer _T, EmptyRegistry, Root>) => Router<infer _U, infer R extends Registry, infer _G extends Group>
        ? R
        : EmptyRegistry;

type Request<T> = RequestState & {
    data: ReturnType<Router<T>['match']>;
    subdomain?: string;
};

type RequestState = {
    hostname: string;
    href: string;
    method: string;
    origin: string;
    path: string;
    port: string;
    protocol: string;
    query: Record<string, string>;
};

type Root = { name: ''; path: ''; subdomain: '' };

type Route<T> = {
    middleware: Middleware<T>[] | Next<T>;
    name: string | null;
    path: string | null;
    subdomain: string | null;
};

type RouteFactory<T> = (router: Router<T, EmptyRegistry, Root>) => Router<T, Registry, Group>;

type RouteOptions<T> = Options<T> & {
    responder: Next<T>;
};

type RouteSubdomain<TGroup extends Group, Sub extends string> = Sub extends '' ? TGroup['subdomain'] : Sub;

type SegmentError<Seg extends string, IsLast extends boolean> =
    Seg extends `?:${infer N}`
        ? N extends '' ? `${PACKAGE_NAME}: parameter name must not be empty` : ''
        : Seg extends `*:${infer N}`
            ? N extends ''
                ? `${PACKAGE_NAME}: parameter name must not be empty`
                : IsLast extends true ? '' : `${PACKAGE_NAME}: wildcard parameter must be the last segment`
            : Seg extends `:${infer N}`
                ? N extends '' ? `${PACKAGE_NAME}: parameter name must not be empty` : ''
                : Seg extends `${string}?:${string}`
                    ? `${PACKAGE_NAME}: optional parameter must be its own segment ('/users/?:id')`
                    : Seg extends `${string}*:${string}`
                        ? `${PACKAGE_NAME}: wildcard parameter must be its own segment ('/files/*:path')`
                        : '';

type SegmentsSyntax<Path extends string> =
    Path extends `/${infer Seg}/${infer Rest}`
        ? SegmentError<Seg, false> extends ''
            ? SegmentsSyntax<`/${Rest}`>
            : SegmentError<Seg, false>
        : Path extends `/${infer Seg}`
            ? SegmentError<Seg, true>
            : '';

type Shape<Path extends string, Acc extends string = ''> =
    Path extends `/${infer Seg}/${infer Rest}`
        ? Seg extends `?:${string}`
            ? Acc | Shape<`/${Rest}`, `${Acc}/:`>
            : Shape<`/${Rest}`, `${Acc}${NormalSeg<Seg>}`>
        : Path extends `/${infer Seg}`
            ? Seg extends `?:${string}`
                ? Acc | `${Acc}/:`
                : `${Acc}${NormalSeg<Seg>}`
            : Acc;

type ShapeKeysOfPaths<Paths extends string> =
    Paths extends `${infer B}|/${infer P}` ? `${B}|${EraseNames<`/${P}`>}` : never;

type SyntaxError<Path extends string> =
    Path extends `/${string}`
        ? SegmentsSyntax<Path>
        : `${PACKAGE_NAME}: path '${Path}' must start with '/'`;

type UriArguments<TRegistry extends Registry, Name extends keyof TRegistry['names']> =
    TRegistry['names'][Name]['path'] extends infer P extends string
        ? [ExtractRequiredParams<P>] extends [never]
            ? [ExtractWildcardParams<P>] extends [never]
                ? [ExtractOptionalParams<P>] extends [never]
                    ? []
                    : [params?: PathParamsObject<P>]
                : [params: PathParamsObject<P>]
            : [params: PathParamsObject<P>]
        : [];

type ValidateFactories<Factories extends readonly RouteFactory<any>[]> = {
    [I in keyof Factories]: RegistryConflict<PriorRegistry<Factories, I>, RegistryOf<Factories[I]>> extends ''
        ? Factories[I]
        : RegistryConflict<PriorRegistry<Factories, I>, RegistryOf<Factories[I]>>;
};

type ValidateName<TRegistry extends Registry, TGroup extends Group, Name extends string> =
    string extends Name
        ? Name
        : Name extends ''
            ? Name
            : FullName<TGroup, Name> extends keyof TRegistry['names']
                ? `${PACKAGE_NAME}: route name '${FullName<TGroup, Name>}' is already in use`
                : Name;

type ValidatePath<TRegistry extends Registry, TGroup extends Group, Method extends string, Sub extends string, Path extends string> =
    string extends Path
        ? Path
        : SyntaxError<Path> extends ''
            ? DuplicatePath<TRegistry, TGroup, Method, Sub, Path> extends ''
                ? ParamConflict<TRegistry, TGroup, Method, Sub, Path> extends ''
                    ? Path
                    : ParamConflict<TRegistry, TGroup, Method, Sub, Path>
                : DuplicatePath<TRegistry, TGroup, Method, Sub, Path>
            : SyntaxError<Path>;


export type {
    AccumulateRoutes,
    ClientRedirect, ClientUri,
    EmptyRegistry,
    Group,
    InferOutput,
    MergeGroup,
    Middleware,
    Next,
    Options,
    PathParamsObject,
    Register,
    Registry,
    Request, RequestState, Root, Route, Router, RouteFactory, RouteOptions, RouteSubdomain,
    UriArguments,
    ValidateFactories, ValidateName, ValidatePath
};

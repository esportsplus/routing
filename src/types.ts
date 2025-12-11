import { NeverAsync } from '@esportsplus/utilities';
import { Router } from './router';
import pipeline from '@esportsplus/pipeline';


type ExtractOptionalParamsTuple<Path extends string> =
    Path extends `${infer _Start}?:${infer Param}/${infer Rest}`
        ? [Param, ...ExtractOptionalParamsTuple<`/${Rest}`>]
        : Path extends `${infer _Start}?:${infer Param}`
            ? [Param]
            : [];

type ExtractParamsTuple<Path extends string> =
    Path extends `${infer _Start}:${infer Param}/${infer Rest}`
        ? [Param, ...ExtractParamsTuple<`/${Rest}`>]
        : Path extends `${infer _Start}:${infer Param}`
            ? [Param]
            : [];

type ExtractWildcard<Path extends string> =
    Path extends `${string}*:${infer Param}`
        ? Param
        : never;

type LabeledParamsTuple<Params extends string[]> =
    Params extends [infer _First extends string, ...infer Rest extends string[]]
        ? [_First: string | number, ...LabeledParamsTuple<Rest>]
        : [];

type Middleware<T> = NeverAsync<(input: Request<T>, next: Next<T>) => T>;

type Name = string;

type Next<T> = NeverAsync<(input: Request<T>) => T>;

type Options<T> = {
    middleware?: Middleware<T>[];
    name?: string;
    path?: string;
    subdomain?: string;
};

type PathParamsTuple<Path extends string> =
    LabeledParamsTuple<ExtractParamsTuple<Path>>;

type PathParamsTupleWithOptional<Path extends string> =
    [...LabeledParamsTuple<ExtractParamsTuple<Path>>, ...Partial<LabeledParamsTuple<ExtractOptionalParamsTuple<Path>>>];

type Request<T> = {
    data: Record<PropertyKey, unknown> & ReturnType<Router<T>['match']>;
    href: string;
    hostname: string;
    method: string;
    origin: string;
    path: string;
    port: string;
    protocol: string;
    query: Record<string, unknown>;
    subdomain?: string;
};

type Route<T> = {
    name: Name | null;
    path: string | null;
    pipeline: ReturnType<typeof pipeline<Request<T>, T>>,
    subdomain: string | null;
};

type RouteOptions<T> = Options<T> & {
    responder: Next<T>;
};

type RouteRegistry = Record<string, { path: string }>;


export type {
    ExtractOptionalParamsTuple,
    ExtractParamsTuple,
    ExtractWildcard,
    LabeledParamsTuple,
    Middleware,
    Name,
    Next,
    Options,
    PathParamsTuple,
    PathParamsTupleWithOptional,
    Request,
    Route,
    RouteOptions,
    Router,
    RouteRegistry
};
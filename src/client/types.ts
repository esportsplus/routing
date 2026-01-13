import { NeverAsync } from '@esportsplus/utilities';
import { Router } from './router';
import pipeline from '@esportsplus/pipeline';


type AccumulateRoutes<T extends readonly RouteFactory<any>[]> =
    T extends readonly [infer F extends RouteFactory<any>, ...infer Rest extends readonly RouteFactory<any>[]]
        ? ExtractRoutes<F> & AccumulateRoutes<Rest>
        : {};

type ExtractOptionalParams<Path extends string> =
    Path extends `/${infer Segment}/${infer Rest}`
        ? (Segment extends `?:${infer Param}` ? Param : never) | ExtractOptionalParams<`/${Rest}`>
        : Path extends `/${infer Segment}`
            ? (Segment extends `?:${infer Param}` ? Param : never)
            : never;

type ExtractParamsTuple<Path extends string> =
    Path extends `${infer _Start}:${infer Param}/${infer Rest}`
        ? [Param, ...ExtractParamsTuple<`/${Rest}`>]
        : Path extends `${infer _Start}:${infer Param}`
            ? [Param]
            : [];

type ExtractRequiredParams<Path extends string> =
    Path extends `/${infer Segment}/${infer Rest}`
        ? (Segment extends `:${infer Param}` ? Param : never) | ExtractRequiredParams<`/${Rest}`>
        : Path extends `/${infer Segment}`
            ? (Segment extends `:${infer Param}` ? Param : never)
            : never;

type ExtractRoutes<F> =
    F extends (r: Router<any, any>) => Router<any, infer Routes extends RouteRegistry>
        ? Routes
        : never;

type InferOutput<F> = F extends RouteFactory<infer T> ? T : never;

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

type PathParamsObject<Path extends string> =
    { [K in ExtractRequiredParams<Path>]: string | number } &
    { [K in ExtractOptionalParams<Path>]?: string | number };

type PathParamsTuple<Path extends string> =
    LabeledParamsTuple<ExtractParamsTuple<Path>>;

type Request<T> = {
    data: Record<PropertyKey, unknown> & ReturnType<Router<T>['match']>;
    hostname: string;
    href: string;
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

type RouteFactory<T> = (router: Router<T, any>) => Router<T, RouteRegistry>;

type RouteOptions<T> = Options<T> & {
    responder: Next<T>;
};

type RoutePath<Routes, K extends keyof Routes> =
    Routes[K] extends { path: infer P extends string } ? P : string;

type RouteRegistry = Record<string, { path: string }>;


export type {
    AccumulateRoutes,
    ExtractOptionalParams, ExtractRequiredParams,
    InferOutput,
    Middleware,
    Name, Next,
    Options,
    PathParamsObject, PathParamsTuple,
    Request, Router, Route, RouteFactory, RouteOptions, RoutePath, RouteRegistry
};

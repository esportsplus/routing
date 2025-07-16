import { NeverAsync } from '@esportsplus/utilities';
import { Router } from './router';
import pipeline from '@esportsplus/pipeline';


type Middleware<T> = NeverAsync<(input: Request<T>, next: Next<T>) => T>;

type Name = string;

type Next<T> = NeverAsync<(input: Request<T>) => T>;

type Options<T> = {
    middleware?: Middleware<T>[];
    name?: string;
    path?: string;
    subdomain?: string;
};

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


export type { Middleware, Name, Next, Options, Request, Route, RouteOptions, Router };
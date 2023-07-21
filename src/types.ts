import { Next as N, Stage } from '@esportsplus/pipeline';
import { Route, Router } from './router';


type Middleware<T> = Stage<Request<T>, T>;

type Next<T> = N<Request<T>, T>;

type Options<T> = {
    middleware?: Middleware<T>[];
    name?: string;
    path?: string;
    responder: Next<T>;
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


export { Middleware, Next, Options, Request, Route, Router };
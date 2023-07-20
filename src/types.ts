import { Next as N, Stage } from '@esportsplus/pipeline';
import { Route, Router } from './router';


type Middleware<T> = Stage<Request<T>, Response<T>>;

type Next<T> = N<Request<T>, Response<T>>;

type Options<T> = {
    middleware?: Middleware<T>[];
    name?: string;
    path?: string;
    responder: Responder<T>;
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

type Responder<T> = (request: Request<T>) => Response<T>;

type Response<T> = Promise<T> | T;


export { Middleware, Next, Options, Request, Responder, Response, Route, Router };
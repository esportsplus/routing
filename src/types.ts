import { Middleware as M, Next as N } from '@esportsplus/middleware';
import { Route, Router } from './router';


type Middleware<R> = M<Request<R>, ReturnType<Responder<R>>>;

type Next<R> = N<Request<R>, ReturnType<Responder<R>>>;

type Options<R> = {
    middleware?: Middleware<R>[];
    name?: string;
    path?: string;
    responder: Responder<R>;
    subdomain?: string;
};

type Request<R> = {
    data: ReturnType<Router<R>['match']> & Record<PropertyKey, unknown>;
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

type Responder<R> = (request: Request<R>) => Promise<R> | R;


export { Middleware, Next, Options, Request, Responder, Route, Router };
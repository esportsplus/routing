import { Next as N, Stage } from '@esportsplus/pipeline';
import { Route, Router } from './router';


type Middleware<R> = Stage<Request, Response<R>>;

type Next<R> = N<Request, Response<R>>;

type Options<R> = {
    middleware?: Middleware<R>[];
    name?: string;
    path?: string;
    responder: Responder<R>;
    subdomain?: string;
};

type Request = {
    data: Record<PropertyKey, unknown>;
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

type Responder<R> = (request: Request) => Response<R>;

type Response<R> = Promise<R> | R;


export { Middleware, Next, Options, Request, Responder, Response, Route, Router };
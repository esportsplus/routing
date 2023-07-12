import { Middleware, Next } from '@esportsplus/middleware';
import { Route, Router } from './router';


type Options = {
    middleware?: Middleware<Request, unknown>[];
    name?: string;
    path?: string;
    responder: Responder;
    subdomain?: string;
};

type Request = {
    data: ReturnType<Router['match']> & Record<PropertyKey, unknown>;
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

type Responder = <T, U>(request: T) => Promise<U> | U;


export { Middleware, Next, Options, Request, Responder, Route, Router };
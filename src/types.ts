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
    data: ReturnType<Router['match']>;
    hostname: string;
    method: string;
    path: string;
    subdomain?: string;
};

type Responder = <T>(request: T) => Promise<unknown> | unknown;


export { Middleware, Next, Options, Request, Responder, Route, Router };
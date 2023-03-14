import { Route, Router } from './router';


type Middleware = <T>(request: T, next: Next) => unknown;

type Next = <T>(request: T) => unknown;

type Options = {
    middleware?: Middleware[];
    name?: string;
    path?: string;
    responder: Responder;
    subdomain?: string;
};

type Responder = <T>(request: T) => Promise<unknown> | unknown;


export { Middleware, Next, Options, Responder, Route, Router };
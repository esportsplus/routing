import { NeverAsync } from '@esportsplus/typescript';
import { Route, Router } from './router';


type Middleware<T> = NeverAsync<(input: Request<T>, next: Next<T>) => T>;

type Next<T> = NeverAsync<(input: Request<T>) => T>;

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
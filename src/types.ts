import { Routes } from './routes';
import { parse } from './url';


type Group = {
    middleware: Middleware[];
    name: string;
    pattern: string;
    subdomain: string;
};

type Middleware = (request: Request, next: Next) => unknown;

type Next = (request: Request) => unknown;

type Request = ReturnType<typeof parse>;

type Responder = (request: Request) => Promise<unknown> | unknown;

type Route = {
    middleware: Middleware[];
    name: string;
    pattern: string;
    responder: Responder;
    subdomain: string;
};


export { Group, Middleware, Next, Request, Responder, Route, Routes };
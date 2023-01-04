import { parse } from './url';
import routes from './routes';


type Group = {
    middleware: Middleware[];
    name: string;
    path: string;
    subdomain: string;
};

type Middleware = (request: Request, next: Next) => unknown;

type Next = (request: Request) => unknown;

type Request = ReturnType<typeof parse>;

type Responder = (request: Request) => Promise<unknown> | unknown;

type Routes = {
    add: typeof routes.add;
    group: typeof routes.group;
    routes: typeof routes.routes;
    subdomains: typeof routes.subdomains;
};

type Route = {
    middleware: Middleware[];
    name: string;
    path?: string;
    responder: Responder;
    subdomain?: string;
};


export { Group, Middleware, Next, Request, Responder, Route, Routes };
import parse from './parse';


type Middleware = (request: Request, next: Next) => unknown;

type Next = (request: Request) => unknown;

type Request = ReturnType<typeof parse>;

type Responder = (request: Request) => Promise<unknown> | unknown;


export { Middleware, Next, Request, Responder };
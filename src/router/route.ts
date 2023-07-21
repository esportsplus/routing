import { Middleware, Request, Responder } from '~/types';
import pipeline from '@esportsplus/pipeline';


class Route<T> {
    middleware: Middleware<T>[] | null = null;
    name: string | null = null;
    path: string | null = null;
    responder: Responder<T>;
    subdomain: string | null = null;


    constructor(responder: Responder<T>) {
        this.responder = responder;
    }


    get dispatch() {
        if (this.middleware === null) {
            return (request: Request<T>) => this.responder(request);
        }

        return pipeline(...this.middleware, (request: Request<T>) => this.responder(request));
    }
}


export { Route };
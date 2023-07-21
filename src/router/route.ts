import { Middleware, Next, Request } from '~/types';
import pipeline from '@esportsplus/pipeline';


class Route<T> {
    middleware: Middleware<T>[] | null = null;
    name: string | null = null;
    path: string | null = null;
    responder: Next<T>;
    subdomain: string | null = null;


    constructor(responder: Next<T>) {
        this.responder = responder;
    }


    get dispatch() {
        if (this.middleware === null) {
            return (request: Request<T>) => this.responder(request);
        }

        return pipeline(...this.middleware, (request) => this.responder(request));
    }
}


export { Route };
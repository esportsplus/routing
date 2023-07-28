import { Middleware, Next, NeverAsync, Request } from '~/types';
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


    dispatch(request: Request<T>): NeverAsync<T> {
        if (this.middleware === null) {
            return this.responder(request);
        }

        return pipeline(...this.middleware, (request) => this.responder(request))(request);
    }
}


export { Route };
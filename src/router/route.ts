import { Middleware, Next, Responder } from '~/types';
import pipeline from '@esportsplus/pipeline';


class Route<T> {
    dispatch: Next<T> | null = null;
    name: string | null = null;
    path: string | null = null;
    responder: Responder<T>;
    stack: Middleware<T>[] | null = null;
    subdomain: string | null = null;


    constructor(responder: Responder<T>) {
        this.responder = responder;
    }


    get dispatcher() {
        if (this.dispatch === null) {
            if (this.stack === null) {
                this.dispatch = (request) => this.responder(request);
            }
            else {
                this.dispatch = pipeline(...this.stack, (request => this.responder(request)));
            }
        }

        return this.dispatch;
    }
}


export { Route };
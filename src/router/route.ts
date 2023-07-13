import { Middleware, Next, Responder } from '~/types';
import { factory } from '~/middleware';


class Route<R> {
    dispatch: Next<R> | null = null;
    name: string | null = null;
    path: string | null = null;
    responder: Responder<R>;
    stack: Middleware<R>[] | null = null;
    subdomain: string | null = null;


    constructor(responder: Responder<R>) {
        this.responder = responder;
    }


    get dispatcher() {
        if (this.dispatch === null) {
            if (this.stack === null) {
                this.dispatch = (request) => this.responder(request);
            }
            else {
                this.dispatch = factory(...this.stack, (request => this.responder(request)));
            }
        }

        return this.dispatch;
    }
}


export { Route };
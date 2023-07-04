import { Middleware, Responder } from '~/types';
import { factory } from '~/middleware';


class Route {
    dispatch: ReturnType<typeof factory> | null = null;
    name: string | null = null;
    path: string | null = null;
    responder: Responder;
    stack: Middleware<unknown, unknown>[] | null = null;
    subdomain: string | null = null;


    constructor(responder: Responder) {
        this.responder = responder;
    }


    get dispatcher() {
        if (this.dispatch === null) {
            if (!this.stack?.length) {
                this.dispatch = <T>(request: T) => this.responder(request);
            }
            else {
                this.dispatch = factory(...this.stack, (request => this.responder(request)));
            }
        }

        return this.dispatch;
    }
}


export { Route };
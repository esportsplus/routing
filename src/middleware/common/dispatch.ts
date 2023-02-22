import { factory } from '~/middleware';
import { Request } from '~/types';


export default (request: Request) => {
    let route = request.data.route;

    if (!route) {
        throw new Error(`Route dispatching failed, route was not defined!`);
    }

    if (!route.middleware.length) {
        return route.responder(request);
    }

    return factory(...route.middleware, (request => route.responder(request)))(request);
};
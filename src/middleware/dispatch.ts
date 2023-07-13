import { Request } from '~/types';
import { Router } from '~/router';


export default <R>(request: Request & { data: ReturnType<Router<R>['match']> }) => {
    let { route } = request.data;

    if (route === undefined) {
        throw new Error(`Routing: route dispatching failed, route is undefined!`);
    }

    return route.dispatcher(request);
};

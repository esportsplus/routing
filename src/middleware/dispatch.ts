import { Middleware, Request, Router } from '~/types';


export default <R>(request: { data: ReturnType<Router['match']> }) => {
    let { route } = request.data;

    if (!route) {
        throw new Error(`Routing: route dispatching failed, route is undefined!`);
    }

    return route.dispatcher(request) as Middleware<Request, R>;
};

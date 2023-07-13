import { Request, Responder } from '~/types';


export default <R>(request: Request<R>): ReturnType<Responder<R>> => {
    let { route } = request.data;

    if (!route) {
        throw new Error(`Routing: route dispatching failed, route is undefined!`);
    }

    return route.dispatcher(request);
};

import { Router } from '~/types';


export default (request: { data: ReturnType<Router['match']> }) => {
    let { route } = request.data;

    if (!route) {
        throw new Error(`Routing: middleware dispatching failed, route is undefined!`);
    }

    return route.dispatcher(request);
};

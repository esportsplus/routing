import { Middleware, Next, Request } from '~/types';


function error() {
    throw new Error('Request middleware did not return a responder');
}


export default (...m: Middleware[]) => {
    let middleware: Next[] = [];

    for (let i = 0, n = m.length; i < n; i++) {
        middleware[i] = (request: Request) => m[i](request, middleware[i + 1] || error);
    }

    if (!middleware.length) {
        throw new Error('Request middleware has not been defined');
    }

    return async (request: Request) => await middleware[0](request);
};

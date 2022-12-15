import { Middleware, Request } from '~/types';


export default (...middleware: Middleware[]) => {
    let i = -1,
        n = middleware.length,
        next = (request: Request) => middleware[++i](request, (i < n ? next : () => {
            throw new Error('Request middleware did not return a responder');
        }));

    return async (request: Request) => {
        if (!middleware.length) {
            throw new Error('Request middleware has not been defined');
        }

        i = -1;

        return await next(request);
    };
};

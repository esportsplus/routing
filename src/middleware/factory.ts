import { Middleware, Next } from '~/types';


function error() {
    throw new Error('Routing: request middleware did not return a responder');
}


export default (...middleware: Middleware[]) => {
    let stack: Next[] = [];

    for (let i = 0, n = middleware.length; i < n; i++) {
        stack[i] = <T>(request: T) => middleware[i](request, stack[i + 1] || error);
    }

    if (!stack.length) {
        throw new Error('Routing: request middleware has not been defined');
    }

    return <T>(request: T) => stack[0](request);
};

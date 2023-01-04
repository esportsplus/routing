import { Next, Request, Routes } from '~/types';


export default ({ routes, subdomains }: Routes) => {
    return (request: Request, next: Next) => {
        let name = (subdomains[request.subdomain] || {})[request.path],
            route = routes[name];

        // Dynamic routing
        if (!route) {
            // TODO:
            // - Trie based routing
            // - Bind variables to request
        }

        if (!route && routes.fallback) {
            route = routes.fallback;
        }

        request.data.route = route;

        return next(request);
    };
};

import { Routes } from '~/routes';
import { Next, Request } from '~/types';


export default (routes: Routes) => {
    return (request: Request, next: Next) => {
        let name = (routes.subdomains[request.subdomain] || {})[request.uri],
            route = routes.static[name];

        // Dynamic routing
        if (!route) {
            // TODO:
            // - Trie based routing
            // - Bind variables to request
        }

        // Fallback route
        if (!route && routes.fallback) {
            route = routes.static[routes.fallback];
        }

        request.data.route = route;

        return next(request);
    };
};

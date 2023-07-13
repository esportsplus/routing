import { Middleware, Router } from '~/types';


export default <R>(router: Router<R>, subdomain?: string): Middleware<R> => {
    return (request, next) => {
        let match = subdomain || request.subdomain;

        if (match === undefined) {
            if (router.subdomains) {
                for (let i = 0, n = router.subdomains.length; i < n; i++) {
                    if (!request.hostname.startsWith(router.subdomains[i])) {
                        continue;
                    }

                    match = router.subdomains[i];
                    break;
                }
            }

            if (match === undefined) {
                match = '';
            }
        }

        let { parameters, route } = router.match(request.method, request.path, match);

        request.data.parameters = parameters;
        request.data.route = route;

        return next(request);
    };
};
import { Next, Request, Router } from '~/types';


export default (router: Router, { spa }: { spa?: boolean } = {}) => {
    let subdomain: string | null = null;

    return (request: Request, next: Next<Request, unknown>) => {
        if ((typeof request.subdomain !== 'string' && !spa) || subdomain === null) {
            if (router.subdomains) {
                for (let i = 0, n = router.subdomains.length; i < n; i++) {
                    if (!request.hostname.startsWith(router.subdomains[i])) {
                        continue;
                    }

                    subdomain = router.subdomains[i];
                    break;
                }
            }

            if (subdomain === null) {
                subdomain = '';
            }
        }

        let { parameters, route } = router.match(request.method, request.path, request.subdomain || subdomain);

        request.data.parameters = parameters;
        request.data.route = route;

        return next(request);
    };
};
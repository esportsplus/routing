import { Next, Router } from '~/types';


type Request = {
    data: ReturnType<Router['match']>;
    hostname: string;
    method: string;
    path: string;
    subdomain?: string;
};


export default (router: Router, spa = false) => {
    let subdomain: string | null = null;

    return (request: Request, next: Next) => {
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
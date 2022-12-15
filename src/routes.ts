import { Group, Responder, Route } from './types';


class Routes {
    dynamic: Record<Route['name'], Route> = {};
    fallback?: string;
    groups: Group[] = [];
    static: Record<Route['name'], Route> = {};
    subdomains: Record<Route['subdomain'], Record<Route['pattern'], Route['name']>> = {};


    add(name: string, pattern: string, responder: Responder) {
        let route: Route = {
                middleware: [],
                name: '',
                pattern: '',
                responder,
                subdomain: ''
            };

        for (let i = 0, n = this.groups.length; i < n; i++) {
            let group = this.groups[i];

            route.name += group.name;
            route.pattern += group.pattern;
            route.subdomain = group.subdomain + route.subdomain;

            if (group.middleware.length) {
                route.middleware.push(...group.middleware);
            }
        }

        route.name += name;
        route.pattern += pattern;

        if (route.pattern[0] !== '/') {
            route.pattern = `/${route.pattern}`;
        }

        if (route.subdomain === 'www') {
            route.subdomain = '';
        }

        if (!this.subdomains[route.subdomain]) {
            this.subdomains[route.subdomain] = {};
        }

        this.static[route.name] = route;
        this.subdomains[route.subdomain][route.pattern] = route.name;

        return route;
    }

    group(group: any, routes: (routes: Routes) => void) {
        this.groups.push(group);
        routes(this);
        this.groups.pop();
    }
}


export default new Routes();
export { Routes };
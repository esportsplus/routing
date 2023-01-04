import { Group, Responder, Routes, Route } from './types';


let groups: Group[] = [],
    routes: Record<Route['name'], Route> = {},
    subdomains: Record<NonNullable<Route['subdomain']>, Record<NonNullable<Route['path']>, Route['name']>> = {};


const add = ({ name, path, responder }: { name: string, path?: string, responder: Responder }) => {
    let http = path !== undefined,
        route: Route = {
            middleware: [],
            name: '',
            responder
        };

    if (http) {
        route.path = '';
        route.subdomain = '';
    }

    for (let i = 0, n = groups.length; i < n; i++) {
        let group = groups[i];

        if (group.middleware.length) {
            route.middleware.push(...group.middleware);
        }

        route.name += group.name;

        if (http) {
            route.path += group.path;
            route.subdomain = group.subdomain + route.subdomain;
        }
    }

    routes[ route.name += name ] = route;

    if (http) {
        route.path = `${route.path}${path}`;

        if (route.path[0] !== '/') {
            route.path = `/${route.path}`;
        }

        if (!route.subdomain || route.subdomain === 'www') {
            route.subdomain = '';
        }

        if (!subdomains[route.subdomain]) {
            subdomains[route.subdomain] = {};
        }

        subdomains[route.subdomain][route.path] = route.name;
    }

    return route;
};

const group = (group: any, fn: (routes: Routes) => void) => {
    groups.push(group);
    fn({ add, group, routes, subdomains });
    groups.pop();
};


export default { add, group, routes, subdomains };
export { add, group, routes, subdomains };
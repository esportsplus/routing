const parse = (url: string = window?.location?.href || '') => {
    let { hash, host, hostname, href, origin, port, protocol } = new URL( url ),
        parts = host.split('.'),
        path = hash?.replace('#/', '/')?.split('?') || ['/', ''],
        subdomain = '';

    if (parts.length > 2) {
        subdomain = parts[0];

        if (['127', 'www'].includes(subdomain)) {
            subdomain = '';
        }
    }

    return {
        data: {} as Record<string, any>,
        href: href,
        hostname: hostname,
        origin: origin,
        path: path[0],
        port: port,
        protocol: protocol,
        query: Object.fromEntries( (new URLSearchParams(path[1])).entries() ),
        subdomain
    };
};


export default { parse };
export { parse };
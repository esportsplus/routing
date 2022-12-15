const parse = (url: string = window.location.href) => {
    let data = new URL( url ),
        parts = data.host.split('.'),
        subdomain = '';

    if (parts.length > 2) {
        subdomain = parts[0];

        if (['127', 'www'].includes(subdomain)) {
            subdomain = '';
        }
    }

    return {
        data: {} as Record<string, any>,
        href: data.href,
        hostname: data.hostname,
        uri: data.hash.replace('#/', '/') || '/',
        origin: data.origin,
        pathname: data.pathname,
        port: data.port,
        protocol: data.protocol,
        query: Object.fromEntries( data.searchParams.entries() ),
        subdomain
    };
};


export default { parse };
export { parse };
const normalize = (path: string) => {
    if (path[0] !== '/') {
        path = `/${path}`;
    }

    if (path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    return path || '/';
};

const radixkey = (path: string, { method, subdomain }: { method?: string | null; subdomain?: string | null; } = {}) => {
    let prefix = '';

    if (subdomain) {
        prefix = subdomain + ' ';
    }

    if (method) {
        prefix += method + ' ';
    }

    return prefix.toUpperCase() + normalize(path);
};


export default { normalize, radixkey };
export { normalize, radixkey };
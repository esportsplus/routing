import { routes } from './routes';


export default (key: string, _: Record<string, any> = {}) => {
    // External redirect
    if (key.startsWith('http://') || key.startsWith('https://')) {
        window.location.replace(key);
    }

    // Internal route based redirect
    if (!routes[key]) {
        throw new Error(`Route '${key}' does not exist`);
    }

    window.location.hash = `#${routes[key].path || ''}`;
};
import { parse } from './request';


let data: Record<string, any>,
    factory: typeof parse,
    registered: boolean = false;


function update() {
    data.request = factory();
}


export default (d: typeof data, f: typeof factory) => {
    data = d;
    factory = f;

    if (!registered) {
        registered = true;
        update();

        window.addEventListener('popstate', update);
    }
};
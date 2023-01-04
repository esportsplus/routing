import { Group } from "./types";


export default (): Group => {
    return {
        middleware: [],
        name: '',
        path: '',
        subdomain: ''
    };
};

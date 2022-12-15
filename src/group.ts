import { Group } from "./types";


export default (): Group => {
    return {
        middleware: [],
        name: '',
        pattern: '',
        subdomain: ''
    };
};

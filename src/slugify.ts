// https://twitter.com/Swizec/status/1589416111971635201
export default (value: string) => {
    return value.replace(/\W+/g, '-').replace(/[-]+$/, '').toLowerCase();
};
import { Middleware, Request, Response } from '~/types';
import middleware from '@esportsplus/middleware';
import dispatch from './dispatch';
import match from './match';


const factory = <R>(...fns: Middleware<R>[]) => {
    return middleware<Request<R>, Response<R>>(...fns);
};


export default { dispatch, factory, match };
export { dispatch, factory, match };
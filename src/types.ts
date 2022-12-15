import { Middleware, Next, Request, Responder } from "./request/types";
import { Routes } from './routes';


type Group = {
    middleware: Middleware[];
    name: string;
    pattern: string;
    subdomain: string;
};

type Route = {
    middleware: Middleware[];
    name: string;
    pattern: string;
    responder: Responder;
    subdomain: string;
};


export { Group, Middleware, Next, Request, Responder, Route, Routes };
import { PARAMETER, STATIC, WILDCARD } from '../constants';
import { Route } from './index';


class Node<T> {
    parent: Node<T> | null = null;
    path: string | null = null;
    route: Route<T> | null = null;
    static: Map<string | number, Node<T>> | null = null;
    type: number | null = null;

    // Parameter or Wildcard parameter name
    name: string | null = null;
    parameter: Node<T> | null = null;
    wildcard: Node<T> | null = null;


    constructor(parent: Node<T>['parent'] = null) {
        this.parent = parent;
    }


    add(path: string, route: Route<T>) {
        let node: Node<T> | undefined = this,
            segments = path.split('/'),
            type: Node<T>['type'] = STATIC,
            unnamed = 0;

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                symbol = segment[0];

            // Parameter
            if (symbol === ':') {
                if (!node.parameter) {
                    node.parameter = new Node<T>(node);
                    node.parameter.name = (segment.slice(1) || unnamed++).toString();
                }

                node = node.parameter;
                type = PARAMETER;
            }
            // "*:" Wildcard
            else if (symbol === '*') {
                if (!node.wildcard) {
                    node.wildcard = new Node<T>(node);
                    node.wildcard.name = (segment.slice(2) || unnamed++).toString();
                }

                node = node.wildcard;
                type = WILDCARD;
            }
            // Static name
            else {
                let next: Node<T> | undefined = node.static?.get(segment);

                if (!next) {
                    next = new Node<T>(node);
                    (node.static ??= new Map()).set(segment, next);
                }

                node = next;
            }
        }

        node.path = path;
        node.route = route;
        node.type = type;

        return node;
    }

    find(path: string): {
        parameters?: Readonly<Record<PropertyKey, unknown>>;
        route?: Readonly<Route<T>>;
    } {
        let node: Node<T> | undefined = this,
            parameters: Record<PropertyKey, unknown> | undefined,
            segments = path.split('/'),
            wildcard: { node: Node<T>, start: number } | undefined;

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i];

            if (node.wildcard) {
                wildcard = {
                    node: node.wildcard,
                    start: i
                };
            }

            // Exact matches take precedence over parameters
            let next: Node<T> | undefined = node.static?.get(segment) as Node<T> | undefined;

            if (next) {
                node = next;
                continue;
            }

            if (!node.parameter) {
                node = undefined;
                break;
            }

            node = node.parameter;
            (parameters ??= {})[node.name!] = segment;
        }

        if ((node === undefined || node.route === null) && wildcard) {
            node = wildcard.node;
            (parameters ??= {})[ node.name! ] = segments.slice(wildcard.start).join('/');
        }

        return {
            parameters,
            route: node?.route || undefined
        };
    }
}


export { Node };
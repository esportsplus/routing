import { Route } from '../types';


class Node<T> {
    route: Route<T> | null = null;
    static: Map<string, Node<T>> | null = null;

    // Parameter or Wildcard parameter name
    name: string | null = null;
    parameter: Node<T> | null = null;
    wildcard: Node<T> | null = null;


    add(path: string, route: Route<T>) {
        let node: Node<T> = this,
            segments = path.split('/');

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                symbol = segment[0];

            // Parameter
            if (symbol === ':') {
                if (!node.parameter) {
                    node.parameter = new Node<T>();
                    node.parameter.name = segment.slice(1);
                }

                node = node.parameter;
            }
            // "*:" Wildcard
            else if (symbol === '*') {
                if (!node.wildcard) {
                    node.wildcard = new Node<T>();
                    node.wildcard.name = segment.slice(2);
                }

                node = node.wildcard;
            }
            // Static name
            else {
                let next: Node<T> | undefined = node.static?.get(segment);

                if (!next) {
                    next = new Node<T>();
                    (node.static ??= new Map()).set(segment, next);
                }

                node = next;
            }
        }

        node.route = route;

        return node;
    }

    find(path: string): {
        parameters?: Readonly<Record<string, string>>;
        route?: Readonly<Route<T>>;
    } {
        let node: Node<T> | undefined = this,
            parameters: Record<string, string> | undefined,
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
            let next: Node<T> | undefined = node.static?.get(segment);

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

import { PLACEHOLDER, STATIC, WILDCARD } from '~/constants';
import { Route } from './index';


class Node<T> {
    children: Map<string | number, Node<T>> | null = null;
    parent: Node<T> | null = null;
    path: string | null = null;
    property: string | null = null;
    route: Route<T> | null = null;
    type: number | null = null;


    constructor(parent: Node<T>['parent'] = null) {
        this.parent = parent;
    }


    add(path: string, route: Route<T>) {
        let node: Node<T> | undefined = this,
            segments = path.split('/'),
            type: Node<T>['type'] = STATIC,
            unnamed = 0;

        for (let i = 0, n = segments.length; i < n; i++) {
            let child: Node<T> | undefined = node.children?.get(segments[i]);

            if (!child) {
                let segment = segments[i],
                    symbol = segment[0];

                if (!node.children) {
                    node.children = new Map();
                }

                node.children.set(segment, (child = new Node<T>(node)));

                // Named property
                if (symbol === ':') {
                    child.property = (segment.slice(1) || unnamed++).toString();
                    node.children.set(PLACEHOLDER, child);
                    type = null;
                }
                // "*:" Wildcard property
                else if (symbol === '*') {
                    child.property = (segment.slice(2) || unnamed++).toString();
                    node.children.set(WILDCARD, child);
                    type = null;
                }
            }

            node = child;
        }

        node.path = path;
        node.route = route;
        node.type = type;

        return node;
    }

    find(path: string): {
        parameters?: Record<PropertyKey, unknown>;
        route?: Route<T>;
    } {
        let node: Node<T> | undefined = this,
            parameters: Record<PropertyKey, unknown> = {},
            segments = path.split('/'),
            wildcard: { node: Node<T>, value: string } | null = null;

        for (let i = 0, n = segments.length; i < n; i++) {
            let segment = segments[i],
                wc = node.children?.get(WILDCARD);

            if (wc) {
                wildcard = {
                    node: wc,
                    value: segments.slice(i).join('/')
                };
            }

            // Exact matches take precedence over placeholders
            let next: Node<T> | undefined = node.children?.get(segment);

            if (next) {
                node = next;
            }
            else {
                node = node.children?.get(PLACEHOLDER);

                if (!node) {
                    break;
                }

                parameters[ node.property! ] = segment;
            }
        }

        if ((!node || !node.route) && wildcard) {
            node = wildcard.node;
            parameters[ node.property! ] = wildcard.value;
        }

        if (!node) {
            return {};
        }

        return {
            parameters,
            route: node.route!
        };
    }

    remove(path: string) {
        let node: Node<T> | undefined = this,
            segments = path.split('/');

        for (let i = 0, n = segments.length; i < n; i++) {
            node = node.children?.get( segments[i] );

            if (!node) {
                return;
            }
        }

        if (node.children?.size) {
            return;
        }

        let parent = node.parent;

        if (parent && parent.children) {
            parent.children.delete( segments[segments.length - 1] );
            parent.children.delete(WILDCARD);
            parent.children.delete(PLACEHOLDER);
        }
    }
}


export { Node };
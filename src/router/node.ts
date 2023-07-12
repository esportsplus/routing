import { PLACEHOLDER, STATIC, WILDCARD } from "~/constants";
import { Route } from './index';


class Node {
    children: Map<string | number, Node> | null = null;
    parent: Node | null = null;
    path: string | null = null;
    property: string | null = null;
    route: Route | null = null;
    type: number | null = null;


    constructor(parent: Node['parent'] = null) {
        this.parent = parent;
    }


    add(path: string, route: Route) {
        let node: Node | undefined = this,
            segments = path.split('/'),
            type: Node['type'] = STATIC,
            unnamed = 0;

        for (let i = 0, n = segments.length; i < n; i++) {
            let child: Node | undefined = node.children?.get(segments[i]);

            if (!child) {
                let segment = segments[i],
                    symbol = segment[0];

                if (!node.children) {
                    node.children = new Map();
                }

                node.children.set(segment, (child = new Node(node)));

                // Named property
                if (symbol === ':') {
                    child.property = segment.slice(1) || `${unnamed++}`;
                    node.children.set(PLACEHOLDER, child);
                    type = null;
                }
                // "*:" Wildcard property
                else if (symbol === '*') {
                    child.property = segment.slice(2) || `${unnamed++}`;
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
        route?: Route;
    } {
        let node: Node | undefined = this,
            parameters: Record<PropertyKey, unknown> = {},
            segments = path.split('/'),
            wildcard: { node: Node, value: string } | null = null;

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
            let next: Node | undefined = node.children?.get(segment);

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
        let node: Node | undefined = this,
            segments = path.split('/');

        for (let i = 0, n = segments.length; i < n; i++) {
            node = node.children?.get( segments[i] );

            if (!node) {
                return;
            }
        }

        if (!node?.children?.size) {
            let parent = node.parent;

            if (parent && parent.children) {
                parent.children.delete( segments[segments.length - 1] );
                parent.children.delete(WILDCARD);
                parent.children.delete(PLACEHOLDER);
            }
        }

        return node;
    }
}


export { Node };
import { PATH_ERROR } from './constants';
import type { Trie } from './trie';
import { ParameterMetadata, Path } from './types';


const LABEL_REGEXP = '[^/]+';

const REGEXP_CHARACTERS = new Set('.\\+*[^]$()');

const WILDCARD_ONLY_REGEXP = '.*';

const WILDCARD_TAIL_REGEXP = '(?:|/.*)';


// '*' matches to all the trailing paths
const MATCH_WILDCARD_ONLY = ['', '', WILDCARD_ONLY_REGEXP];

const MATCH_LABEL = ['', '', LABEL_REGEXP];

// '/path/to/*' is /\/path\/to(?:|/.*)$
const MATCH_WILDCARD_TAIL = ['', '', WILDCARD_TAIL_REGEXP];


/**
 * Sort order:
 * 1. literal
 * 2. special pattern (e.g. :label{[0-9]+})
 * 3. common label pattern (e.g. :label)
 * 4. wildcard
 */
function sort(a: Path, b: Path): number {
    if (a.length === 1) {
        return b.length === 1 ? (a < b ? -1 : 1) : -1;
    }
    else if (b.length === 1) {
        return 1;
    }

    if (a === WILDCARD_ONLY_REGEXP || a === WILDCARD_TAIL_REGEXP) {
        return 1;
    }
    else if (b === WILDCARD_ONLY_REGEXP || b === WILDCARD_TAIL_REGEXP) {
        return -1;
    }

    if (a === LABEL_REGEXP) {
        return 1;
    }
    else if (b === LABEL_REGEXP) {
        return -1;
    }

    return a.length === b.length ? (a < b ? -1 : 1) : b.length - a.length;
}


class Node {
    children: Record<Path, Node> = Object.create(null);
    index?: number;
    slot?: number;


    buildRegexString(): Path {
        let children = this.children,
            path,
            paths: Path[] = Object.keys(children).sort(sort);

        for (let i = 0, n = paths.length; i < n; i++) {
            let child = children[ path = paths[i] ];

            paths[i] = (
                typeof child.slot === 'number'
                    ? `(${path})@${child.slot}`
                    : REGEXP_CHARACTERS.has(path)
                        ? `\\${path}`
                        : path
            ) + child.buildRegexString();
        }

        if (typeof this.index === 'number') {
            paths.unshift(`#${this.index}`);
        }

        if (paths.length === 0) {
            return '';
        }
        else if (paths.length === 1) {
            return paths[0];
        }

        return '(?:' + paths.join('|') + ')';
    }

    insert(
        tokens: readonly Path[],
        index: number,
        parameters: ParameterMetadata,
        context: Trie['context'],
        validatePathOnly: boolean
    ): void {
        if (tokens.length === 0) {
            if (this.index !== undefined) {
                throw PATH_ERROR;
            }
            else if (validatePathOnly) {
                return;
            }

            this.index = index;
            return;
        }

        let [token, ...remainingTokens] = tokens,
            node,
            pattern = token === '*'
                ? remainingTokens.length === 0
                    ? MATCH_WILDCARD_ONLY
                    : MATCH_LABEL
                : token === '/*'
                    ? MATCH_WILDCARD_TAIL
                    : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);

        if (pattern) {
            let name = pattern[1],
                path = pattern[2] || LABEL_REGEXP;

            if (name && pattern[2]) {
                // (a|b) => (?:a|b)
                path = path.replace(/^\((?!\?:)(?=[^)]+\)$)/, '(?:');

                // prefix(?:a|b) is allowed, but prefix(a|b) is not
                if (/\((?!\?:)/.test(path)) {
                    throw PATH_ERROR;
                }
            }

            node = this.children[path];

            if (!node) {
                for (let key in this.children) {
                    if (key !== WILDCARD_ONLY_REGEXP && key !== WILDCARD_TAIL_REGEXP) {
                        throw PATH_ERROR;
                    }
                }

                if (validatePathOnly) {
                    return;
                }

                node = this.children[path] = new Node();

                if (name !== '') {
                    node.slot = context.slot++;
                }
            }

            if (name !== '' && validatePathOnly === false) {
                parameters.push([name, node.slot as number]);
            }
        }
        else {
            node = this.children[token];

            if (!node) {
                for (let key in this.children) {
                    if (key.length > 1 && key !== WILDCARD_ONLY_REGEXP && key !== WILDCARD_TAIL_REGEXP) {
                        throw PATH_ERROR;
                    }
                }

                if (validatePathOnly) {
                    return;
                }

                node = this.children[token] = new Node();
            }
        }

        node.insert(remainingTokens, index, parameters, context, validatePathOnly);
    }
}


export { Node };
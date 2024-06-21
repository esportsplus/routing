import { Node } from './node'
import { Indexes, ParameterMetadata, Path } from './types';


const NEVER_MATCH = [/^$/, [], []] as [RegExp, Indexes, Indexes];


class Trie {
    context = { slot: 0 };
    root = new Node();


    build(): [RegExp, Indexes, Indexes] {
        let regex = this.root.buildRegexString();

        if (regex === '') {
            return NEVER_MATCH;
        }

        let handlers: Indexes = [],
            i = 0,
            parameters: Indexes = [];

        regex = regex.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handler, parameter) => {
            if (typeof handler !== 'undefined') {
                handlers[++i] = Number(handler);
                return '$()';
            }
            else if (typeof parameter !== 'undefined') {
                parameters[Number(parameter)] = ++i;
            }

            return '';
        })

        return [new RegExp(`^${regex}`), handlers, parameters];
    }

    insert(path: Path, index: number, pathErrorCheckOnly: boolean): ParameterMetadata {
        let groups: [string, string][] = [],
            parameters: ParameterMetadata = [];

        for (let i = 0; ;) {
            let replaced = false;

            path = path.replace(/\{[^}]+\}/g, (m) => {
                let mark = `@\\${i}`;

                groups[i++] = [mark, m];
                replaced = true;

                return mark;
            });

            if (!replaced) {
                break;
            }
        }

        /**
         *  - pattern (:label, :label{0-9]+}, ...)
         *  - /* wildcard
         *  - character
         */
        let tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];

        for (let i = groups.length - 1; i >= 0; i--) {
            let [ mark, replacement ] = groups[i],
                token;

            for (let j = tokens.length - 1; j >= 0; j--) {
                token = tokens[j];

                if (token.indexOf(mark) !== -1) {
                    token = token.replace(mark, replacement);
                    break
                }
            }
        }

        this.root.insert(tokens, index, parameters, this.context, pathErrorCheckOnly);

        return parameters;
    }
}


export { Trie };
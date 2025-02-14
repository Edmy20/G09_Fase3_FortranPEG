/** @type {{[node: string]: {[arg: string]: string}}} */
const nodes = {
    Grammar: {
        rules: 'Regla[]',
        globalCode: '?{ before: string; after?: string }',
    },
    Regla: {
        id: 'string',
        expr: 'Opciones',
        alias: '?string',
        start: '?boolean',
    },
    Opciones: {
        exprs: 'Union[]', qty: '?string',
    },
    Union: {
        exprs: 'Node[]',
        action: '?Predicate',
    },
    Predicate: {
        returnType: 'string',
        code: 'string',
        params: '{ [label: string]: string }',
    },
    Pluck: { labeledExpr: 'Label', pluck: '?boolean' },
    Label: { annotatedExpr: 'Annotated', label: '?string' },
    Annotated: { expr: 'Node', qty: '?(string|Node)', text: '?boolean' },
    Assertion: { assertion: '(Annotated|Predicate)' },
    NegAssertion: { assertion: '(Annotated|Predicate)' },
    Cadena: { val: 'string', isCase: '?boolean' , qty: '?string'},
    Grupo: {expr: 'Opciones', qty: '?string'},
    Clase: { chars: '(string|Rango)[]', isCase: '?boolean' , qty: '?string'},
    Rango: { bottom: 'string', top: 'string' },
    Identificador: { id: 'string' },
    Punto: {},
    Fin: {},
};
export default nodes;
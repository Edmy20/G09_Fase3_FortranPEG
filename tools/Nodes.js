/** @type {{[node: string]: {[arg: string]: string}}} */
const nodes = {
    Producciones: {
        id: 'string',
        expr: 'Opciones',
        alias: '?string',
        start: '?boolean',
    },
    Opciones: { exprs: 'Union[]' ,qty: '?string'},
    Union: { exprs: 'Expresion[]' },
    Expresion: { expr: 'Node', label: '?string', qty: '?string' },
    Cadena: { val: 'string', isCase: '?boolean' , qty: '?string'},
    Grupo: {expr: 'Opciones', qty: '?string'},
    Clase: { chars: '(string|Rango)[]', isCase: '?boolean' , qty: '?string'},
    Rango: { bottom: 'string', top: 'string' },
    Identificador: { id: 'string' },
    Punto: {},
    Fin: {},
};

export default nodes;
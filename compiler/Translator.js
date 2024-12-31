import Visitor from '../visitor/Visitor.js';
import * as CST from '../visitor/CST.js';
let numGrupo2 = 0
let numGrupo
/**
 * @typedef {import('../visitor/Visitor.js').default<string>} Visitor
 */
/**
 * @implements {Visitor}
 */
export default class FortranTranslator {
    /**
     * @param {CST.Producciones} node
     * @this {Visitor}
     */
    visitProducciones(node) {
        
        numGrupo = node.expr.exprs
  .flatMap(expr => expr.exprs)  
  .filter(expr => expr.expr instanceof CST.Grupo)  
  .length;  

console.log("Número de instancias de CST.Grupo:", numGrupo);

        let listVars = this.getVarDo(numGrupo)
        numGrupo2 = 0

        const templateProd = 
     `
    function peg_${node.id}() result(accept)
        logical :: accept
        integer :: ${listVars},temp_cursor

        accept = .false.
        ${node.expr.accept(this)}
            ${
                node.start
                    ? `
        if (.not. acceptEOF()) then
            return
        end if
                    `
                    : ''
            }
        accept = .true.
    end function peg_${node.id}
        `;
    return templateProd
    }
    /**
     * @param {CST.Opciones} node
     * @this {Visitor}
     */
    visitOpciones(node) {

const template90 = `
do i = 0, ${node.exprs.length}
    select case(i)
          
        ${node.exprs
            .map((expr, i) => `
        case(${i})
            temp_cursor = cursor 
                ${expr.exprs.map((subExpr) => {
                        return this.printCondition(subExpr.qty,subExpr.expr.accept(this))
                }).join('')}
            exit
            `)
            .join('\n')}
        case default
            return
    end select
end do
`;
        return template90
    }
    /**
     * @param {CST.Union} node
     * @this {Visitor}
     */
    visitUnion(node) {
        
let template11 = "";

for (let i = 0; i < node.exprs.length; i++) {
    template11 += node.exprs[i].accept(this);
    if (i < node.exprs.length - 1) {
        template11 += '\nTERMINA';
    }
}

    return template11
    }
    
    
    /**
     * @param {CST.Expresion} node
     * @this {Visitor}
     */
    visitExpresion(node) {

        if ( node.qty && 
            (node.expr instanceof CST.Cadena
            || node.expr instanceof CST.Clase
            || node.expr instanceof CST.Grupo)
        ){
            node.expr.qty = node.qty 
            
        }



        return node.expr.accept(this);
    }
        /**
     * @param {CST.Grupo} node
     * @this {Visitor}
     */
    visitGrupo(node){
        node.expr.qty = node.qty
        const conditions = node.expr.exprs
        .map(
            (expr) =>
                expr.accept(this)
        )
        .join(' .or. &\n               ')
        return conditions
    }
    /**
     * @param {CST.Cadena} node
     * @this {Visitor}
     */
    visitCadena(node) {
        //console.log(node.isCase)
        const templateString = `acceptString('${node.val}', ${node.isCase === 'i' ? '.true.' : '.false.'})`;
        return templateString
    }

    visitClase(node) {
        // [abc0-9A-Z]
        let characterClass = [];
        const set = node.chars
            .filter((char) => typeof char === 'string')
            .map((char) => `${this.toAsciiString(char)}`);
        const ranges = node.chars
            .filter((char) => char instanceof CST.Rango)
            .map((range) => {
                let rangeStr = range.accept(this);
                // Agregar el tercer parámetro y el paréntesis de cierre
                return `${rangeStr}, ${node.isCase === 'i' ? '.true.' : '.false.'})`;
            });
        if (set.length !== 0) {
            characterClass = [`acceptSet([${set.join(',')}], ${node.isCase === 'i' ? '.true.' : '.false.'})`];
        }
        if (ranges.length !== 0) {
            characterClass = [...characterClass, ...ranges];
        }
        const condition = characterClass.join(' .or. &\n               '); // acceptSet(['a','b','c']) .or. acceptRange('0','9') .or. acceptRange('A','Z')
       return condition
    }
    
    /**
     * @param {CST.Rango} node
     * @this {Visitor}
     */
    visitRango(node) {
        return `acceptRange('${node.bottom}', '${node.top}'`;
    }
    /**
     * @param {CST.Identificador} node
     * @this {Visitor}
     */
    visitIdentificador(node) {
        return `peg_${node.id}()`;
    }
    /**
     * @param {CST.Punto} node
     * @this {Visitor}
     */
    visitPunto(node) {
        return 'acceptPeriod()';
    }
    /**
     * @param {CST.Fin} node
     * @this {Visitor}
     */
    visitFin(node) {
        return 'acceptEOF()';
    }

    toAsciiString(char) {
        //console.log(char);
        const charMap = {
          "\\t": 9,
          "\\n": 10,
          "\\r": 13,
          " ": 32,
        };
    
        if (char in charMap) {
          return charMap[char]
        } else{
          return char.charCodeAt(0);
        }
      }

      printCondition(qty,condition){
        //const condition = node.expr.accept(this);
        console.log("QTY: "+ qty)
        console.log("QTY: "+ condition)
        const templateOneOrMore =  `
                if (.not. (${condition})) then
                    cursor = temp_cursor
                    cycle
                end if
                do while (.not. cursor > len(input))
                    if (.not. (${condition})) then
                        exit
                    end if
                end do
        `
        const templateZeroOrMore =  `
                do while (.not. cursor > len(input))
                    if (.not. (${condition})) then
                        exit
                    end if
                end do
        `
        const templateZeroOrOne =  `
                if (.not. (${condition})) then
                end if
        `
        const templateOne =  `
                if (.not. (${condition})) then
                    cursor = temp_cursor
                    cycle
                end if
        `
        switch (qty) {
            case '+':
                return templateOneOrMore;
            case '*':
                return templateZeroOrMore;
            case '?':
                return templateZeroOrOne;
            default:
                return templateOne;
        }
        
      }
    getVarDo(numero) {
        let resultado = 'i';
        for (let j = 1; j <= numero; j++) {
          resultado += `,i${j}`;
        }
        return resultado;
      }


    
}
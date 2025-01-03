import * as CST from '../visitor/CST.js';
import * as Template from '../Templates.js';
import { getActionId, getReturnType, getExprId, getRuleId } from './utils.js';
let condiciones = []
/** @typedef {import('../visitor/Visitor.js').default<string>} Visitor */
/** @typedef {import('../visitor/Visitor.js').ActionTypes} ActionTypes*/

/**
 * @implements {Visitor}
 */
export default class FortranTranslator {
    /** @type {ActionTypes} */
    actionReturnTypes;
    /** @type {string[]} */
    actions;
    /** @type {boolean} */
    translatingStart;
    /** @type {string} */
    currentRule;
    /** @type {number} */
    currentChoice;
    /** @type {number} */
    currentExpr;

    /**
     *
     * @param {ActionTypes} returnTypes
     */
    constructor(returnTypes) {
        this.actionReturnTypes = returnTypes;
        this.actions = [];
        this.translatingStart = false;
        this.currentRule = '';
        this.currentChoice = 0;
        this.currentExpr = 0;
    }

    /**
     * @param {CST.Grammar} node
     * @this {Visitor}
     */
    visitGrammar(node) {
        const rules = node.rules.map((rule) => rule.accept(this));

        return Template.main({
            beforeContains: node.globalCode?.before ?? '',
            afterContains: node.globalCode?.after ?? '',
            startingRuleId: getRuleId(node.rules[0].id),
            startingRuleType: getReturnType(
                getActionId(node.rules[0].id, 0),
                this.actionReturnTypes
            ),
            actions: this.actions,
            rules,
        });
    }

    /**
     * @param {CST.Regla} node
     * @this {Visitor}
     */
    visitRegla(node) {
        this.currentRule = node.id;
        this.currentChoice = 0;

        if (node.start) this.translatingStart = true;

        const ruleTranslation = Template.rule({
            id: node.id,
            returnType: getReturnType(
                getActionId(node.id, this.currentChoice),
                this.actionReturnTypes
            ),
            exprDeclarations: node.expr.exprs.flatMap((election, i) =>
                election.exprs
                    .filter((expr) => expr instanceof CST.Pluck)
                    .map((label, j) => {
                        const expr = label.labeledExpr.annotatedExpr.expr;
                        const exprType = (expr instanceof CST.Identificador)
                        ? getReturnType(
                            getActionId(expr.id, i),
                            this.actionReturnTypes
                          )
                        : 'character(len=:), allocatable';
                    
                        const exprSingle = `${exprType} :: expr_${i}_${j}\n`
                        const expArr = ('character(len=:), allocatable' === exprType)
                        ? `${exprType} :: expr_${i}_${j}_arr(:)\n`
                        : `${exprType}, allocatable :: expr_${i}_${j}_arr(:)\n`;
                    
                        
                        return exprSingle + expArr
                    })
            ),
            expr: node.expr.accept(this),
        });

        this.translatingStart = false;

        return ruleTranslation;
    }

    /**
     * @param {CST.Opciones} node
     * @this {Visitor}
     */
    visitOpciones(node) {
        return Template.election({
            exprs: node.exprs.map((expr) => {
                const translation = expr.accept(this);
                this.currentChoice++;
                return translation;
            }),
        });
    }

    /**
     * @param {CST.Union} node
     * @this {Visitor}
     */
    visitUnion(node) {
        const matchExprs = node.exprs.filter(
            (expr) => expr instanceof CST.Pluck
        );
        const exprVars = matchExprs.map(
            (_, i) => `expr_${this.currentChoice}_${i}`
        );

        /** @type {string[]} */
        let neededExprs;
        /** @type {string} */
        let resultExpr;
        const currFnId = getActionId(this.currentRule, this.currentChoice);
        if (currFnId in this.actionReturnTypes) {
            neededExprs = exprVars.filter(
                (_, i) => matchExprs[i].labeledExpr.label
            );
            resultExpr = Template.fnResultExpr({
                fnId: getActionId(this.currentRule, this.currentChoice),
                exprs: neededExprs.length > 0 ? neededExprs : [],
            });
        } else {
            neededExprs = exprVars.filter((_, i) => matchExprs[i].pluck);
            resultExpr = Template.strResultExpr({
                exprs: neededExprs.length > 0 ? neededExprs : exprVars,
            });
        }
        this.currentExpr = 0;

        if (node.action) this.actions.push(node.action.accept(this));
        return Template.union({
            exprs: node.exprs.map((expr) => {
                const translation = expr.accept(this);
                if (expr instanceof CST.Pluck) this.currentExpr++;
                return translation;
            }),
            startingRule: this.translatingStart,
            resultExpr,
        });
    }

    /**
     * @param {CST.Pluck} node
     * @this {Visitor}
     */
    visitPluck(node) {
        return node.labeledExpr.accept(this);
    }

    /**
     * @param {CST.Label} node
     * @this {Visitor}
     */
    visitLabel(node) {
        return node.annotatedExpr.accept(this);
    }

    /**
     * @param {CST.Annotated} node
     * @this {Visitor}
     */
    visitAnnotated(node) {

        if (node.qty && typeof node.qty === 'string') {
            if (node.expr instanceof CST.Identificador) {
                // TODO: Implement quantifiers (i.e., ?, *, +)
                return `${getExprId(
                    this.currentChoice,
                    this.currentExpr
                )} = ${node.expr.accept(this)}`;
            }
            return Template.strExpr({
                quantifier: node.qty,
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
            });
        } else if (node.qty) {
            // TODO: Implement repetitions (e.g., |3|, |1..3|, etc...)
            throw new Error('Repetitions not implemented.');
        } else {
            if (node.expr instanceof CST.Identificador) {
                return `${getExprId(
                    this.currentChoice,
                    this.currentExpr
                )} = ${node.expr.accept(this)}`;
            }else if(node.expr instanceof CST.Grupo){
                const nodoGrupal = node.expr.accept(this)
                console.log(nodoGrupal)
                return nodoGrupal
            }
            return Template.strExpr({
                expr: node.expr.accept(this),
                destination: getExprId(this.currentChoice, this.currentExpr),
            });
        }
    }

    printConditions(qty,condicionesList){
        for (let i = 0; i < condicionesLis.length; i++) {
            console.log(condicionesList[i]);
        }
        if (qty && typeof qty === 'string') {

            for (let i = 0; i < condicionesLis.length; i++) {
                console.log(condicionesList[i]);
            }
            
    }
    }


    /**
     * @param {CST.Assertion} node
     * @this {Visitor}
     */
    visitAssertion(node) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {CST.NegAssertion} node
     * @this {Visitor}
     */
    visitNegAssertion(node) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {CST.Predicate} node
     * @this {Visitor}
     */
    visitPredicate(node) {
        return Template.action({
            ruleId: this.currentRule,
            choice: this.currentChoice,
            signature: Object.keys(node.params),
            returnType: node.returnType,
            paramDeclarations: Object.entries(node.params).map(
                ([label, ruleId]) =>
                    `${getReturnType(
                        getActionId(ruleId, this.currentChoice),
                        this.actionReturnTypes
                    )} :: ${label}`
            ),
            code: node.code,
        });
    }

 
    /**
     * @param {CST.Grupo} node
     * @this {Visitor}
     */
    visitGrupo(node){
 
        const conditions = node.expr.exprs
        .map(
            (expr) =>
                expr.accept(this)
        )
        .join('.or.')
        
        return "( "+conditions+" )"
    }
    /**
     * @param {CST.String} node
     * @this {Visitor}
     */
    visitCadena(node) {
        const templateString = `acceptString('${node.val}', ${node.isCase == true ? '.true.' : '.false.'})`;
        return templateString
    }

    /**
     * @param {CST.Clase} node
     * @this {Visitor}
     */
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
                return `${rangeStr}, ${node.isCase == true  ? '.true.' : '.false.'})`;
            });
        if (set.length !== 0) {
            characterClass = [`acceptSet([${set.join(',')}], ${node.isCase == true  ? '.true.' : '.false.'})`];
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
        return getRuleId(node.id) + '()';
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
        return 'if (.not. acceptEOF()) cycle';
    }

    /// FUNCIONES AUXILIARES

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

}
/**
 *
 * @param {{
 *  beforeContains: string
 *  afterContains: string
 *  startingRuleId: string;
 *  startingRuleType: string;
 *  rules: string[];
 *  actions: string[];
 * }} data
 * @returns {string}
 */
export const main = (data) => `
!auto-generated
module parser
    implicit none
    character(len=:), allocatable, private :: input,expected
    integer, private :: savePoint, lexemeStart, cursor,lexemeEnd
    logical :: accepted
    interface toStr
        module procedure intToStr
        module procedure strToStr
    end interface
    
    ${data.beforeContains}

    contains
    
    ${data.afterContains}

    function parse(str) result(res)
        character(len=:), allocatable :: str
        ${data.startingRuleType} :: res
        ${data.startingRuleType} :: resultado
        logical :: success

        input = str
        cursor = 1
        call ${data.startingRuleId}(resultado,success,.false.)
        if (success) then
            res = resultado
        else
            call pegError(.false.)
        end if
    end function parse

    ${data.rules.join('\n')}

    ${data.actions.join('\n')}

    function acceptString(str,isCase) result(accept)
        character(len=*) :: str
        logical :: accept,isCase
        integer :: offset
        offset = len(str) - 1
        if(isCase) then
            if (to_lower(str) /= to_lower(input(cursor:cursor + offset))) then
                accept = .false.
                expected = str
                return
            end if
        else
            if (str /= input(cursor:cursor + offset)) then
                accept = .false.
                expected = str
                return
            end if
        end if
        cursor = cursor + len(str);
        accept = .true.
    end function acceptString

    function acceptRange(bottom, top, isCase) result(accept)
        character(len=1) :: bottom, top
        logical :: accept, isCase

        if (isCase) then
            if (.not. (to_lower(input(cursor:cursor)) >= to_lower(bottom) .and. &
                to_lower(input(cursor:cursor)) <= to_lower(top))) then
                 expected = "["// bottom // "-" // top //"]"
                accept = .false.
                return
            end if
        else
            if (.not. (input(cursor:cursor) >= bottom .and. &
                input(cursor:cursor) <= top)) then
                expected = "["// bottom // "-" // top //"]"
                accept = .false.
                return
            end if
        end if
        cursor = cursor + 1
        accept = .true.
    end function acceptRange

    function acceptSet(set, isCase) result(accept)
        integer, dimension(:),intent(in) :: set
        logical :: accept, isCase
        character(len=1) :: char_to_check
        integer :: i,ascii_code

        accept = .false.
       
        if (isCase) then
            char_to_check = to_lower(input(cursor:cursor))
        else
            char_to_check = input(cursor:cursor)
        end if

        ascii_code = iachar(char_to_check)
        !print *, ascii_code
        if (any(findloc(set, ascii_code) > 0)) then 
            accept = .true. 
            cursor = cursor + 1 
        else 
            expected =  list_to_string(set)
        end if

    end function acceptSet


    function acceptPeriod() result(accept)
        logical :: accept

        if (cursor > len(input)) then
            accept = .false.
            expected = "<ANYTHING>"
            return
        end if
        cursor = cursor + 1
        accept = .true.
    end function acceptPeriod

    function acceptEOF() result(accept)
        logical :: accept

        if(.not. cursor > len(input)) then
            accept = .false.
            expected = "<EOF>"
            return
        end if
        accept = .true.
    end function acceptEOF

    function consumeInput() result(substr)
        character(len=:), allocatable :: substr

        substr = input(lexemeStart:cursor - 1)
    end function consumeInput

    subroutine pegError2(anulable)
        logical :: anulable
        if(anulable) then
        accepted = .false.
        print *, "CONTINUA"
        else
        print '(A,I1,A)', "Error at ", cursor, ": '"//input(cursor:cursor)//"'"
        call exit(1)
        end if
    end subroutine pegError2

    subroutine pegError(anulable)
        logical, intent(in) :: anulable
        if(.not. anulable) then
        print '(A,I1,A)', "Error at ", cursor, ": '"//input(cursor:cursor)//"'"
        call exit(1)
        end if
    end subroutine pegError

    function intToStr(int) result(cast)
        integer :: int
        character(len=31) :: tmp
        character(len=:), allocatable :: cast

        write(tmp, '(I0)') int
        cast = trim(adjustl(tmp))
    end function intToStr

    function strToStr(str) result(cast)
        character(len=:), allocatable :: str
        character(len=:), allocatable :: cast

        cast = str
    end function strToStr

    function to_lower(str) result(lower_str)
        character(len=*), intent(in) :: str
        character(len=len(str)) :: lower_str
        integer :: i

        do i = 1, len(str)
             if (iachar(str(i:i)) >= iachar('A') .and. iachar(str(i:i)) <= iachar('Z')) then
                lower_str(i:i) = achar(iachar(str(i:i)) + 32)
            else
                lower_str(i:i) = str(i:i)
            end if
        end do
    end function to_lower

    function list_to_string(set) result(result_str)
        integer, dimension(:),intent(in) :: set
        character(len=:), allocatable :: result_str
        integer :: total_length, i
    
        total_length = size(set) * 3 - 1  
    
        allocate(character(len=total_length) :: result_str)
        result_str = '['
        do i = 1, size(set)
            select case (set(i))
            case (10) ! Nueva línea
                result_str = result_str // '\\n'
            case (9)  ! Tabulación
                result_str = result_str // '\\t'
            case (13) ! Retorno de carro
                result_str = result_str // '\\r'
            case (32) ! Espacio
                result_str = result_str // '_'
            case default
                result_str = result_str // achar(set(i))

            end select
        end do
    
        result_str = result_str // ']'
    
    end function list_to_string


end module parser
`;

/**
 *
 * @param {{
 *  id: string;
 *  returnType: string;
 *  exprDeclarations: string[];
 *  expr: string;
 * }} data
 * @returns
 */
export const rule = (data) => `
    subroutine peg_${data.id}(res,success,anulable)
        ${data.returnType}, intent(out) :: res
        logical, intent(out) :: success
        logical, intent(in) :: anulable
        ${data.exprDeclarations.join('\n')}
        integer :: i

        savePoint = cursor
        success = .false.
        ${data.expr}
    end subroutine peg_${data.id}
`;

/**
 *
 * @param {{
 *  exprs: string[]
 * }} data
 * @returns
 */
export const election2 = (data) => `
        do i = 0, ${data.exprs.length}
            select case(i)
            ${data.exprs.map(
                (expr, i) => `
            case(${i})
                cursor = savePoint
                ${expr}
                exit
            `
            )}
            case default
                call pegError(anulable)
            end select
        end do
`;

export const election = (data) => `
    do i = 0, ${data.exprs.length}
        select case(i)
        ${data.exprs.map((expr, i) => `
            case(${i})
                cursor = savePoint
                ${expr}
                exit
        `).join('\n')}
        case default
            call pegError(anulable)
        end select
    end do
`;

/**
 *
 * @param {{
 *  exprs: string[]
 *  startingRule: boolean
 *  resultExpr: string
 * }} data
 * @returns
 */
export const union = (data) => `
                ${data.exprs.join('\n')}
                ${data.startingRule ? 'if (.not. acceptEOF()) cycle' : ''}
                ${data.resultExpr}
`;

/**
 *
 * @param {{
 *  expr: string;
 *  destination: string
 *  quantifier?: string;
 * }} data
 * @returns
 */
export const strExpr = (data) => {
    if (!data.quantifier) {
        return `
                lexemeStart = cursor
                if(.not. ${data.expr}) cycle
                ${data.destination} = consumeInput()
        `;
    }
    switch (data.quantifier) {
        case '+':
            return `
                lexemeStart = cursor
                if (.not. ${data.expr}) cycle
                do while (.not. cursor > len(input))
                    if (.not. ${data.expr}) exit
                end do
                ${data.destination} = consumeInput()
            `;
            case '*':
                return `
                    lexemeStart = cursor
                    do while (.not. cursor > len(input))
                        if (.not. ${data.expr}) exit
                    end do
                    ${data.destination} = consumeInput()
                `;
            case '?':
                    return `
                        lexemeStart = cursor
                        if (.not. ${data.expr}) then
                        end if
                        ${data.destination} = consumeInput()
                    `;
        default:
            throw new Error(
                `'${data.quantifier}' quantifier needs implementation`
            );
    }
};

export const idExpr = (data) => {
    if (!data.quantifier) {
        return `call ${data.ruleId}(${data.exprName},success,.false.)
        if (.not. success) cycle`;
    }
    switch (data.quantifier) {
        case '+':
            return `call ${data.ruleId}(${data.exprName},success, .false.)
                if (.not. success) cycle
                call qty_${data.ruleId}_f${data.choice}(${data. exprName}, success)`;
            case '*':
                return `            
                call qty_${data.ruleId}_f${data.choice}(${data. exprName}, success)
                if (.not. success) then
                end if` ;
            case '?':
                return `call ${data.ruleId}(${data. exprName},success, .true.)
                if (.not. success) then
                end if`;
        default:
                return ''
    }
};
/**
 *
 * @param {{
 *  exprs: string[];
 * }} data
 * @returns
 */
export const strResultExpr = (data) => `
                res = ${data.exprs.map((expr) => `toStr(${expr})`).join('//')}
                success = .true.`;

/**
 *
 * @param {{
 *  fnId: string;
 *  exprs: string[];
 * }} data
 * @returns
 */
export const fnResultExpr = (data) => `
                call ${data.fnId}(${data.exprs.join(', ')}, res, success)
                if(success) then
                    exit
                end if
`;

/**
 *
 * @param {{
 *  ruleId: string;
 *  choice: number
 *  signature: string[];
 *  returnType: string;
 *  paramDeclarations: string[];
 *  code: string;
 * }} data
 * @returns
 */
export const action = (data) => {
    const signature = data.signature.join(', ');
    return `
    subroutine peg_${data.ruleId}_f${data.choice}(${signature},res, success)
        ${data.paramDeclarations.join('\n')}
        ${data.returnType}, intent(out) :: res
        logical, intent(out) :: success
        ${data.code}
        success = .true.
     end subroutine peg_${data.ruleId}_f${data.choice}
    `;
};

export const actionQty = (data) => {
    let endConcat = ""
    if(data.tempVar === 'character(len=:), allocatable'){
        endConcat = `           ${data.exprName}_concat = ${data.exprName}_concat // toStr(${data.exprName})`
    }
    return `
    subroutine qty_${data.ruleId}_f${data.choice}(res, success)
    ${data.tempVar},intent(out) :: res
    logical, intent(out) :: success
    ${data.tempVar} :: ${data.exprName}
    ${data.tempVar} :: ${data.exprName}_concat


    do
        call ${data.ruleId}(${data.exprName}, success,.true.)
        if (.not. success) exit
        ${endConcat}
    end do

    ! Asignar el valor concatenado final a res
    res = ${data.exprName}_concat
    success = .true.
end subroutine qty_${data.ruleId}_f${data.choice}
    `;
};
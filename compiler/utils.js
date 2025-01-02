import FortranTranslator from './Translator.js';

/** @typedef {import('../visitor/CST.js').Producciones} Produccion*/
/** @typedef {import('../visitor/Visitor.js').default<string>} Visitor*/
/**
 *
 * @param {Produccion[]} cst
 */
export default async function generateParser(cst) {
    /** @type(Visitor) */
    const translator = new FortranTranslator();
    return `
module parser
    implicit none
    integer, private :: cursor
    character(len=:), allocatable, private :: input, expected

    contains

    subroutine parse(str)
        character(len=:), allocatable, intent(in) :: str

        input = str
        cursor = 1
        expected = ''
        if (peg_${cst[0].id}()) then
            print *, "Parsed input succesfully!"
        else
            call error()
        end if
    end subroutine parse

    subroutine error()
        if (cursor > len(input)) then
            print *, "Error: Expected "//expected//", but found <EOF>"
            call exit(1)
        end if
        print *, "Error: Expected "//expected//", but found '"//input(cursor:cursor)//"'" // " at ", cursor
        call exit(1)
    end subroutine error

    ${cst.map((rules) => rules.accept(translator)).join('\n')}

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

    ! Funciones Auxiliares para verificacion
    
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
}
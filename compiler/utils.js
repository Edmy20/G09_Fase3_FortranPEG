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
        print *, "Error: Expected "//expected//", but found '"//input(cursor:cursor)//"'"
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

    function acceptRange(bottom, top) result(accept)
        character(len=1) :: bottom, top
        logical :: accept

        if(.not. (input(cursor:cursor) >= bottom .and. input(cursor:cursor) <= top)) then
            accept = .false.
            return
        end if
        cursor = cursor + 1
        accept = .true.
    end function acceptRange

    function acceptSet(set) result(accept)
        character(len=1), dimension(:) :: set
        logical :: accept

        if(.not. (findloc(set, input(cursor:cursor), 1) > 0)) then
            accept = .false.
            return
        end if
        cursor = cursor + 1
        accept = .true.
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
end module parser
    `;
}
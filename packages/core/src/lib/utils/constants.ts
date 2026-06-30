export const REGEX_KEY_LETTER_NUMBERS_DASH_UNDERCODE_WITH_FIRST_LETTER = 'regex_letter_numbers_dash_undercode_with_first_letter';
export const REGEX_KEY_ONLY_NUMBERS = 'regex_only_numbers';

export const CONSTANTS = {
    /** 
     * REGEX CONSTANTS
     */

    REGEX_SPACES_AND_SPECIAL_LETTERS_NUMBERS_SLASH_DOT: '[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ \\-\\.]*',
    REGEX_SPACES_AND_SPECIAL_LETTERS: '[a-zA-ZñÑáéíóúÁÉÍÓÚ ]*',
    REGEX_CODIGO_POSTAL: '([0-9]{4})|([a-zA-Z][0-9]{4}[a-zA-Z]{3})',
    REGEX_LETTERS_NUMBERS: '[a-zA-Z0-9]*',
    REGEX_ALIAS_CBU: '[a-zA-Z0-9\\-\\.]*',
    REGEX_CUIL: '(20|23|24|27|30|33|34)[0-9]{9}',
    REGEX_CUIT: '(20|23|24|27)[0-9]{9}',
    REGEX_EMAIL: '(\\s*?(.+)@(.+?)\\s)*',
    REGEX_USER: '[a-z][a-z0-9\\_\\-]{4,15}',
    REGEX_DATE: '([0-2][0-9]|3[0-1])(\/)(0[1-9]|1[0-2])(\/)(\d{4})',
    REGEX_URL: '^((https?:\\/\\/)|(http?:\\/\\/))' +
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
        '((\\d{1,3}\\.){3}\\d{1,3}))' +
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
        '(\\?[;&a-z\\d%_.~+=-]*)?' +
        '(\\#[-a-z\\d_]*)?$',

    REGEXS: [{
        key: REGEX_KEY_LETTER_NUMBERS_DASH_UNDERCODE_WITH_FIRST_LETTER,
        messageKey: 'letter_numbers_dash_undercode_with_first_letter_message',
        regex: '[a-z][a-z0-9\\_\\-]*'
    },
    {
        key: REGEX_KEY_ONLY_NUMBERS,
        messageKey: 'only_numbers_message',
        regex: '[0-9]*'
    }]
};


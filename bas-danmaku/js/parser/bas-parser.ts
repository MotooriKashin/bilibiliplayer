import { AstHelper } from './ast-helper';
import BasLexer from './bas-lexer';

class BasParser {
    private actionTable: Array<any>;
    private gotoTable: any;
    private prodList: Array<any>;
    private inputTable: any;
    protected ast_helper = new AstHelper();

    constructor() {
        this.actionTable = [
            null,
            {
                0: 6,
                1: 1,
                2: 2,
                67: 54,
                68: 36,
                69: 20,
                70: 16,
                8: 4,
                9: 8,
                10: 10,
                76: 12,
                77: 32,
                78: 50,
                73: 148,
                74: 44,
                85: 52,
                89: 14,
                90: 150,
                29: 18,
                101: 120,
                41: 150,
                43: 36,
                47: 104,
                112: 40,
                115: 34,
                116: 38,
                120: 56,
                124: 150,
                125: 42,
            },
            {
                0: 6,
                2: 9,
                67: 54,
                4: 22,
                69: 20,
                70: 16,
                8: 4,
                9: 8,
                10: 10,
                76: 12,
                77: 32,
                14: 9,
                73: 148,
                18: 9,
                85: 52,
                78: 50,
                24: 28,
                25: 9,
                90: 150,
                74: 44,
                29: 18,
                68: 36,
                89: 14,
                36: 26,
                101: 120,
                41: 150,
                43: 36,
                47: 104,
                112: 40,
                115: 34,
                116: 38,
                120: 56,
                124: 150,
                125: 42,
            },
            {
                3: 25,
                5: 33,
                6: 35,
                7: 37,
                12: 43,
                16: 57,
                19: 68,
                21: 43,
                23: 68,
                26: 68,
                28: 43,
                30: 87,
                31: 68,
                32: 95,
                35: 87,
                38: 87,
                39: 68,
                40: 68,
                44: 66,
                45: 87,
                47: 104,
                48: 106,
                53: 102,
                54: 98,
                61: 96,
                62: 100,
                64: 132,
                65: 134,
                66: 68,
                71: 87,
                72: 87,
                75: 187,
                79: 68,
                80: 201,
                82: 140,
                86: 95,
                87: 112,
                88: 87,
                92: 64,
                93: 94,
                94: 70,
                95: 90,
                96: 92,
                98: 87,
                101: 120,
                106: 239,
                107: 138,
                109: 110,
                110: 108,
                113: 46,
                114: 72,
                117: 136,
                121: 68,
                122: 87,
            },
            {
                0: 6,
                2: 11,
                67: 54,
                4: 22,
                69: 20,
                70: 16,
                8: 4,
                9: 8,
                10: 10,
                11: 41,
                68: 36,
                13: 49,
                14: 11,
                73: 148,
                18: 11,
                20: 65,
                77: 32,
                78: 50,
                124: 150,
                24: 28,
                25: 11,
                90: 150,
                27: 81,
                92: 161,
                29: 18,
                33: 135,
                34: 30,
                91: 229,
                36: 26,
                74: 44,
                85: 52,
                76: 12,
                41: 150,
                89: 14,
                43: 36,
                101: 120,
                46: 161,
                47: 104,
                112: 40,
                115: 34,
                99: 161,
                120: 56,
                116: 38,
                125: 42,
            },
            {
                19: 68,
                23: 68,
                24: 28,
                25: 24,
                29: 18,
                30: 89,
                31: 68,
                35: 139,
                36: 26,
                37: 141,
                39: 68,
                43: 36,
                44: 66,
                45: 159,
                47: 104,
                48: 106,
                53: 102,
                54: 98,
                61: 96,
                62: 100,
                64: 132,
                65: 134,
                66: 68,
                68: 36,
                69: 20,
                70: 16,
                71: 183,
                76: 12,
                77: 32,
                79: 68,
                82: 140,
                87: 112,
                88: 225,
                89: 14,
                92: 64,
                93: 94,
                94: 70,
                95: 90,
                96: 92,
                98: 237,
                101: 120,
                107: 138,
                109: 110,
                110: 108,
                113: 46,
                114: 72,
                115: 34,
                116: 38,
                117: 136,
                121: 68,
                122: 48,
                123: 251,
            },
            {
                0: 6,
                2: 13,
                67: 54,
                4: 22,
                69: 20,
                70: 16,
                8: 4,
                9: 8,
                10: 10,
                76: 12,
                77: 32,
                14: 13,
                73: 148,
                18: 13,
                85: 52,
                78: 50,
                24: 28,
                25: 13,
                90: 150,
                74: 44,
                29: 18,
                68: 36,
                89: 14,
                36: 26,
                101: 120,
                41: 150,
                43: 36,
                47: 104,
                112: 40,
                115: 34,
                116: 38,
                120: 56,
                124: 150,
                125: 42,
            },
            { 3: 27, 20: 67, 21: 45, 27: 83, 12: 45, 28: 45, 15: 55 },
            {
                64: 132,
                65: 134,
                67: 54,
                94: 70,
                117: 136,
                72: 185,
                120: 56,
                111: 243,
                78: 50,
                82: 140,
                85: 52,
                22: 71,
                87: 112,
                26: 68,
                92: 64,
                93: 94,
                86: 80,
                95: 90,
                32: 80,
                33: 137,
                100: 84,
                101: 120,
                38: 143,
                40: 68,
                107: 138,
                44: 66,
                109: 110,
                110: 108,
                47: 104,
                48: 106,
                96: 92,
                114: 72,
                108: 76,
                53: 102,
                54: 98,
                55: 173,
                56: 74,
                57: 78,
                58: 82,
                59: 86,
                60: 88,
                61: 96,
                62: 100,
            },
            {
                36: 39,
                69: 20,
                70: 16,
                10: 39,
                43: 36,
                76: 12,
                77: 32,
                47: 104,
                115: 34,
                116: 38,
                68: 36,
                101: 120,
                24: 39,
                89: 14,
                29: 18,
            },
            {
                64: 132,
                65: 134,
                117: 136,
                118: 144,
                77: 197,
                82: 140,
                83: 146,
                84: 215,
                87: 112,
                92: 64,
                93: 94,
                94: 231,
                95: 90,
                96: 92,
                100: 84,
                101: 120,
                107: 138,
                109: 110,
                110: 108,
                47: 104,
                48: 106,
                53: 102,
                54: 98,
                119: 142,
                57: 175,
                58: 82,
                59: 86,
                60: 88,
                61: 96,
                62: 100,
            },
            {
                0: 6,
                2: 15,
                67: 54,
                68: 36,
                69: 20,
                70: 16,
                8: 4,
                9: 8,
                10: 10,
                76: 12,
                77: 32,
                78: 50,
                73: 148,
                74: 44,
                85: 52,
                89: 14,
                90: 150,
                29: 18,
                101: 120,
                41: 150,
                43: 36,
                47: 104,
                112: 40,
                115: 34,
                116: 38,
                120: 56,
                124: 150,
                125: 42,
            },
            {
                0: 6,
                2: 17,
                67: 54,
                68: 36,
                69: 20,
                70: 16,
                8: 4,
                9: 8,
                10: 10,
                76: 12,
                77: 32,
                78: 50,
                73: 148,
                74: 44,
                85: 52,
                89: 14,
                90: 150,
                29: 18,
                101: 120,
                41: 150,
                43: 36,
                47: 104,
                112: 40,
                115: 34,
                116: 38,
                120: 56,
                124: 150,
                125: 42,
            },
            { 17: 59, 42: 153, 46: 163 },
            { 32: 97, 75: 97, 52: 97, 86: 97, 80: 97, 106: 97, 43: 97, 68: 97 },
            { 32: 99, 80: 99, 106: 99, 75: 99, 52: 99, 86: 99 },
            { 32: 118, 49: 114, 50: 116, 52: 118, 86: 118, 80: 118, 106: 118, 75: 118, 63: 177 },
            { 87: 221 },
            { 32: 101, 80: 101, 106: 101, 75: 101, 52: 101, 86: 101 },
            { 32: 103, 80: 103, 106: 103, 75: 103, 52: 103, 86: 103 },
            { 32: 105, 97: 105, 52: 105, 86: 105, 80: 105, 106: 105, 75: 105 },
            { 104: 126, 81: 205, 105: 128, 51: 130, 102: 122, 103: 124 },
            { 104: 126, 81: 207, 105: 128, 51: 130, 102: 122, 103: 124 },
            { 104: 126, 81: 209, 105: 128, 51: 130, 102: 122, 103: 124 },
            { 104: 126, 81: 211, 105: 128, 51: 130, 102: 122, 103: 124 },
            { 104: 126, 81: 213, 105: 128, 51: 130, 102: 122, 103: 124 },
            { 32: 107, 80: 107, 75: 107, 86: 107 },
            {
                101: 120,
                118: 144,
                109: 110,
                110: 108,
                47: 104,
                48: 106,
                83: 146,
                52: 167,
                53: 102,
                54: 98,
                87: 112,
                84: 217,
                61: 96,
                62: 100,
                119: 142,
            },
            { 67: 54, 85: 52, 120: 56, 41: 149, 90: 149, 124: 149, 78: 50 },
        ];
        this.gotoTable = {
            64: { 52: 171 },
            29: { 0: 5 },
            30: { 0: 7 },
            31: { 2: 19 },
            32: { 2: 21 },
            33: { 25: 75, 18: 61, 2: 23, 14: 51 },
            34: { 79: 199, 23: 73, 19: 63, 39: 145, 40: 147, 121: 247, 26: 79, 66: 179, 31: 93 },
            35: { 68: 181, 43: 155 },
            36: { 3: 29 },
            37: { 4: 31 },
            38: { 14: 53 },
            39: { 25: 77 },
            40: { 12: 47, 21: 69, 28: 85 },
            41: { 32: 109, 75: 109, 52: 109, 86: 109, 80: 109, 106: 109, 43: 157, 68: 157 },
            42: { 97: 233 },
            43: { 32: 111, 97: 235, 52: 111, 86: 111, 80: 111, 106: 111, 75: 111 },
            44: { 124: 253, 41: 151, 90: 227 },
            45: { 113: 245 },
            46: { 122: 249 },
            47: { 32: 113 },
            49: { 75: 189 },
            50: { 88: 91, 98: 91, 35: 91, 38: 91, 71: 91, 72: 91, 122: 91, 45: 91, 30: 91 },
            51: { 75: 191 },
            52: { 32: 115, 86: 219 },
            53: { 32: 117, 86: 117 },
            54: { 32: 119, 80: 203, 86: 119 },
            55: { 32: 121, 80: 121, 106: 241, 75: 193, 52: 169, 86: 121 },
            56: { 32: 123, 80: 123, 75: 195, 86: 123 },
            57: { 32: 125, 80: 125, 106: 125, 75: 125, 52: 125, 86: 125 },
            58: { 32: 127, 80: 127, 106: 127, 75: 127, 52: 127, 86: 127 },
            59: { 32: 129, 80: 129, 106: 129, 75: 129, 52: 129, 86: 129 },
            60: { 87: 223 },
            61: { 51: 165 },
            62: { 32: 131, 80: 131, 75: 131, 86: 131 },
            63: { 32: 133, 80: 133, 75: 133, 86: 133 },
        };
        this.prodList = [
            [65, 2],
            [29, 1],
            [30, 2],
            [30, 0],
            [31, 1],
            [31, 1],
            [33, 6],
            [33, 6],
            [33, 5],
            [33, 3],
            [33, 5],
            [37, 0],
            [39, 0],
            [38, 2],
            [38, 1],
            [36, 3],
            [35, 1],
            [35, 3],
            [35, 0],
            [42, 1],
            [32, 7],
            [32, 12],
            [32, 5],
            [45, 0],
            [46, 0],
            [40, 4],
            [40, 4],
            [40, 3],
            [40, 6],
            [48, 3],
            [48, 1],
            [48, 0],
            [49, 1],
            [34, 2],
            [34, 0],
            [50, 3],
            [50, 4],
            [47, 1],
            [52, 3],
            [52, 1],
            [52, 0],
            [53, 1],
            [53, 3],
            [54, 1],
            [54, 1],
            [51, 1],
            [51, 1],
            [51, 1],
            [55, 1],
            [55, 1],
            [55, 1],
            [55, 1],
            [41, 1],
            [58, 1],
            [57, 3],
            [60, 1],
            [60, 0],
            [59, 1],
            [59, 1],
            [59, 0],
            [43, 3],
            [61, 2],
            [61, 2],
            [61, 2],
            [61, 2],
            [61, 0],
            [56, 1],
            [56, 1],
            [63, 4],
            [62, 3],
            [62, 2],
            [64, 3],
            [64, 3],
            [64, 1],
            [44, 1],
            [44, 0],
        ];
        this.inputTable = {
            '<$>': 1,
            set: 2,
            id: 3,
            '{': 4,
            '}': 5,
            apply: 6,
            '(': 7,
            ')': 8,
            then: 9,
            ',': 10,
            def: 11,
            let: 12,
            '=': 13,
            time: 14,
            hex: 15,
            number: 16,
            '%': 17,
            '+': 18,
            '-': 19,
            str_start: 20,
            str_end: 21,
            str_esc_char: 22,
            str_esc_unicode: 23,
            str_esc_ascii: 24,
            str_seg: 25,
            '[': 26,
            ']': 27,
            ';': 28,
        };
    }

    static parse(source: any) {
        const lexer = new BasLexer();
        lexer['source'] = source;
        const parser = new BasParser();
        const result = parser.parseLexer(lexer);
        return result;
    }

    parseLexer(lexer: any) {
        const stateStack = [0];
        const outputStack: any[] = [];
        let state;
        let token;
        let act;

        while (true) {
            token = lexer['token'];
            state = stateStack[stateStack.length - 1];
            if (this.actionTable[this.inputTable[token]][state] == null) {
                throw new Error('Parse Error:' + lexer['positionInfo']);
            } else {
                act = this.actionTable[this.inputTable[token]][state];
            }
            if (act === 1) {
                return outputStack.pop();
            } else if ((act & 1) === 1) {
                outputStack.push(lexer['yytext']);
                stateStack.push((act >>> 1) - 1);
                lexer.advance();
            } else if ((act & 1) === 0) {
                const pi = act >>> 1;
                const length = this.prodList[pi][1];
                let result = null;
                /** actions applying **/
                /** default action **/
                if (length > 0) {
                    result = outputStack[outputStack.length - length];
                }
                switch (pi) {
                    case 0x1:
                        result = this.ast_helper.on_Result(outputStack[outputStack.length - 1]);
                        break;
                    case 0x2:
                        result = outputStack[outputStack.length - 2];
                        result.push(outputStack[outputStack.length - 1]);

                        break;
                    case 0x3:
                        result = [];

                        break;
                    case 0x4:
                        break;
                    case 0x5:
                        result = { type: 'SetExpr', params: outputStack[outputStack.length - 1] };

                        break;
                    case 0x6:
                        result = this.ast_helper.on_unit_set_expr(
                            outputStack[outputStack.length - 5],
                            outputStack[outputStack.length - 3],
                            outputStack[outputStack.length - 1],
                        );

                        break;
                    case 0x7:
                        result = this.ast_helper.on_temporary_target_set_expr(
                            outputStack[outputStack.length - 5],
                            outputStack[outputStack.length - 3],
                            outputStack[outputStack.length - 1],
                        );

                        break;
                    case 0x8:
                        result = {
                            type: 'ApplyExpr',
                            params: [outputStack[outputStack.length - 4], outputStack[outputStack.length - 2]],
                        };

                        break;
                    case 0x9:
                        result = this.ast_helper.on_then_set_expr(
                            outputStack[outputStack.length - 3],
                            outputStack[outputStack.length - 1],
                        );

                        break;
                    case 0xa:
                        result = this.ast_helper.on_group_set_expr(outputStack[outputStack.length - 3]);

                        break;
                    case 0xb:
                        this.ast_helper.on_enter_scope();
                        break;
                    case 0xc:
                        this.ast_helper.on_leave_scope();
                        break;
                    case 0xd:
                        result = outputStack[outputStack.length - 2];
                        result.push(outputStack[outputStack.length - 1]);

                        break;
                    case 0xe:
                        result = [outputStack[outputStack.length - 1]];

                        break;
                    case 0xf:
                        result = outputStack[outputStack.length - 2];

                        break;
                    case 0x10:
                        result = [outputStack[outputStack.length - 1]];
                        break;
                    case 0x11:
                        result = [outputStack[outputStack.length - 3], outputStack[outputStack.length - 1]];
                        break;
                    case 0x12:
                        result = [];
                        break;
                    case 0x13:
                        break;
                    case 0x14:
                        result = this.ast_helper.on_def_object(
                            outputStack[outputStack.length - 6],
                            outputStack[outputStack.length - 5],
                            outputStack[outputStack.length - 3],
                        );

                        break;
                    case 0x15:
                        result = this.ast_helper.on_def_template(
                            outputStack[outputStack.length - 11],
                            outputStack[outputStack.length - 10],
                            outputStack[outputStack.length - 8],
                            outputStack[outputStack.length - 4],
                        );

                        break;
                    case 0x16:
                        result = this.ast_helper.on_let_object_binding(
                            outputStack[outputStack.length - 4],
                            outputStack[outputStack.length - 2],
                        );

                        break;
                    case 0x17:
                        this.ast_helper.on_enter_tpl();
                        break;
                    case 0x18:
                        this.ast_helper.on_leave_tpl();
                        break;
                    case 0x19:
                        result = this.ast_helper.on_object_modification(
                            outputStack[outputStack.length - 4],
                            outputStack[outputStack.length - 2],
                        );

                        break;
                    case 0x1a:
                        result = this.ast_helper.on_template_application(
                            outputStack[outputStack.length - 4],
                            outputStack[outputStack.length - 2],
                        );

                        break;
                    case 0x1b:
                        result = outputStack[outputStack.length - 2];
                        break;
                    case 0x1c:
                        result = this.ast_helper.on_tmp_object_modification(
                            outputStack[outputStack.length - 5],
                            outputStack[outputStack.length - 3],
                        );

                        break;
                    case 0x1d:
                        result = outputStack[outputStack.length - 3];
                        result.push(outputStack[outputStack.length - 1]);
                        break;
                    case 0x1e:
                        result = [outputStack[outputStack.length - 1]];
                        break;
                    case 0x1f:
                        result = [];
                        break;
                    case 0x20:
                        result = this.ast_helper.on_Variable_value(outputStack[outputStack.length - 1]);
                        break;
                    case 0x21:
                        result = outputStack[outputStack.length - 2];
                        result.push(outputStack[outputStack.length - 1]);

                        break;
                    case 0x22:
                        result = [];

                        break;
                    case 0x23:
                        result = [outputStack[outputStack.length - 3], outputStack[outputStack.length - 1]];

                        break;
                    case 0x24:
                        result = [outputStack[outputStack.length - 4], outputStack[outputStack.length - 2]];

                        break;
                    case 0x25:
                        result = this.ast_helper.on_ArgList(outputStack[outputStack.length - 1]);
                        break;
                    case 0x26:
                        result = outputStack[outputStack.length - 1];
                        result.unshift(outputStack[outputStack.length - 3]);
                        break;
                    case 0x27:
                        result = [outputStack[outputStack.length - 1]];
                        break;
                    case 0x28:
                        result = [];
                        break;
                    case 0x29:
                        result = [null, outputStack[outputStack.length - 1]];
                        break;
                    case 0x2a:
                        result = [outputStack[outputStack.length - 3], outputStack[outputStack.length - 1]];
                        break;
                    case 0x2b:
                        break;
                    case 0x2c:
                        break;
                    case 0x2d:
                        break;
                    case 0x2e:
                        break;
                    case 0x2f:
                        break;
                    case 0x30:
                        break;
                    case 0x31:
                        break;
                    case 0x32:
                        break;
                    case 0x33:
                        break;
                    case 0x34:
                        result = this.ast_helper.on_Time_value(outputStack[outputStack.length - 1]);
                        break;
                    case 0x35:
                        result = this.ast_helper.on_Hex_value(outputStack[outputStack.length - 1]);
                        break;
                    case 0x36:
                        result = this.ast_helper.on_Num_value(
                            outputStack[outputStack.length - 3],
                            outputStack[outputStack.length - 2],
                            outputStack[outputStack.length - 1],
                        );
                        break;
                    case 0x37:
                        break;
                    case 0x38:
                        break;
                    case 0x39:
                        break;
                    case 0x3a:
                        break;
                    case 0x3b:
                        result = '+';
                        break;
                    case 0x3c:
                        result = this.ast_helper.on_String_value(outputStack[outputStack.length - 2]);
                        break;
                    case 0x3d:
                        result = outputStack[outputStack.length - 2];
                        result.push({ type: 'char', value: outputStack[outputStack.length - 1] });
                        break;
                    case 0x3e:
                        result = outputStack[outputStack.length - 2];
                        result.push({ type: 'unicode', value: outputStack[outputStack.length - 1] });
                        break;
                    case 0x3f:
                        result = outputStack[outputStack.length - 2];
                        result.push({ type: 'ascii', value: outputStack[outputStack.length - 1] });
                        break;
                    case 0x40:
                        result = outputStack[outputStack.length - 2];
                        result.push({ type: 'seg', value: outputStack[outputStack.length - 1] });
                        break;
                    case 0x41:
                        result = [];
                        break;
                    case 0x42:
                        break;
                    case 0x43:
                        break;
                    case 0x44:
                        result = this.ast_helper.on_Object_value(
                            outputStack[outputStack.length - 4],
                            this.ast_helper.on_KeyValue_list(
                                outputStack[outputStack.length - 4],
                                outputStack[outputStack.length - 2],
                            ),
                        );

                        break;
                    case 0x45:
                        result = this.ast_helper.on_Array_value(outputStack[outputStack.length - 2]);

                        break;
                    case 0x46:
                        result = this.ast_helper.on_Array_value([]);

                        break;
                    case 0x47:
                        result = outputStack[outputStack.length - 3];
                        result.push(outputStack[outputStack.length - 1]);

                        break;
                    case 0x48:
                        result = outputStack[outputStack.length - 3];
                        result.push(outputStack[outputStack.length - 1]);

                        break;
                    case 0x49:
                        result = [outputStack[outputStack.length - 1]];

                        break;
                    case 0x4a:
                        break;
                    case 0x4b:
                        break;
                }
                /** actions applying end **/
                let i = 0;
                while (i < length) {
                    stateStack.pop();
                    outputStack.pop();
                    i++;
                }
                state = stateStack[stateStack.length - 1];
                if (this.gotoTable[this.prodList[pi][0]][state] == null) {
                    throw new Error('Goto Error!' + lexer['positionInfo']);
                } else {
                    act = this.gotoTable[this.prodList[pi][0]][state];
                }
                stateStack.push((act >>> 1) - 1);
                outputStack.push(result);
            }
        }
    }
}

export default BasParser;

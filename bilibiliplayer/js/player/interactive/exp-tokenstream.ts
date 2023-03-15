enum Kind {
    kName,
    kNumber,
    kEnd,
    kEqual,
    kNotEqual,
    kGreaterEqual,
    kLessEqual,

    kPrint = 'kPrint',
    kPlus = '+',
    kMinus = '-',
    kMul = '*',
    kDiv = '/',
    kAnd = '&',
    kGreater = '>',
    kLess = '<',
    kOr = '|',
    kNot = '!',
    kLp = '(',
    kRp = ')',
    kAssign = '=',
}

const isValidChar = function (ch: string, first: boolean) {
    if (ch === '_' || ch === '$') return true;
    if (/^[A-Z]$/i.test(ch)) return true;
    if (!first && /^[0-9]$/.test(ch)) return true;
    return false;
};

const isSpace = function (aChar: string) {
    const myCharCode = aChar.charCodeAt(0);

    if ((myCharCode > 8 && myCharCode < 14) || myCharCode === 32) {
        return true;
    }

    return false;
};
interface IToken {
    kind: Kind;
    string_value?: string;
    number_value?: number;
}

class TokenStream {
    private ct!: IToken;
    private exp: string;
    private i: number;
    private ch: any;

    constructor(exp: string) {
        this.exp = exp;
        this.i = -1;
    }

    private putforward() {
        this.i++;
        this.ch = this.exp[this.i];
        return this.ch;
    }

    private putback() {
        this.i--;
        this.ch = this.exp[this.i];
        return this.ch;
    }

    GetNext(): IToken {
        let tmp;
        do {
            this.putforward();
            if (!this.ch) {
                return (this.ct = { kind: Kind.kEnd });
            }
        } while (this.ch !== '\n' && isSpace(this.ch));

        this.ch;
        switch (this.ch) {
            // case 0:
            //     return this.ct = {kind: Kind.kEnd};
            case ';':
            case '\n':
                return (this.ct = { kind: Kind.kPrint });
            case '*':
            case '/':
            case '+':
            case '-':
            case '(':
            case ')':
                return (this.ct = { kind: this.ch });
            case '>':
                this.putforward();
                if (this.ch === '=') {
                    return (this.ct = { kind: Kind.kGreaterEqual });
                }
                this.putback();
                return (this.ct = { kind: Kind.kGreater });
            case '<':
                this.putforward();
                if (this.ch === '=') {
                    return (this.ct = { kind: Kind.kLessEqual });
                }
                this.putback();
                return (this.ct = { kind: Kind.kLess });
            case '=':
                this.putforward();
                if (this.ch === '=') {
                    return (this.ct = { kind: Kind.kEqual });
                }
                this.putback();
                return (this.ct = { kind: Kind.kAssign });
            case '&':
                this.putforward();
                if (this.ch === '&') {
                    return (this.ct = { kind: Kind.kAnd });
                }
                this.putback();
                Error('bad token');
                return (this.ct = { kind: Kind.kPrint });
            case '|':
                this.putforward();
                if (this.ch === '|') {
                    return (this.ct = { kind: Kind.kOr });
                }
                this.putback();
                Error('bad token');
                return (this.ct = { kind: Kind.kPrint });
            case '!':
                this.putforward();
                if (this.ch === '=') {
                    return (this.ct = { kind: Kind.kNotEqual });
                }
                this.putback();
                return (this.ct = { kind: Kind.kNot });
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '.':
                if (!this.ct) {
                    this.ct = { kind: Kind.kNumber };
                } else {
                    this.ct.kind = Kind.kNumber;
                }
                let num = this.ch;
                while (this.putforward() && /^[0-9.]$/.test(this.ch)) {
                    num += this.ch;
                }
                this.ct.number_value = Number(num);
                this.putback();
                return this.ct;
            default:
                if (isValidChar(this.ch, true)) {
                    if (!this.ct) {
                        this.ct = { kind: Kind.kName };
                    } else {
                        this.ct.kind = Kind.kName;
                    }
                    this.ct.string_value = this.ch;
                    while (this.putforward() && isValidChar(this.ch, false)) {
                        this.ct.string_value += this.ch;
                    }
                    this.putback();
                    this.ct.kind = Kind.kName;
                    return this.ct;
                }
                Error('bad token');
                return (this.ct = { kind: Kind.kPrint });
        }
    }

    GetCurrent(): IToken {
        return this.ct;
    }
}

export { Kind, TokenStream, IToken };

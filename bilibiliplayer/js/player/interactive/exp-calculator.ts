import { TokenStream, Kind } from './exp-tokenstream';

class Calculator {
    private table: any;
    private ts!: TokenStream;
    constructor(table?: any) {
        this.table = table || {};
    }

    public Eval(exp: string) {
        this.ts = new TokenStream(exp);

        let result = 0;
        for (; ;) {
            this.ts.GetNext();
            if (this.ts.GetCurrent().kind === Kind.kEnd) {
                break;
            }
            if (this.ts.GetCurrent().kind === Kind.kPrint) {
                continue;
            }
            result = this.LogicalExpr(false);

            const k = this.ts.GetCurrent().kind;
            if (k !== Kind.kPrint && k !== Kind.kEnd) {
                return Error('unexpected char');
            }
        }
        return result;
    }

    public GetVars() {
        return this.table;
    }

    private LogicalExpr(get: boolean): number {
        let left = this.ComparisonExpr(get);
        for (; ;) {
            switch (this.ts.GetCurrent().kind) {
                case Kind.kAnd:
                    left = this.ComparisonExpr(true) !== 0 && left !== 0 ? 1 : 0;
                    break;
                case Kind.kOr:
                    left = this.ComparisonExpr(true) !== 0 || left !== 0 ? 1 : 0;
                    break;
                default:
                    return left;
            }
        }
    }

    private ComparisonExpr(get: boolean): number {
        let left = this.NumberExpr(get);
        for (; ;) {
            switch (this.ts.GetCurrent().kind) {
                case Kind.kEqual:
                    left = left === this.NumberExpr(true) ? 1 : 0;
                    break;
                case Kind.kNotEqual:
                    left = left !== this.NumberExpr(true) ? 1 : 0;
                    break;
                case Kind.kGreater:
                    left = left > this.NumberExpr(true) ? 1 : 0;
                    break;
                case Kind.kGreaterEqual:
                    left = left >= this.NumberExpr(true) ? 1 : 0;
                    break;
                case Kind.kLess:
                    left = left < this.NumberExpr(true) ? 1 : 0;
                    break;
                case Kind.kLessEqual:
                    left = left <= this.NumberExpr(true) ? 1 : 0;
                    break;
                default:
                    return left;
            }
        }
    }
    private NumberExpr(get: boolean): number {
        let left = this.Term(get);
        for (; ;) {
            switch (this.ts.GetCurrent().kind) {
                case Kind.kPlus:
                    left += this.Term(true);
                    break;
                case Kind.kMinus:
                    left -= this.Term(true);
                    break;
                default:
                    return left;
            }
        }
    }
    private Term(get: boolean): number {
        let left = this.Prim(get);
        let d;
        for (; ;) {
            switch (this.ts.GetCurrent().kind) {
                case Kind.kMul:
                    left *= this.Prim(true);
                    break;
                case Kind.kDiv:
                    if ((d = this.Prim(true))) {
                        left /= d;
                    } else {
                        console.error('divide by 0');
                        return Infinity;
                    }
                    break;
                default:
                    return left;
            }
        }
    }
    private Prim(get: boolean): number {
        if (get) {
            this.ts.GetNext();
        }

        switch (this.ts.GetCurrent().kind) {
            case Kind.kNumber: {
                let v = this.ts.GetCurrent().number_value!;
                this.ts.GetNext();
                return v;
            }
            case Kind.kName: {
                if (!this.table) {
                    this.table = {};
                }
                let v = this.ts.GetCurrent().string_value!;
                if (this.ts.GetNext().kind === Kind.kAssign) {
                    this.table[v] = this.LogicalExpr(true);
                } else if (typeof this.table[v] === 'undefined') {
                    this.table[v] = 0;
                }
                return this.table[v];
            }
            case Kind.kPlus:
                return +this.Prim(true);
            case Kind.kMinus:
                return -this.Prim(true);
            case Kind.kNot:
                return this.Prim(true) === 0 ? 1 : 0;
            // return this.Prim(true) === 0;
            case Kind.kLp: {
                let e = this.LogicalExpr(true);
                if (this.ts.GetCurrent().kind !== Kind.kRp) {
                    console.error("')' expected");
                    return Infinity;
                }
                this.ts.GetNext();
                return e;
            }
            default:
                console.error('primary expected');
                return Infinity;
        }
    }
}

export default Calculator;

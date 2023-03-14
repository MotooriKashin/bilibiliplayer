/**
 * 线性函数 
 * @param t 动点
 * @param b 起点
 * @param c 终点
 * @param d 距离
 * @return 运动率
 */
export function linear(t: number, b: number, c: number, d: number): number {
    return t * c / d + b;
}
/** 平方 */
export function quadratic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}
/** 立方 */
export function cubic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t + 2) + b;
}
/** 四次方 */
export function quartic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t * t + b;
    t -= 2;
    return -c / 2 * (t * t * t * t - 2) + b;
}
/** 五次方 */
export function quintic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t * t * t + 2) + b;
}
/** 圆形 */
export function circular(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
    t -= 2;
    return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
}
/** 正弦 */
export function sine(t: number, b: number, c: number, d: number): number {
    return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
}
/** 指数 */
export function exponential(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
    t--;
    return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
}

/**
 * 拓展对象方法
 * @param runtime 目标对象
 */
export function extendWithEasingFunctions(runtime: any) {
    /** TODO: Remove when BSE no longer requires this **/
    const load = {
        linear: linear,
        back: null,
        bounce: null,
        circular: circular,
        cubic: cubic,
        elastic: null,
        exponential: exponential,
        sine: sine,
        quintic: quintic
    };
    for (const i in load) {
        runtime[i] = load[<'cubic'>i];
    }
}

export function getEasingFuncByName(easing: string = "None") {
    easing = easing.toLowerCase();
    switch (easing) {
        case "none":
        case "linear":
        default:
            return linear;
        case "exponential":
            return exponential;
        case "circular":
            return circular;
        case "quadratic":
            return quadratic;
        case "cubic":
            return cubic;
        case "quartic":
            return quartic;
        case "quintic":
            return quintic;
        case "sine":
            return sine;
    }
}

export const TweenEasing = {
    Linear: {
        None: function (amount: number): number {
            return amount
        },
    },
    Quadratic: {
        In: function (amount: number): number {
            return amount * amount
        },
        Out: function (amount: number): number {
            return amount * (2 - amount)
        },
        InOut: function (amount: number): number {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount
            }

            return -0.5 * (--amount * (amount - 2) - 1)
        },
    },
    Cubic: {
        In: function (amount: number): number {
            return amount * amount * amount
        },
        Out: function (amount: number): number {
            return --amount * amount * amount + 1
        },
        InOut: function (amount: number): number {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount * amount
            }
            return 0.5 * ((amount -= 2) * amount * amount + 2)
        },
    },
    Quartic: {
        In: function (amount: number): number {
            return amount * amount * amount * amount
        },
        Out: function (amount: number): number {
            return 1 - --amount * amount * amount * amount
        },
        InOut: function (amount: number): number {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount * amount * amount
            }

            return -0.5 * ((amount -= 2) * amount * amount * amount - 2)
        },
    },
    Quintic: {
        In: function (amount: number): number {
            return amount * amount * amount * amount * amount
        },
        Out: function (amount: number): number {
            return --amount * amount * amount * amount * amount + 1
        },
        InOut: function (amount: number): number {
            if ((amount *= 2) < 1) {
                return 0.5 * amount * amount * amount * amount * amount
            }

            return 0.5 * ((amount -= 2) * amount * amount * amount * amount + 2)
        },
    },
    Sinusoidal: {
        In: function (amount: number): number {
            return 1 - Math.sin(((1.0 - amount) * Math.PI) / 2)
        },
        Out: function (amount: number): number {
            return Math.sin((amount * Math.PI) / 2)
        },
        InOut: function (amount: number): number {
            return 0.5 * (1 - Math.sin(Math.PI * (0.5 - amount)))
        },
    },
    Exponential: {
        In: function (amount: number): number {
            return amount === 0 ? 0 : Math.pow(1024, amount - 1)
        },
        Out: function (amount: number): number {
            return amount === 1 ? 1 : 1 - Math.pow(2, -10 * amount)
        },
        InOut: function (amount: number): number {
            if (amount === 0) {
                return 0
            }

            if (amount === 1) {
                return 1
            }

            if ((amount *= 2) < 1) {
                return 0.5 * Math.pow(1024, amount - 1)
            }

            return 0.5 * (-Math.pow(2, -10 * (amount - 1)) + 2)
        },
    },
    Circular: {
        In: function (amount: number): number {
            return 1 - Math.sqrt(1 - amount * amount)
        },
        Out: function (amount: number): number {
            return Math.sqrt(1 - --amount * amount)
        },
        InOut: function (amount: number): number {
            if ((amount *= 2) < 1) {
                return -0.5 * (Math.sqrt(1 - amount * amount) - 1)
            }
            return 0.5 * (Math.sqrt(1 - (amount -= 2) * amount) + 1)
        },
    },
    Elastic: {
        In: function (amount: number): number {
            if (amount === 0) {
                return 0
            }

            if (amount === 1) {
                return 1
            }

            return -Math.pow(2, 10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI)
        },
        Out: function (amount: number): number {
            if (amount === 0) {
                return 0
            }

            if (amount === 1) {
                return 1
            }
            return Math.pow(2, -10 * amount) * Math.sin((amount - 0.1) * 5 * Math.PI) + 1
        },
        InOut: function (amount: number): number {
            if (amount === 0) {
                return 0
            }

            if (amount === 1) {
                return 1
            }

            amount *= 2

            if (amount < 1) {
                return -0.5 * Math.pow(2, 10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI)
            }

            return 0.5 * Math.pow(2, -10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI) + 1
        },
    },
    Back: {
        In: function (amount: number): number {
            const s = 1.70158
            return amount === 1 ? 1 : amount * amount * ((s + 1) * amount - s)
        },
        Out: function (amount: number): number {
            const s = 1.70158
            return amount === 0 ? 0 : --amount * amount * ((s + 1) * amount + s) + 1
        },
        InOut: function (amount: number): number {
            const s = 1.70158 * 1.525
            if ((amount *= 2) < 1) {
                return 0.5 * (amount * amount * ((s + 1) * amount - s))
            }
            return 0.5 * ((amount -= 2) * amount * ((s + 1) * amount + s) + 2)
        },
    },
    Bounce: {
        In: function (amount: number): number {
            return 1 - TweenEasing.Bounce.Out(1 - amount)
        },
        Out: function (amount: number): number {
            if (amount < 1 / 2.75) {
                return 7.5625 * amount * amount
            } else if (amount < 2 / 2.75) {
                return 7.5625 * (amount -= 1.5 / 2.75) * amount + 0.75
            } else if (amount < 2.5 / 2.75) {
                return 7.5625 * (amount -= 2.25 / 2.75) * amount + 0.9375
            } else {
                return 7.5625 * (amount -= 2.625 / 2.75) * amount + 0.984375
            }
        },
        InOut: function (amount: number): number {
            if (amount < 0.5) {
                return TweenEasing.Bounce.In(amount * 2) * 0.5
            }
            return TweenEasing.Bounce.Out(amount * 2 - 1) * 0.5 + 0.5
        },
    },
    generatePow: function (
        power = 4,
    ): {
        In(amount: number): number
        Out(amount: number): number
        InOut(amount: number): number
    } {
        power = power < Number.EPSILON ? Number.EPSILON : power
        power = power > 10000 ? 10000 : power
        return {
            In: function (amount: number): number {
                return amount ** power
            },
            Out: function (amount: number): number {
                return 1 - (1 - amount) ** power
            },
            InOut: function (amount: number): number {
                if (amount < 0.5) {
                    return (amount * 2) ** power / 2
                }
                return (1 - (2 - amount * 2) ** power) / 2 + 0.5
            },
        }
    }
};
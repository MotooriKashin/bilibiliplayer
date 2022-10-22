const list = {
    INPUT: 1,
    TEXTAREA: 1,
};
const btn = {
    button: 1,
    reset: 1,
    submit: 1,
    hidden: 1,
    radio: 1,
    checkbox: 1,
    image: 1,
};
export function focusInput() {
    const activeElement = <any>document.activeElement;
    if (activeElement?.tagName && list[<keyof typeof list>activeElement.tagName]) {
        if (btn[<keyof typeof btn>activeElement.type]) {
            return false;
        }
        return true;
    }

    if (activeElement?.getAttribute('contenteditable') !== null) return true;

    return false;
}

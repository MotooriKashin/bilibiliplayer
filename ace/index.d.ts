/**
 * @file TODO: 完善声明
 */
interface IEditor {
    color: number;
    fontsize: number[];
    $blockScrolling: number;
    setTheme: (k: string) => void;
    setValue: (k: string) => void;
    getSession: () => { [key: string]: any };
    getValue: () => string;
    clearSelection: () => void;
    focus: () => void;
    on: (e: string, callback: (data: any) => void) => void;
    setOptions: any;
}

export const ace: {
    setOptions(options: Record<string, any>): void;
    edit: (value: string) => IEditor
}
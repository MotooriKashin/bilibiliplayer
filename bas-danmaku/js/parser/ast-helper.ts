type KeyValueList = [string, any][];
type AstValueType = 'String' | 'Num' | 'Hex' | 'Time' | 'Object' | 'Array' | 'Variable';
type AstDefType = 'text' | 'button' | 'path' | 'av' | 'seek';
export class AstHelper {
    protected variableTable: any;
    protected varibaleRegOrder: number;
    protected templateTable: any;
    protected tpl_name_id: number;
    protected obj_name_id: number;
    protected allowsVariable: boolean[];
    protected class_names = ['text', 'button', 'path'];

    constructor() {
        this.variableTable = {};
        this.varibaleRegOrder = 0;
        this.templateTable = {};
        this.tpl_name_id = 0;
        this.obj_name_id = 0;
        this.allowsVariable = [];
    }

    // basic value
    on_String_value(str_segs: any[]): AstValue {
        let ret = [];
        for (let seg of str_segs) {
            switch (seg.type) {
                case 'char':
                    {
                        let char = null;
                        switch ((seg.value as string).charAt(1)) {
                            case 'n':
                                char = '\n';
                                break;
                            case 'r':
                                char = '\r';
                                break;
                            case 't':
                                char = '\t';
                                break;
                            case '\\':
                                char = '\\';
                                break;
                            case "'":
                                char = "'";
                                break;
                            case '"':
                                char = '"';
                                break;
                            default:
                                char = seg.charAt(1);
                                break;
                        }
                        ret.push(char);
                    }
                    break;
                case 'unicode':
                    {
                        let code_str = seg.value.substr(2);
                        ret.push(String.fromCharCode(parseInt(code_str, 16)));
                    }
                    break;
                case 'ascii':
                    {
                        let code_str = seg.value.substr(2);
                        ret.push(String.fromCharCode(parseInt(code_str, 16)));
                    }
                    break;
                case 'seg':
                    {
                        ret.push(seg.value);
                    }
                    break;
            }
        }
        return new AstValue({
            type: 'String',
            value: ret.join(''),
        });
    }

    on_Num_value(num_sign: any, num_str: string, num_percent: any): AstValue {
        num_sign = num_sign === '+' ? 1 : -1;
        num_str = num_str;
        num_percent = num_percent === '%';
        return new AstValue({
            type: 'Num',
            value: {
                numType: num_percent ? 'percent' : 'number',
                value: num_sign * parseFloat(num_str),
            },
        });
    }

    on_Time_value(time_str: string): AstValue {
        let read_num = true;
        let ret = 0;
        let num = 0;
        let tmp_str = '';
        let match_arr: string[] | null = null;
        while (true) {
            if (read_num) {
                match_arr = time_str.match(/^(\d*\.?\d+(?:[eE][\+\-]?\d+)?)(.*)$/);
            } else {
                match_arr = time_str.match(/^([hms]+)(.*)$/);
            }
            if (match_arr == null) {
                break;
            }
            tmp_str = match_arr[1];
            if (read_num) {
                num = parseFloat(tmp_str);
            } else {
                switch (tmp_str) {
                    case 'h':
                        ret += num * 3600 * 1000;
                        break;
                    case 'm':
                        ret += num * 60 * 1000;
                        break;
                    case 's':
                        ret += num * 1000;
                        break;
                    case 'ms':
                        ret += num;
                        break;
                }
            }
            time_str = match_arr[2];
            read_num = !read_num;
        }
        return new AstValue({
            type: 'Time',
            value: ret,
        });
    }

    on_Hex_value(hex_str: string): AstValue {
        return new AstValue({
            type: 'Hex',
            value: parseInt(hex_str.substr(2), 16),
        });
    }

    on_Object_value(obj_name: string, kv_list: KeyValueList): AstValue {
        return new AstValue({
            type: 'Object',
            value: kv_list,
        });
    }

    on_Array_value(arr: AstValue[]): AstValue {
        return new AstValue({
            type: 'Array',
            value: arr,
        });
    }

    on_Variable_value(var_name: string): AstValue {
        return new AstValue({
            type: 'Variable',
            value: var_name,
        });
    }

    // do some validations on type, attribute name, value, and return kv list back
    on_KeyValue_list(obj_type: string, kv_list: KeyValueList, allows_variable: any = null): KeyValueList {
        if (allows_variable == null) {
            allows_variable = this.peek_allows_varable();
        }
        return kv_list;
    }

    on_let_object_binding(variable_name: string, obj: any) {
        let { obj_type, name } = obj;
        this.unregister_variable(name);
        obj.name = variable_name; // obj move to new variable
        this.register_variable(variable_name, obj);
        return obj;
    }

    on_def_object(obj_type: any, name: any, kv_list: any) {
        let ret = { type: 'Def' + this.capitalization_str(obj_type), obj_type, name, attrs: {} };
        let valid_kv_list = this.on_KeyValue_list(obj_type, kv_list, false);
        this.fill_kv_obj(ret.attrs, valid_kv_list);
        this.register_variable(name, ret);
        return ret;
    }

    on_def_template(obj_type: any, tpl_name: any, template_variable_list: any, kv_list: any) {
        let ret: any = { type: 'template', obj_type, name: tpl_name, attrs: {}, tpl_list: [] };
        let valid_kv_list = this.on_KeyValue_list(obj_type, kv_list, true);
        this.check_variables_on_template_body(template_variable_list, valid_kv_list);
        this.fill_kv_obj(ret.attrs, kv_list);
        ret.tpl_list = template_variable_list;
        this.register_template(tpl_name, ret);
        return ret;
    }

    on_object_modification(variable_name: any, kv_list: any) {
        if (!this.has_variable_obj(variable_name)) {
            if (this.class_names.indexOf(variable_name) !== -1) {
                let name = this.new_variable_name_of_template_application(variable_name);
                return this.on_def_object(variable_name, name, kv_list);
            } else {
                return null;
            }
        }
        let origin_obj = this.get_variable_obj(variable_name);
        let { obj_type } = origin_obj;
        let name = this.new_variable_name_of_variable_modification(variable_name);
        let ret = { type: 'Def' + this.capitalization_str(obj_type), obj_type, name, attrs: {} };
        let valid_kv_list = this.on_KeyValue_list(obj_type, kv_list, false);
        let new_kv_list = this.merge_list(origin_obj.attrs, valid_kv_list);
        this.fill_kv_obj(ret.attrs, new_kv_list);
        this.register_variable(name, ret);
        return ret;
    }

    on_tmp_object_modification(tmp_obj: any, kv_list: any) {
        let { name } = tmp_obj;
        let obj = this.on_object_modification(name, kv_list);
        this.unregister_variable(name);
        return obj;
    }

    on_template_application(template_name: any, argument_list: any) {
        let tpl_obj = this.get_template_obj(template_name);
        if (tpl_obj == null) {
            return null;
        }
        let { obj_type } = tpl_obj;
        let name = this.new_variable_name_of_template_application(template_name);
        let ret = { type: 'Def' + this.capitalization_str(obj_type), obj_type, name, attrs: {} };
        let new_kv_list = this.evaluation_template(tpl_obj.attrs, tpl_obj.tpl_list, argument_list);
        this.fill_kv_obj(ret.attrs, new_kv_list);
        this.register_variable(name, ret);
        return ret;
    }

    on_ArgList(params: any) {
        let naked_params = [];
        let named_params = [];
        for (let [name, val] of params) {
            if (name == null) {
                naked_params.push(val);
            } else {
                named_params.push([name, val]);
            }
        }
        return { naked_params, named_params };
    }

    on_unit_set_expr(variable_name: any, kv_list: any, set_expr_params: any) {
        let [duration, easing_type] = set_expr_params;
        let ret = {
            type: 'Unit',
            duration,
            default_easing: easing_type,
            target_name: variable_name,
            attrs: {},
        };
        let obj_type = this.get_variable_type(variable_name);
        let valid_kv_list = this.on_KeyValue_list(obj_type, kv_list, false);
        this.fill_kv_obj(ret.attrs, valid_kv_list);
        return ret;
    }

    on_temporary_target_set_expr(target_obj: any, kv_list: any, set_expr_params: any) {
        let { obj_type, name } = target_obj;
        let [duration, easing_type] = set_expr_params;
        let ret = {
            type: 'Unit',
            duration,
            default_easing: easing_type,
            target_name: name,
            attrs: {},
        };
        let valid_kv_list = this.on_KeyValue_list(obj_type, kv_list, false);
        this.fill_kv_obj(ret.attrs, valid_kv_list);
        return ret;
    }

    //Serial
    on_then_set_expr(left: any, right: any) {
        if (left.type === 'Serial') {
            left.items.push(right);
            return left;
        } else {
            return {
                type: 'Serial',
                items: [left, right],
            };
        }
    }

    //Parallel
    on_group_set_expr(exprs: any) {
        return {
            type: 'Parallel',
            items: exprs,
        };
    }

    has_variable_obj(variable_name: string): boolean {
        return this.variableTable.hasOwnProperty(variable_name);
    }

    get_variable_obj(variable_name: string) {
        if (this.variableTable.hasOwnProperty(variable_name)) {
            return this.variableTable[variable_name];
        } else {
            console.error(`var ${variable_name} is not defined.`);
            return null;
        }
    }

    get_template_obj(tpl_name: string): any {
        if (this.templateTable.hasOwnProperty(tpl_name)) {
            return this.templateTable[tpl_name];
        } else {
            console.error(`tpl ${tpl_name} is not defined.`);
            return null;
        }
    }

    get_variable_type(variable_name: string): string {
        return this.get_variable_obj(variable_name).obj_type;
    }

    get_template_type(tpl_name: string): string {
        return this.get_template_obj(tpl_name).obj_type;
    }

    fill_kv_obj(obj: any, kv_list: KeyValueList) {
        for (let [k, v] of kv_list) {
            obj[k] = v;
        }
    }

    merge_list(attrs: any, kv_list: KeyValueList): KeyValueList {
        let new_attrs: any = {};
        this.fill_kv_obj(new_attrs, kv_list);
        let ret: any = [];
        for (let key in attrs) {
            if (new_attrs.hasOwnProperty(key)) {
                ret.push([key, new_attrs[key]]);
            } else {
                ret.push([key, attrs[key]]);
            }
        }
        for (let [key, val] of kv_list) {
            if (!attrs.hasOwnProperty(key)) {
                ret.push([key, val]);
            }
        }
        return ret;
    }

    evaluation_template(tpl_attrs: any, tpl_list: KeyValueList, { naked_params, named_params }: any): KeyValueList {
        // create template arguments scope
        let index_map: any = {};
        let matched_argument_list = tpl_list.map(([key, _], index) => {
            index_map[key] = index;
            return { key, matched: false };
        });
        let scope: any = {};
        // match named params
        for (let [key, value] of named_params) {
            scope[key] = value;
            if (!index_map.hasOwnProperty(key)) {
                console.error('看看命名参数是不是没有在定义参数里面..');
            } else {
                matched_argument_list[index_map[key]].matched = true;
            }
        }
        // match naked params
        let unmatched_list = matched_argument_list.filter(({ matched }) => !matched);
        if (unmatched_list.length < naked_params.length) {
            // something wrong, naked params is more than remain params
            console.error('参数太多了..');
        }
        for (let i = 0; i < naked_params.length && i < unmatched_list.length; i++) {
            let { key } = unmatched_list[i];
            scope[key] = naked_params[i];
        }
        // eval template arguments
        let eval_attrs: any = {};
        for (let [key, value] of tpl_list) {
            if (scope.hasOwnProperty(key)) {
                eval_attrs[key] = scope[key];
            } else {
                eval_attrs[key] = value;
            }
        }
        // eval template body
        let ret: any = [];
        for (let key in tpl_attrs) {
            let obj = tpl_attrs[key];
            if (obj.type === 'Variable') {
                let name = obj.value;
                if (eval_attrs.hasOwnProperty(name)) {
                    ret.push([key, eval_attrs[name]]);
                } else {
                    console.error('eval template err: no variable named ' + name + ' is provided.');
                }
            } else {
                ret.push([key, obj]);
            }
        }
        return ret;
    }

    capitalization_str(word: string): string {
        return word.substr(0, 1).toUpperCase() + word.substr(1);
    }

    new_variable_name_of_template_application(tpl_name: string): string {
        let name = `tpl_${tpl_name}_${this.tpl_name_id}`;
        this.tpl_name_id += 1;
        return name;
    }

    new_variable_name_of_variable_modification(variable_name: string): string {
        let name = `obj_${variable_name}_${this.obj_name_id}`;
        this.obj_name_id += 1;
        return name;
    }

    register_variable(variable_name: any, obj: any) {
        if (this.variableTable.hasOwnProperty(variable_name)) {
            console.log(`var ${variable_name} is already exists, and will be shadowed.`);
        }
        obj._reg_order = this.varibaleRegOrder; // for sort variables
        this.variableTable[variable_name] = obj;
        this.varibaleRegOrder += 1;
    }

    unregister_variable(variable_name: any) {
        delete this.variableTable[variable_name];
    }

    register_template(tpl_name: any, tpl: any) {
        if (this.templateTable.hasOwnProperty(tpl_name)) {
            console.log(`tpl ${tpl_name} is already exists, and will be shadowed.`);
        }
        this.templateTable[tpl_name] = tpl;
    }

    on_enter_scope() {}

    on_leave_scope() {}

    on_enter_tpl() {
        this.allowsVariable.push(true);
    }

    on_leave_tpl() {
        this.allowsVariable.pop();
    }

    peek_allows_varable(): boolean {
        if (this.allowsVariable.length > 0) {
            return this.allowsVariable[this.allowsVariable.length - 1];
        } else {
            return false;
        }
    }

    // make sure all variables in body is present at arg_list
    check_variables_on_template_body(tpl_list: KeyValueList, kv_list: KeyValueList) {
        let args = {};
        this.fill_kv_obj(args, kv_list);
        for (let [key, obj] of tpl_list) {
            if (obj.type === 'Variable') {
                let name = obj.value;
                if (!args.hasOwnProperty(name)) {
                    console.error(`varibale ${name} in template's body is not present at arguments.`);
                }
            }
        }
    }

    on_Result(g_exprs: any) {
        let defs = [];
        for (let name in this.variableTable) {
            defs.push(this.variableTable[name]);
        }
        defs.sort((a, b) => {
            return a.obj_name_id - b.obj_name_id;
        });
        let sets = g_exprs.filter((expr: any) => expr.type === 'SetExpr').map((expr: any) => expr.params);
        return { sets, defs };
    }
}

export class AstValue {
    public type: AstValueType;
    public value: any;

    constructor(obj: any) {
        this.type = obj.type;
        this.value = obj.value;
    }

    as_string(): string | void {
        if (this.type === 'String') {
            return this.value;
        }
    }

    as_integer(): number | void {
        if (this.type === 'Hex') {
            return this.value;
        } else if (this.type === 'Num') {
            return Math.floor(this.value.value);
        }
    }

    as_number(): number | void {
        if (this.type === 'Num') {
            return this.value;
        }
    }

    as_time(): number | void {
        if (this.type === 'Time') {
            return this.value;
        }
    }

    as_object(): any {
        if (this.type === 'Object') {
            return this.value;
        }
    }
}

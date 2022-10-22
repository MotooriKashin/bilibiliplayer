import Calculator from './exp-calculator';

const evalString = function (table: any, exp: string) {
    let calc = new Calculator(table);
    let oss = '';
    let expr_oss = '';

    let in_expr = false;
    let ch = exp[0];
    let i = 0;
    while (ch) {
        if (in_expr) {
            if (ch === '`') {
                in_expr = false;
                oss += calc.Eval(expr_oss);
            } else {
                expr_oss += ch;
            }
        } else {
            if (ch === '`') {
                in_expr = true;
                expr_oss = '';
            } else if (ch === '\\') {
                i++;
                ch = exp[i];
                oss += ch;
            } else {
                oss += ch;
            }
        }
        i++;
        ch = exp[i];
    }
    return oss;
};

export default evalString;

// // example 1, 直接使用
// console.log(evalString({$score: 1}, "`$score = $score + (3 * 2) / 2 + 1`"));

// // example 2 新接口数据的使用和判断
// const hidden_vars = [
//     {
//         "name":"得分",
//         "id":"score",
//         "id_v2":"$score",
//         "value":123.3333,
//         "is_show":1
//     },
//     {
//         "name":"得分2",
//         "id":"score2",
//         "id_v2":"$score2",
//         "value":123.3333,
//     }
// ];
// const choices = [
//     {
//         "id":1,
//         "condition":"$score>=6", // 这个选项的出现条件
//         "native_action":"$score=$score+1", // 选择后的隐藏数值的影响
//         "option":"提交答卷"
//     },
//     {
//         "id":5,
//         "condition":"$score<6",
//         "native_action":"$score=$score-1",
//         "option":"提交答卷"
//     }
// ]

// // ① 构造当前变量 table，如果采用全本地判断逻辑，那 table 仅在第一次选择时构造，后续每个节点记录对应的不同 table
// let table = {}; // 当前值
// for (let i = 0; i < hidden_vars.length; i++) {
//     table[hidden_vars[i]['id_v2']] = hidden_vars[i]['value'];
// }
// console.log(table);

// // ② 判断选项是否出现
// for (let i = 0; i < choices.length; i++) {
//     if (Boolean(Number(evalString(table, `\`${choices[i].condition}\``)))) {
//         choices[i]['show'] = true;
//     } else {
//         choices[i]['show'] = false;
//     }
// }
// console.log(choices);

// // ③ 选择选项后，变化隐藏数值的影响，更新播放器 table
// // if choose id:1
// const choose = choices[0];
// console.log(table['$score']);
// evalString(table, `\`${choose.native_action}\``);
// console.log(table['$score']);

ace.define("ace/mode/bas_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/doc_comment_highlight_rules","ace/mode/text_highlight_rules"], function(acequire, exports, module) {
"use strict";

var oop = acequire("../lib/oop");
var TextHighlightRules = acequire("./text_highlight_rules").TextHighlightRules;
var identifierRe = "[a-zA-Z\\$_\u00a1-\uffff][a-zA-Z\\d\\$_\u00a1-\uffff]*";

var BasHighlightRules = function () {

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used
    this.$rules = {
        "start": [
            {
                token: "constant.numeric.hex",
                regex: /0[xX][\da-fA-F]+/
            },
            {
                token: "constant.numeric.time",
                regex: /(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)ms|(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)s(?:(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)ms)?|(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)m(?:(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)s)?(?:(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)ms)?|(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)h(?:(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)m)?(?:(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)s)?(?:(?:\d*\.?\d+(?:[eE][\+\-]?\d+)?)ms)?/
            },
            {
                token: "constant.numeric.percent_number",
                regex: /(?:\+|\-)?\d*\.?\d+(?:[eE][\-]?\d+)?%/
            },
            {
                token: "constant.numeric.number",
                regex: /(?:\+|\-)?\d*\.?\d+(?:[eE][\-]?\d+)?/
            },
            {
                token: "keyword.operator",
                regex: /=|\.|,/
            },
            {
                token: "keyword",
                regex: /def/,
                next: "keyword.class"
            },
            {
                token: "keyword",
                regex: /set/,
                next: "variable.id.name"
            },
            {
                token: "keyword",
                regex: /then/
            },
            {
                token: "variable.id",
                regex: /[a-zA-Z_$@]+[a-zA-Z_$@\d]*/
            },
            {
                token: "variable", // single line
                regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]\\s*(?=:)'
            }, {
                token: "string", // single line
                regex: '"',
                next: "string"
            }, {
                token: "constant.language.boolean",
                regex: "(?:true|false)\\b"
            }, {
                token: "text", // single quoted strings are not allowed
                regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"
            }, {
                token: "comment", // comments are not allowed, but who cares?
                regex: "\\/\\/.*$"
            }, {
                token: "comment.start", // comments are not allowed, but who cares?
                regex: "\\/\\*",
                next: "comment"
            }, {
                token: "paren.lparen",
                regex: "[[({]"
            }, {
                token: "paren.rparen",
                regex: "[\\])}]"
            }, {
                token: "text",
                regex: "\\s+"
            }
        ],
        "string": [
            {
                token: "constant.language.escape",
                regex: /\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|["\\\/bfnrt])/
            }, {
                token: "string",
                regex: '"|$',
                next: "start"
            }, {
                defaultToken: "string"
            }
        ],
        "comment": [
            {
                token: "comment.end", // comments are not allowed, but who cares?
                regex: "\\*\\/",
                next: "start"
            }, {
                defaultToken: "comment"
            }
        ],
        "keyword.class": [
            {
                token: "constant.language.class",
                regex: /text|button|tween/,
                next: "variable.id.name"
            },
            {
                token: "text.class", // 不支持的类
                regex: /[a-zA-Z_$@]+[a-zA-Z_$@\d]*/,
                next: "variable.id.name"
            }
        ],
        "variable.id.name": [ // 变量
            {
                token: "variable.id.name",
                regex: /[a-zA-Z_$@]+[a-zA-Z_$@\d]*/,
                next: "start"
            }
        ]
    };

};

oop.inherits(BasHighlightRules, TextHighlightRules);

exports.BasHighlightRules = BasHighlightRules;
});

ace.define("ace/mode/matching_brace_outdent",["require","exports","module","ace/range"], function(acequire, exports, module) {
"use strict";

var Range = acequire("../range").Range;

var MatchingBraceOutdent = function() {};

(function() {

    this.checkOutdent = function(line, input) {
        if (! /^\s+$/.test(line))
            return false;

        return /^\s*\}/.test(input);
    };

    this.autoOutdent = function(doc, row) {
        var line = doc.getLine(row);
        var match = line.match(/^(\s*\})/);

        if (!match) return 0;

        var column = match[1].length;
        var openBracePos = doc.findMatchingBracket({row: row, column: column});

        if (!openBracePos || openBracePos.row == row) return 0;

        var indent = this.$getIndent(doc.getLine(openBracePos.row));
        doc.replace(new Range(row, 0, row, column-1), indent);
    };

    this.$getIndent = function(line) {
        return line.match(/^\s*/)[0];
    };

}).call(MatchingBraceOutdent.prototype);

exports.MatchingBraceOutdent = MatchingBraceOutdent;
});

ace.define("ace/mode/folding/cstyle",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"], function(acequire, exports, module) {
"use strict";

var oop = acequire("../../lib/oop");
var Range = acequire("../../range").Range;
var BaseFoldMode = acequire("./fold_mode").FoldMode;

var FoldMode = exports.FoldMode = function(commentRegex) {
    if (commentRegex) {
        this.foldingStartMarker = new RegExp(
            this.foldingStartMarker.source.replace(/\|[^|]*?$/, "|" + commentRegex.start)
        );
        this.foldingStopMarker = new RegExp(
            this.foldingStopMarker.source.replace(/\|[^|]*?$/, "|" + commentRegex.end)
        );
    }
};
oop.inherits(FoldMode, BaseFoldMode);

(function() {
    
    this.foldingStartMarker = /(\{|\[)[^\}\]]*$|^\s*(\/\*)/;
    this.foldingStopMarker = /^[^\[\{]*(\}|\])|^[\s\*]*(\*\/)/;
    this.singleLineBlockCommentRe= /^\s*(\/\*).*\*\/\s*$/;
    this.tripleStarBlockCommentRe = /^\s*(\/\*\*\*).*\*\/\s*$/;
    this.startRegionRe = /^\s*(\/\*|\/\/)#?region\b/;
    this._getFoldWidgetBase = this.getFoldWidget;
    this.getFoldWidget = function(session, foldStyle, row) {
        var line = session.getLine(row);
    
        if (this.singleLineBlockCommentRe.test(line)) {
            if (!this.startRegionRe.test(line) && !this.tripleStarBlockCommentRe.test(line))
                return "";
        }
    
        var fw = this._getFoldWidgetBase(session, foldStyle, row);
    
        if (!fw && this.startRegionRe.test(line))
            return "start"; // lineCommentRegionStart
    
        return fw;
    };

    this.getFoldWidgetRange = function(session, foldStyle, row, forceMultiline) {
        var line = session.getLine(row);
        
        if (this.startRegionRe.test(line))
            return this.getCommentRegionBlock(session, line, row);
        
        var match = line.match(this.foldingStartMarker);
        if (match) {
            var i = match.index;

            if (match[1])
                return this.openingBracketBlock(session, match[1], row, i);
                
            var range = session.getCommentFoldRange(row, i + match[0].length, 1);
            
            if (range && !range.isMultiLine()) {
                if (forceMultiline) {
                    range = this.getSectionRange(session, row);
                } else if (foldStyle != "all")
                    range = null;
            }
            
            return range;
        }

        if (foldStyle === "markbegin")
            return;

        var match = line.match(this.foldingStopMarker);
        if (match) {
            var i = match.index + match[0].length;

            if (match[1])
                return this.closingBracketBlock(session, match[1], row, i);

            return session.getCommentFoldRange(row, i, -1);
        }
    };
    
    this.getSectionRange = function(session, row) {
        var line = session.getLine(row);
        var startIndent = line.search(/\S/);
        var startRow = row;
        var startColumn = line.length;
        row = row + 1;
        var endRow = row;
        var maxRow = session.getLength();
        while (++row < maxRow) {
            line = session.getLine(row);
            var indent = line.search(/\S/);
            if (indent === -1)
                continue;
            if  (startIndent > indent)
                break;
            var subRange = this.getFoldWidgetRange(session, "all", row);
            
            if (subRange) {
                if (subRange.start.row <= startRow) {
                    break;
                } else if (subRange.isMultiLine()) {
                    row = subRange.end.row;
                } else if (startIndent == indent) {
                    break;
                }
            }
            endRow = row;
        }
        
        return new Range(startRow, startColumn, endRow, session.getLine(endRow).length);
    };
    this.getCommentRegionBlock = function(session, line, row) {
        var startColumn = line.search(/\s*$/);
        var maxRow = session.getLength();
        var startRow = row;
        
        var re = /^\s*(?:\/\*|\/\/|--)#?(end)?region\b/;
        var depth = 1;
        while (++row < maxRow) {
            line = session.getLine(row);
            var m = re.exec(line);
            if (!m) continue;
            if (m[1]) depth--;
            else depth++;

            if (!depth) break;
        }

        var endRow = row;
        if (endRow > startRow) {
            return new Range(startRow, startColumn, endRow, line.length);
        }
    };

}).call(FoldMode.prototype);

});

ace.define("ace/mode/bas_completions", ["require", "exports", "module"], function (require, exports, module) {
    "use strict";

    var keyword = ['def', 'text', 'set', 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'then', 'button', 'path'];
    var property = ['content', 'x', 'y', 'alpha', 'color', 'bold', 'textShadow', 'strokeWidth', 'strokeColor', 'anchorX', 'anchorY', 'zIndex', 'rotateX', 'rotateY', 'rotateZ', 'parent', 'fontSize', 'fontFamily',
        'text', 'textColor', 'textAlpha', 'fillColor', 'fillAlpha', 'duration', 'target', 'av', 'bangumi', 'seek', 'page', 'time', 'seasonId', 'episodeId',
        'd', 'scale', 'borderWidth', 'borderColor', 'borderAlpha', 'viewBox', 'width', 'height'];
    var propertyValue = ['0x000000', '0xffffff', 'av', 'bangumi', 'seek'];

    var BasCompletions = function () {

    };

    (function () {
        this.getCompletions = function (state, session, pos, prefix) {
            var token = session.getTokenAt(pos.row, pos.column);

            if (!token)
                return [];
            var line = session.getLine(pos.row).substr(0, pos.column);
            var lines = session.getLines(0, pos.row - 1).join('') + line;
            if (/=(.*)*$/.test(line)) {
                return this.getPropertyValueCompletions(state, session, pos, prefix);
            } else if (/{[^}]*$/.test(lines)) {
                return this.getPropertyCompletions(state, session, pos, prefix);
            } else {
                return this.getKeyWordCompletions(state, session, pos, prefix);
            }

            return [];
        };

        this.getPropertyValueCompletions = function (state, session, pos, prefix) {
            return propertyValue.map(function (property) {
                return {
                    caption: property,
                    snippet: property,
                    meta: "property value",
                    score: Number.MAX_VALUE
                };
            });
        };

        this.getPropertyCompletions = function (state, session, pos, prefix) {
            return property.map(function (property) {
                return {
                    caption: property,
                    snippet: property + ' = ',
                    meta: "property",
                    score: Number.MAX_VALUE
                };
            });
        };

        this.getKeyWordCompletions = function (state, session, pos, prefix) {
            return keyword.map(function (value) {
                return {
                    caption: value,
                    snippet: value + ' ',
                    meta: "keyword",
                    score: Number.MAX_VALUE
                };
            });
        };

    }).call(BasCompletions.prototype);

    exports.BasCompletions = BasCompletions;
});

ace.define("ace/mode/bas",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/bas_highlight_rules","ace/mode/matching_brace_outdent","ace/worker/worker_client","ace/mode/bas_completions","ace/mode/behaviour/cstyle","ace/mode/folding/cstyle"], function(acequire, exports, module) {
"use strict";

var oop = acequire("../lib/oop");
var TextMode = acequire("./text").Mode;
var BasHighlightRules = acequire("./bas_highlight_rules").BasHighlightRules;
var MatchingBraceOutdent = acequire("./matching_brace_outdent").MatchingBraceOutdent;
var WorkerClient = acequire("../worker/worker_client").WorkerClient;
var BasCompletions = acequire("./bas_completions").BasCompletions;    
var CstyleBehaviour = acequire("./behaviour/cstyle").CstyleBehaviour;
var CStyleFoldMode = acequire("./folding/cstyle").FoldMode;

var Mode = function() {
    this.HighlightRules = BasHighlightRules;
    
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CstyleBehaviour();
    this.$completer = new BasCompletions();
    this.foldingRules = new CStyleFoldMode();
};
oop.inherits(Mode, TextMode);

(function() {

    this.lineCommentStart = "//";
    this.blockComment = {start: "/*", end: "*/"};

    this.getNextLineIndent = function(state, line, tab) {
        var indent = this.$getIndent(line);

        if (state == "start") {
            var match = line.match(/^.*[\{\(\[]\s*$/);
            if (match) {
                indent += tab;
            }
        }

        return indent;
    };

    this.checkOutdent = function(state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function(state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };

    this.getCompletions = function (state, session, pos, prefix) {
        return this.$completer.getCompletions(state, session, pos, prefix);
    };

    this.createWorker = function () { };

    this.$id = "ace/mode/bas";
}).call(Mode.prototype);

exports.Mode = Mode;
});

/** kate-script
 * name: Nimrod
 * license: LGPL
 * author: Paul Giannaros <paul@giannaros.org>, Gerald Senarclens de Grancy <oss@senarclens.eu>, Flaviu Tamas <tamas.flaviu@gmail.com>
 * revision: 3
 * kate-version: 3.13
 */


// required katepart js libraries
require ("range.js");
require ("string.js");

openings = ['(', '[', '{'];
closings = [')', ']', '}'];  // requires same order as in openings
indenters = [/:$/,
             /=\s*(object|enum|generic.*)?$/,
             /(type|var|let|const)$/i]
unindenters = [/continue/i,
               /raise/i,
               /return/i,
               /break/i];


// Return the given line without comments and leading or trailing whitespace.
// Eg.
// getCode(x) -> "for i in range(3):"
//     if document.line(x) == "  for i in range(3):"
// getCode(x) -> "for i in range(3):"
//     if document.line(x) == "for i in range(3):  "
// getCode(x) -> "for i in range(3):"
//     if document.line(x) == "for i in range(3):  # grand"
function getCode(lineNr) {
    var line = document.line(lineNr);
    var code = '';
    for (var position = 0; position < line.length; position++)
        if (document.isCode(lineNr, position) || line[position] == '=')
            code += line[position];

    return code.trim();
}


// Return the indent if a opening bracket is not closed (incomplete sequence).
// The calculated intent is the innermost opening bracket's position plus 1.
// `lineNr`: the number of the line on which the brackets should be counted
function _calcOpeningIndent(lineNr) {
    var line = document.line(lineNr);
    var countClosing = new Array();
    closings.forEach(function(elem) {
        countClosing[elem] = 0;
    });
    for (i = line.length - 1; i >= 0; --i) {
        if (document.isComment(lineNr, i) || document.isString(lineNr, i))
            continue;
        if (closings.indexOf(line[i]) > -1)
            countClosing[line[i]]++;
        var index = openings.indexOf(line[i]);
        if (index > -1) {
            if (countClosing[closings[index]] == 0) {
                return i + 1;
            }
            countClosing[closings[index]]--;
        }
    }
    return -1;
}


// Return the indent if a closing bracket not opened (incomplete sequence).
// The intent is the same as on the line with the unmatched opening bracket.
// `lineNr`: the number of the line on which the brackets should be counted
function _calcClosingIndent(lineNr, indentWidth) {
    var line = document.line(lineNr);
    var countClosing = new Array();
    closings.forEach(function(elem) {
        countClosing[elem] = 0;
    });
    for (i = line.length - 1; i >= 0; --i) {
        if (document.isComment(lineNr, i) || document.isString(lineNr, i))
            continue;
        if (closings.indexOf(line[i]) > -1)
            countClosing[line[i]]++;
        var index = openings.indexOf(line[i]);
        if (index > -1)
            countClosing[closings[index]]--;
    }
    for (var key in countClosing) {
        if (countClosing[key] > 0) {  // unmatched closing bracket
            for (--lineNr; lineNr >= 0; --lineNr) {
                if (_calcOpeningIndent(lineNr) > -1) {
                    var indent = document.firstVirtualColumn(lineNr);
                    if (shouldUnindent(lineNr + 1))
                        return Math.max(0, indent - indentWidth);
                    return indent;
                }
            }
        }
    }
    return -1;
}


// Returns the indent for mismatched (opening or closing) brackets.
// If there are no mismatched brackets, -1 is returned.
// `lineNr`: number of the line for which the indent is calculated
function calcBracketIndent(lineNr, indentWidth) {
    var indent = _calcOpeningIndent(lineNr - 1);
    if (indent > -1)
        return indent
    indent = _calcClosingIndent(lineNr - 1, indentWidth);
    if (indent > -1)
        return indent
    return -1;
}


// Return true if a single unindent should occur.
function shouldUnindent(LineNr) {
    lastLine = getCode(LineNr - 1);
    for (var i = 0; i < unindenters.length; i++)
        if (lastLine.search(unindenters[i]) >= 0)
            return true;
    return false;
}

function shouldIndent(LineNr) {
    lastLine = getCode(LineNr - 1);
    for (var i = 0; i < indenters.length; i++)
        if (lastLine.search(indenters[i]) >= 0)
            return true;
    return false;
}


// Return the amount of characters (in spaces) to be indented.
// Special indent() return values:
//   -2 = no indent
//   -1 = keep last indent
// Follow PEP8 for unfinished sequences and argument lists.
// Nested sequences are not implemented. (neither by Emacs' python-mode)
function indent(line, indentWidth, character) {
    if (line == 0)  // don't ever act on document's first line
        return -2;
    if (!document.line(line - 1).length)  // empty line
        return -2;
    var lastLine = getCode(line - 1);
    var lastChar = lastLine.substr(-1);

    // indent when opening bracket
    if (openings.indexOf(lastChar) >= 0) {
        return document.firstVirtualColumn(line - 1) + indentWidth;
    }
    var indent = calcBracketIndent(line, indentWidth);
    if (shouldIndent(line)) {
        if (indent > -1)
            indent += indentWidth;
        else
            indent = document.firstVirtualColumn(line - 1) + indentWidth;
    }
    // continue, pass, raise, return etc. should unindent
    if (shouldUnindent(line) && (indent == -1))
        indent = Math.max(0, document.firstVirtualColumn(line - 1) - indentWidth);

    return indent;
}

// kate: space-indent on; indent-width 4; replace-tabs on;

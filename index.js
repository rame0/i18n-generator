/*
 * i18n-generator
 * https://github.com/hueitan/i18n-generator
 *
 * Copyright (c) 2014-Present Huei Tan
 * Licensed under the MIT license.
 */

'use strict';

/**
 * Following the 'Node.js require(s) best practices' by
 * https://github.com/zeMirco/node-require-s--best-practices
 *
 * // Nodejs libs
 * const fs = require('fs'),
 *
 * // External libs
 * debug = require('debug'),
 *
 * // Internal libs
 * data = require('./data.js');
 */

const fs = require('fs');

const constiableName = {
    i18nGo: 'i18n=>',
    nestStart: '=>',
    nestEnd: '<='
};

let constiable = {
    split: '|',
    language: [],
    nestObject: [],
    i18n: {}
};

function resetconstiable() {
    constiable = {
        split: '|',
        language: [],
        nestObject: [],
        i18n: {}
    };
}

// 這個太神啦！ http://stackoverflow.com/questions/5484673/javascript-how-to-dynamically-create-nested-objects-using-object-names-given-by
function assign(obj, keyPath, value) {
    const lastKeyIndex = keyPath.length - 1;
    for (let i = 0; i < lastKeyIndex; ++i) {
        const key = keyPath[i];
        if (!(key in obj)) {
            obj[key] = {};
        }
        obj = obj[key];
    }
    obj[keyPath[lastKeyIndex]] = value;
}

function magicSplit(data) {
    let output = [],
        index = 0,
        tempString = '',
        isInside = false;

    while (data.length) {
        if (data[0] === '"') {
            isInside = !isInside;
            data = data.slice(1, data.length);
            continue;
        } else if (data[0] === '\\' && isInside) {
            tempString += data[1];
            data = data.slice(2, data.length);
            continue;
        } else if (data[0] === constiable.split && !isInside) {
            output[index] = tempString;
            tempString = '';
            index++;
            data = data.slice(1, data.length);
            continue;
        }

        tempString += data[0];
        data = data.slice(1, data.length);
    }

    output[index] = tempString;
    // console.log(output)
    return output;
}

function i18nGenerating(data) {

    let output = magicSplit(data);

    // i18n=> (i18nGo)
    if (output[0].indexOf(constiableName.i18nGo) !== -1) {
        for (let i = 1; i < output.length; i++) {
            const lang = output[i].trim();
            constiable.language.push(lang);
            constiable.i18n[lang] = {};
        }

        return;
    }

    // => (nestStart)
    if (output[0].indexOf(constiableName.nestStart) !== -1) {
        constiable.nestObject.push(output[0].trim().replace(constiableName.nestStart, '').trim());
        return;
    }

    // <= (nestEnd)
    if (output[0].indexOf(constiableName.nestEnd) !== -1) {
        constiable.nestObject.pop();
        return;
    }

    // generating json object
    for (let j = 1; j < output.length; j++) {
        if (constiable.nestObject.length) {
            constiable.nestObject.push(output[0].trim());
            if (output[j].trim()) {
                assign(constiable.i18n[constiable.language[j - 1]], constiable.nestObject, output[j].trim());
            }
            constiable.nestObject.pop();
        } else if (constiable.nestObject.length === 0 && output[j].trim()) {
            constiable.i18n[constiable.language[j - 1]][output[0].trim()] = output[j].trim();
        }
    }

}

function i18nFileGenerate(output) {

    for (const lang in constiable.i18n) {
        let writeText = JSON.stringify(constiable.i18n[lang]);

        fs.writeFileSync(output + '/' + lang + '.json', writeText, {flag: 'w'});

    }

}

function readFileAndGenerating(input, split) {
    let data;

    try {
        data = fs.readFileSync(input);
    } catch (e) {
        data = input;
    }

    // reset constiable
    resetconstiable();

    let remaining = '';

    // setting up the splitter
    // default is pipe |
    if (!split) {
        split = 'pipe';
    }

    switch (split) {
        case 'csv':
            constiable.split = ',';
            break;
        case 'tsv':
            constiable.split = '\t';
            break;
        case 'pipe':
            constiable.split = '|';
            break;
        default:
            constiable.split = split;
    }

    remaining += data;
    let index = remaining.indexOf('\n');
    let last = 0;
    while (index > -1) {
        const line = remaining.substring(last, index);
        last = index + 1;
        i18nGenerating(line);
        index = remaining.indexOf('\n', last);
    }

    remaining = remaining.substring(last);

    if (remaining.length > 0) {
        i18nGenerating(remaining);
    }
}

module.exports = function (input, output, split) {


    const isExist = fs.existsSync(output);

    if (!isExist) {
        fs.mkdirSync(output);
    }

    readFileAndGenerating(input, split);

    i18nFileGenerate(output);

};

module.exports.get = function (input, split, cb) {

    if (typeof split === 'function') {
        cb = split;
        split = 'pipe';
    }
    readFileAndGenerating(input, split);

    cb(null, constiable.i18n);
};

/* browser window */
if (typeof window !== 'undefined') {
    // If we're running a web page
    window.i18n = module.exports.get;
}

// basic
// module.exports('test/input.txt', 'test/temp');

// options splitter
// module.exports('test/inputComma.csv', 'test/temp', null, 'csv');

// options splitter tab (\t)
// module.exports('test/inputTab.tsv', 'test/temp', null, 'tab');

// using callback
// module.exports.get('test/input.txt', 'pipe', function (err, data) {console.log(data);});

// using input string data
// module.exports.get('i18n=> | en | zh_TW | de | my\nyou | you | 你 | Du | kamu\nI | I | 我 | ich | Saya\nlove | love | 喜歡 | liebe | cinta\neat | eat | 吃 | essen | makan\nilovegithub | i love github | 我愛 Github | ich liebe Github | Saya cinta pada Github', function (err, data) {console.log(data);});

// (advanced) ignore splitter if " occur
// module.exports('test/inputCommaAdvance.csv', 'test/temp', null, 'csv');
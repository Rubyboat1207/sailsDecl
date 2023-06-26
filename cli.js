#!/usr/bin/env node

const utils = require('./index');
const fs = require('fs');

const typingsDir = process.argv[2] || '';

if (!utils.isASailsProject()) {
    console.log("This is not a sails.js project");
    return;
}

console.log("Creating Model Declarations");

const attrs = utils.getAllModels();
if(!fs.existsSync(`${typingsDir}`))
    fs.mkdirSync(`${typingsDir}`);

if(!fs.existsSync(`${typingsDir}models/`))
    fs.mkdirSync(`${typingsDir}models`);

for (const model of attrs) {
    const objName = `${model.name}Object`;

    let baseFile = `
declare interface ${objName} {
`;

    for (const key in model.attr) {
        baseFile += `    ${key}: `;

        const type = model.attr[key].type;
        const allowNull = model.attr[key].allowNull;
        const coltype = model.attr[key].columnType;

        if (['string', 'number', 'boolean'].includes(type)) {
            if (coltype === 'datetime') {
                baseFile += 'Date';
            } else {
                baseFile += type;
            }
        } else {
            baseFile += 'any';
        }

        if (allowNull === true || allowNull === undefined) {
            baseFile += ' | null';
        }

        baseFile += ';\n';
    }

    baseFile += `
}

export declare interface ${model.name}Model {
    update(selector: ${objName}): { set: (values: ${objName}) => Promise<void> };
    findOne(selector: ${objName}): Promise<${objName}>;
    find(selector: ${objName}): Promise<${objName}[]>;
}`;

    fs.writeFileSync(`./${typingsDir}models/${model.name}.d.ts`, baseFile);
    console.log(`Generated ${model.name} declaration`);
}

const importStatements = attrs.map((m) => `import type { ${m.name}Model } from "./models/${m.name}.d.ts";`).join('\n');

let globalDecl = `
${importStatements}

declare interface SailsObject {
    helpers: HelpersObject;
}

declare interface HelpersObject {
}

export declare interface HelperObject<T, R> {
    with(input: T): Promise<R>;
}

declare global {
    export var sails: SailsObject;
    ${attrs.map((m) => `export var ${m.name}: ${m.name}Model;`).join('\n    ')}
}

declare namespace NodeJS {
    interface Global {
        sails: SailsObject;
        ${attrs.map((m) => `${m.name}: ${m.name}Model;`).join('\n        ')}
    }
}`;

fs.writeFileSync(`${typingsDir}global.d.ts`, globalDecl);

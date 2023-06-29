#!/usr/bin/env node

const utils = require('./index');
const fs = require('fs');
const mt = require('./templates')

const typingsDir = process.argv[2] || '';

if (!utils.isASailsProject()) {
    console.log("This is not a sails.js project");
    return;
}

console.log("Creating Model Declarations");

if(typingsDir !== '' && !fs.existsSync(`${typingsDir}`))
    fs.mkdirSync(`${typingsDir}`);

if(!fs.existsSync(`${typingsDir}models/`))
    fs.mkdirSync(`${typingsDir}models`);

if(!fs.existsSync(`${typingsDir}helpers/`))
    fs.mkdirSync(`${typingsDir}helpers`);


const modelReferences = utils.getAllModels();
const helperReferences = utils.getAllHelpers();

// console.log(helperReferences)

for (const model of modelReferences) {
    const objName = `${model.name}Object`;
    const variables = []

    

    for (const key in model.attr) {
        const type = model.attr[key].type;
        const allowNull = model.attr[key].allowNull;
        const coltype = model.attr[key].columnType;
        let tsType = utils.getTSTypeFromSailsType(type, coltype);

        if (allowNull === true || allowNull === undefined) {
            tsType += ' | null';
        }
        variables.push({name: key, type: tsType})
    }
    

    fs.writeFileSync(`./${typingsDir}models/${model.name}.d.ts`, mt.createModel(objName, variables));
    // console.log(`Generated ${model.name} declaration`);
}

const rootCategory = {}

for (const helper of helperReferences) {
    const path = helper.path.split('/').filter(p => p !== '');


    let category = rootCategory;

    for(let i = 0; i < path.length; i++) {
        if(category[path[i]] === undefined) {
            category[path[i]] = {};
        }
        category = category[path[i]];
    }

    if(category.helpers === undefined) {
        category.helpers = [];
    }

    category.helpers.push(helper);
}

const topLevelCategories = []

for(const key in rootCategory) {
    const helpers = rootCategory[key].helpers;

    const formattedHelpers = [];
    const realname = key.replace('/', '') + "Helper";

    for(const helper of helpers) {
        const ref = helper.helper;
        const inputs = [];
        const paths = helper.path.split('/');

        // console.log(paths);

        for(const input in ref.inputs) {
            const sailsType = ref.inputs[input].type;
            inputs.push(`${input}: ${utils.getTSTypeFromSailsType(sailsType)}`)
        }

        // console.log(inputs)

        formattedHelpers.push({
            name: helper.name.substring(0, helper.name.length - 3).replace(/-./g, x=>x[1].toUpperCase()),
            helperType: 'direct',
            inputType: `{${inputs.join(', ')}}`,
            outputType: 'Promise<any>'
        })
    }
    topLevelCategories.push(realname.replace(/-./g, x=>x[1].toUpperCase()));
    fs.writeFileSync(`${typingsDir}/helpers/${utils.uppercaseFirstLetter(realname.replace(/-./g, x=>x[1].toUpperCase()))}.d.ts`, mt.createHelperCategory(realname.replace(/-./g, x=>x[1].toUpperCase()), formattedHelpers))
}


const modelImportStatements = modelReferences.map((m) => `import type { Exposed${m.name}Object } from "./models/${m.name}.d.ts";`).join('\n');
const helperImportStatements = topLevelCategories.map((m) => `import type { ${utils.uppercaseFirstLetter(m)} } from "./helpers/${utils.uppercaseFirstLetter(m)}.d.ts";`).join('\n');

let globalDecl = `
${modelImportStatements}
${helperImportStatements}

declare interface SailsObject {
    helpers: HelpersObject;
    log(...params: any);
}

export declare interface ExposedModel<T> {
    update(selector: T): { set: (values: T) => Promise<void> };
    findOne(selector: T): Promise<T>;
    find(selector: T): Promise<T[]>;
}

declare interface HelpersObject {
    ${mt.createHelpersObject(topLevelCategories)}
}

export declare interface HelperObject<T, R> {
    with(input: T): Promise<R>;
}

declare global {
    export var sails: SailsObject;
    ${modelReferences.map((m) => `export var ${m.name}: Exposed${m.name}Object;`).join('\n    ')}
}

declare namespace NodeJS {
    interface Global {
        sails: SailsObject;
        ${modelReferences.map((m) => `${m.name}: Exposed${m.name}Object;`).join('\n        ')}
    }
}`;

fs.writeFileSync(`${typingsDir}global.d.ts`, globalDecl);

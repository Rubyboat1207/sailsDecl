#!/usr/bin/env node
var utils = require('./index')
var fs = require('fs')

if(!utils.isASailsProject()) {
    console.log("This is not a sails.js project")
    return;
}

console.log("Creating Model Declarations")

const attrs = utils.getAllModels();
let globalAdditions = '';
let imports = '';
let vars = '';


for(const model of attrs) {
    const objName = `${model.name}Object`;
    globalAdditions += `        ${model.name}: ${objName}\n`;
    imports += `import { ${model.name}Model } from "./${model.name}.d.ts"\n`
    vars += `declare var ${model.name}: ${model.name}Model;\n`


    let baseFile = `
declare interface ${objName} {
    
    `

    for(const key in model.attr) {
        baseFile += key + ': ';

        type = model.attr[key].type;
        allowNull = model.attr[key].allowNull;
        coltype = model.attr[key].columnType;

        if(['string', 'number', 'boolean'].includes(type)) {
            if(coltype === 'datetime') {
                baseFile += 'Date';
            }else {
                baseFile += type
            }
        }else {
            baseFile += 'any'
        }

        if(allowNull === true || allowNull === undefined) {
            baseFile += ' | null';
        }

        baseFile += ';\n    '
    }

    baseFile += `
}
export declare interface ${model.name}Model {
    update(selector: ${objName}): {set: (values: ${objName}) => Promise< void >}
    findOne(selector: ${objName}): Promise< ${objName} >
    find(selector: ${objName}): Promise< ${objName}[] >
}`

    fs.writeFileSync(`./${model.name}.d.ts`, baseFile)
    console.log(`Generated ${model.name} declaration`)
}

let globalDecl = `
import { ActivityHelpers } from "./activity";
import { AuthHelpers } from "./auth";
${imports}

declare interface SailsObject {
    helpers: HelpersObject;
}

declare interface HelpersObject {
    activity: ActivityHelpers
    auth: AuthHelpers
}

export declare interface HelperObject<T, R> {
    with(input: T): Promise<R>;
}

declare var sails: SailsObject;
${vars}

declare namespace NodeJS {
    interface Global {
        sails: SailsObject;
${globalAdditions}
    }
}`
    fs.writeFileSync('global.d.ts', globalDecl);
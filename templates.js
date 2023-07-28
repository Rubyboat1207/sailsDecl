
const utils = require('./index');

const createModel = (objName, variables) => {
    const vars = variables.map(v => `${v.name}: ${v.type},\n    `);
    return `
import type { ExposedModel } from "../global.d.ts";

declare interface ${objName} {
    ${vars.join('')}
}
export declare interface Exposed${objName} extends ExposedModel< ${objName} > {}
`
}

/**
 * 
 * @param {string} name 
 * @param {{name: string, helperType: "direct" | "category", inputType: string | undefined, outputType: string | undefined}[]} helpers 
 * @returns string of helper category to be written to file.
 */
const createHelperCategory = (name, helpers, imports) => {
    const subHelpers = helpers.filter(h => h.helperType === 'direct').map(h => createIndividualHelper(h.name, h.inputType, h.outputType))
    const subCategories = helpers.filter(h => h.helperType === 'category').map(h => 
        `import { ${utils.uppercaseFirstLetter(h.name)} } from "./${h.name}"`
    )

    return `import { HelperObject } from "../global";
${imports.join("\n")}

export declare interface ${utils.uppercaseFirstLetter(name)} {
    ${subHelpers.join('\n    ')}
    ${subCategories.map(h => `${h.name}: ${utils.uppercaseFirstLetter(h.name)}`).join('\n    ')}
}`
}

const createIndividualHelper = (name, inputType, outputType) => {
    return `${name}: HelperObject< ${inputType}, ${outputType} >;`
}

const createHelpersObject = (topLevelCategories) => {
    return topLevelCategories.map(c => `${c.substring(0, c.length - 6).toLowerCase()}: ${utils.uppercaseFirstLetter(c)}`).join(';\n    ')
}



module.exports = {
    createModel,
    createHelperCategory,
    createHelpersObject
}
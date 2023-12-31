#!/usr/bin/env node
const utils = require('./index');
const fs = require('fs');
const mt = require('./templates');

const typingsDir = process.argv[2] || 'typings/';

if (!utils.isASailsProject()) {
  console.log('This is not a sails.js project');
  return;
}

if (typingsDir !== '' && !fs.existsSync(`${typingsDir}`))
  fs.mkdirSync(`${typingsDir}`);

if (!fs.existsSync(`${typingsDir}models/`)) fs.mkdirSync(`${typingsDir}models`);

if (!fs.existsSync(`${typingsDir}helpers/`))
  fs.mkdirSync(`${typingsDir}helpers`);

console.log('Finding Models');
const modelReferences = utils.getAllModels();
console.log('Finding Helpers');
const helperReferences = utils.getAllHelpers();

const allKnownReferenceableObjects = [];
const addImportCallbacks = {};
const writeCallbacks = [];

// console.log(helperReferences)
console.log('\nWriting Model Declarations');
for (const model of modelReferences) {
  const objName = `${model.name}Object`;
  const variables = [];

  for (const key in model.attr) {
    variables.push({
      name: key,
      type: utils.getFullTsTypeDeclFromSailsObject(
        model.attr[key],
        addImportCallbacks,
      ),
    });
  }
  allKnownReferenceableObjects.push({
    obj: `Exposed${model.name}Object`,
    ref: `import type { Exposed${model.name}Object } from "./models/${model.name}.d.ts";`,
    type: 'exposedModel',
  });
  allKnownReferenceableObjects.push({
    obj: objName,
    ref: `import type { ${objName} } from "./models/${model.name}.d.ts";`,
    type: 'model',
  });
  writeCallbacks.push(() => {
    fs.writeFileSync(
      `./${typingsDir}models/${model.name}.d.ts`,
      mt.createModel(objName, variables),
    );
  });
  // console.log(`Generated ${model.name} declaration`);
}
console.log('\nWriting Helper Declarations');
const rootCategory = {};

for (const helper of helperReferences) {
  const path = helper.path.split('/').filter(p => p !== '');

  let category = rootCategory;

  for (let i = 0; i < path.length; i++) {
    if (category[path[i]] === undefined) {
      category[path[i]] = {};
    }
    category = category[path[i]];
  }

  if (category.helpers === undefined) {
    category.helpers = [];
  }

  category.helpers.push(helper);
}

const topLevelCategories = [];

for (const key in rootCategory) {
  const helpers = rootCategory[key].helpers;

  const formattedHelpers = [];
  const realname = key.replace('/', '') + 'Helper';
  let uuid = Math.random();
  const customImports = [];

  for (const helper of helpers) {
    const ref = helper.helper;
    const inputs = [];
    const paths = helper.path.split('/');

    // console.log(paths);

    for (const input in ref.inputs) {
      const sailsTypeObject = ref.inputs[input];
      inputs.push(
        `${input}: ${utils.getFullTsTypeDeclFromSailsObject(
          sailsTypeObject,
          addImportCallbacks,
          uuid,
        )}`,
      );
    }

    let returnType = 'any';
    if (ref.hasOwnProperty('$SD-ReturnType')) {
      returnType = ref['$SD-ReturnType'];
      if (!addImportCallbacks.hasOwnProperty(uuid)) {
        addImportCallbacks[uuid] = [];
      }
      addImportCallbacks[uuid].push(returnType);
    }

    if (ref.hasOwnProperty('$SD-ExternalImports')) {
      const extern = ref['$SD-ExternalImports'];
      extern.forEach(imp => {
        if (customImports.includes(imp)) return;
        customImports.push(imp);
      });
    }

    // console.log(inputs)

    formattedHelpers.push({
      name: helper.name
        .substring(0, helper.name.length - 3)
        .replace(/-./g, x => x[1].toUpperCase()),
      helperType: 'direct',
      inputType: `{${inputs.join(', ')}}`,
      outputType: returnType,
    });
  }

  const camelCase = realname.replace(/-./g, x => x[1].toUpperCase());
  const pascalCase = utils.uppercaseFirstLetter(camelCase);

  allKnownReferenceableObjects.push({
    obj: pascalCase,
    ref: `import type { ${pascalCase} } from "./helpers/${pascalCase}.d.ts";`,
    type: 'helper',
  });

  topLevelCategories.push(pascalCase);
  writeCallbacks.push(() => {
    const imports = customImports;
    if (addImportCallbacks.hasOwnProperty(uuid)) {
      const referencedObjects = allKnownReferenceableObjects.filter(p =>
        addImportCallbacks[uuid].includes(p.obj),
      );
      for (const refObj of referencedObjects) {
        if (refObj.type == 'model') {
          imports.push(refObj.ref.replace('./models', '../models'));
        }
        if (refObj.type == 'baseType') {
          imports.push(refObj.ref);
        }
      }
    }
    fs.writeFileSync(
      `${typingsDir}/helpers/${pascalCase}.d.ts`,
      mt.createHelperCategory(camelCase, formattedHelpers, imports),
    );
  });
}

allKnownReferenceableObjects.push({
  obj: `ExposedModel`,
  ref: `import type { ExposedModel } from "../global.d.ts";`,
  type: 'baseType',
});

// hack fix, but idrc
allKnownReferenceableObjects.push({
  obj: `ExposedModel<any>`,
  ref: `import type { ExposedModel } from "../global.d.ts";`,
  type: 'baseType',
});

allKnownReferenceableObjects.push({
  obj: `HelperObject`,
  ref: `import type { HelperObject } from "../global.d.ts";`,
  type: 'baseType',
});

writeCallbacks.forEach(c => c());

console.log('\nWriting Global.d.ts file');
// const modelImportStatements = modelReferences.map((m) => `import type { Exposed${m.name}Object } from "./models/${m.name}.d.ts";`).join('\n');
// const helperImportStatements = topLevelCategories.map((m) => `import type { ${utils.uppercaseFirstLetter(m)} } from "./helpers/${utils.uppercaseFirstLetter(m)}.d.ts";`).join('\n');

let globalDecl = `
${allKnownReferenceableObjects.map(o => o.ref).join('\n')}

declare interface SailsObject {
    helpers: HelpersObject;
    log(...params: any);
}

export declare interface ExposedModel<T> {
    update(selector: T): { set: (values: T) => Promise<void> };
    findOne(selector: T): Promise<T>;
    find(selector: T): Promise<T[]>;
    count(selector: T): Promise<number>;
    create(selector: T): Promise<T>;
}

declare interface HelpersObject {
    ${mt.createHelpersObject(topLevelCategories)}
}

export declare interface HelperObject<T, R> {
    with(input: T): Promise<R>;
}

declare global {
    export var sails: SailsObject;
    ${modelReferences
      .map(m => `export var ${m.name}: Exposed${m.name}Object;`)
      .join('\n    ')}
}

declare namespace NodeJS {
    interface Global {
        sails: SailsObject;
        ${modelReferences
          .map(m => `${m.name}: Exposed${m.name}Object;`)
          .join('\n        ')}
    }
}`;

fs.writeFileSync(`${typingsDir}global.d.ts`, globalDecl);
console.log('\n---- All files written successfully! ----');

var fs = require('fs');

const isASailsProject = () => {
  return fs.existsSync('./.sailsrc');
};

const getAllModels = (rootDir = '') => {
  const dircont = fs.readdirSync('./api/models/' + rootDir);

  const models = [];

  for (const item of dircont) {
    if (!item.includes('.')) {
      console.log(`checking subdirectory: ${item}`);
      models.push(...getAllModels(rootDir + item + '/'));
      continue;
    }
    if (!item.endsWith('.js')) {
      continue;
    }
    console.log(`Found Model: ${item}`);
    try {
      var js = require(`${process.cwd()}/api/models/${item}`);
      models.push({
        name: item.substring(0, item.length - 3),
        attr: js.attributes,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return models;
};

const getAllHelpers = (rootDir = '') => {
  const dircont = fs.readdirSync('./api/helpers/' + rootDir);

  const helpers = [];

  for (const item of dircont) {
    if (!item.includes('.')) {
      console.log(`found subdirectory: ${item}`);
      helpers.push(...getAllHelpers(rootDir + item + '/'));
      continue;
    }
    if (!item.endsWith('.js')) {
      continue;
    }
    console.log(`Found Helper: ${item}`);
    var js = require(`${process.cwd()}/api/helpers/${rootDir}${item}`);

    helpers.push({
      path: rootDir,
      helper: js,
      name: item,
    });
  }

  return helpers;
};

const uppercaseFirstLetter = str => {
  return str[0].toUpperCase() + str.substring(1);
};

const getTSTypeFromSailsType = (sailsType, columnType) => {
  if (['string', 'number', 'boolean'].includes(sailsType)) {
    if (columnType === 'datetime') {
      return 'Date';
    } else {
      return sailsType;
    }
  } else {
    return 'any';
  }
};

const appendNullableIfApplicable = (string, nullable, required) => {
  if (nullable === false || required === true) {
    return string + ' | null';
  }
  return string;
};

const getFullTsTypeDeclFromSailsObject = (
  sailsAttributeObject,
  callbackList,
  uuid,
) => {
  if (sailsAttributeObject.hasOwnProperty('$SD')) {
    if (!callbackList.hasOwnProperty(uuid)) {
      callbackList[uuid] = [];
    }
    callbackList[uuid].push(sailsAttributeObject['$SD']);
    return sailsAttributeObject['$SD'];
  }
  return appendNullableIfApplicable(
    getTSTypeFromSailsType(
      sailsAttributeObject.type,
      sailsAttributeObject.columnType,
    ),
    sailsAttributeObject.allowNull,
    sailsAttributeObject.required,
  );
};

module.exports = {
  isASailsProject,
  getAllModels,
  getAllHelpers,
  getTSTypeFromSailsType,
  uppercaseFirstLetter,
  appendNullableIfApplicable,
  getFullTsTypeDeclFromSailsObject,
};

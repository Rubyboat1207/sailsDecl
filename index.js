var fs = require('fs')


const isASailsProject = () => {
    return fs.existsSync("./.sailsrc")
}

const getAllModels = () => {
    const dircont = fs.readdirSync('./api/models/');

    const models = [];

    for(const model of dircont) {
        if(!model.endsWith('.js')) {
            continue;
        }
        try {
            var js = require(`${process.cwd()}/api/models/${model}`);
            models.push({name: model.substring(0, model.length - 3), attr: js.attributes})
        }catch(e) {
            console.error(e)
        }
        
        
    }

    return models;
}

const getAllHelpers = (rootDir='') => {
    const dircont = fs.readdirSync('./api/helpers/' + rootDir);

    const helpers = []

    for(const item of dircont) {
        if(!item.includes('.')) {
            helpers.push(...getAllHelpers(rootDir + item + '/'))
            continue;
        }
        if(!item.endsWith('.js')) {
            continue;
        }
        var js = require(`${process.cwd()}/api/helpers/${rootDir}${item}`);

        helpers.push({
            path: rootDir,
            helper: js,
            name: item
        })
    }

    return helpers;
}

const uppercaseFirstLetter = (str) => {
    return str[0].toUpperCase() + str.substring(1)
}

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
}

module.exports = {
    isASailsProject,
    getAllModels,
    getAllHelpers,
    getTSTypeFromSailsType,
    uppercaseFirstLetter
}
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


module.exports = {
    isASailsProject,
    getAllModels
}
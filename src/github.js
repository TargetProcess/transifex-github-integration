var config = require('./../config/config');
var github = require('octonode');

var client = github.client({
    username: config.gitHub.username,
    password: config.gitHub.password
});
var ghrepo = client.repo(`${config.gitHub.username}/${config.gitHub.repo}`);

var getDictionaryFromGithub = function () {
    return new Promise(function (resolve, reject) {
        ghrepo.tree('master', true, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res.tree.filter(function (node) {
                    return node.type === 'blob' && node.path !== 'package.json' && node.path.indexOf('.js') !== -1;
                }).map(function (node) {
                    return {path: node.path, sha: node.sha}
                }))
            }
        });
    });
};
var updateDictionaryInGithub = function (dict) {
    return new Promise(function (resolve, reject) {
        ghrepo.updateContents(dict.path, `update ${dict.lang} file`, dict.content, dict.sha, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};
var createDictionaryInGithub = function (dict) {
    return new Promise(function (resolve, reject) {
        ghrepo.createContents(`dict/${dict.lang}/${dict.lang}.json`, `create ${dict.lang} file`, dict.content, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};
var removeDictionaryInGithub = function (dict) {
    return new Promise(function (resolve, reject) {
        ghrepo.deleteContents(dict.path, `remove ${dict.path.match(/\/(\S+-\S+)\.json$/i)[1]} file`, dict.sha, function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

module.exports = {
    getDictionaryFromGithub: getDictionaryFromGithub,
    updateDictionaryInGithub: updateDictionaryInGithub,
    createDictionaryInGithub: createDictionaryInGithub,
    removeDictionaryInGithub: removeDictionaryInGithub
};

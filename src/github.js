var _ = require('lodash');
var fs = require('fs');
var pathToLocalRepo = 'tmp_repo';
var git = require('simple-git')(pathToLocalRepo);
var isClone = true;
if (!fs.existsSync(pathToLocalRepo)) {
    fs.mkdirSync(pathToLocalRepo);
    isClone = false;
}
var gitCommand = function (command) {
    var params = _.toArray(arguments).slice(1);
    return new Promise(function (resolve, reject) {
        var callback = function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        };
        git[command].apply(git, params.concat(callback));
    });
};
var writeDictionary = function (dict) {
    var dir = `dict/${dict.lang}`;
    var repoDir = `${pathToLocalRepo}/${dir}`;
    if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir);
    }
    var path = `${dir}/${dict.lang}.json`;
    return new Promise(function (resolve, reject) {
        fs.writeFile(`${pathToLocalRepo}/${path}`, dict.content, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(path);
            }
        });
    });
};
// {{username:String, password:String, repo: String}} config
/**
 *
 * @param config
 * @return {{initRepo: Function, addDictionariesToGit: Function, removeDictionariesToGit: Function, getLanguagesFromRepository: Function, updatePackageVersion: Function, initRepo: Function}}
 */
module.exports = function (config) {
    var gitubUrl = `https://${config.username}:${config.password}@github.com/${config.repo}.git`;
    return {
        initRepo: function () {
            var result;
            if (isClone) {
                result = gitCommand('fetch', gitubUrl).then(function () {
                    return gitCommand('pull');
                });
            } else {
                result = gitCommand('clone', gitubUrl, '.');
            }

            return result.then(function () {
                return git;
            })
        },
        addDictionariesToGit: function (dictionaries) {
            return Promise.all(dictionaries.map(writeDictionary)).then(function (files) {
                return gitCommand('add', files);
            });
        },
        removeDictionariesToGit: function (dictionaries) {
            return dictionaries.map(function (dict) {
                return gitCommand('rm', `dict/${dict}/${dict}.json`);
            });
        },
        getLanguagesFromRepository: function () {
            return new Promise(function (resolve, reject) {
                fs.readdir(`${pathToLocalRepo}/dict/`, function (err, stats) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(stats);
                    }
                })
            });

        },
        getStatus: function () {
            return gitCommand('status');
        },
        commit: function (message) {
            return gitCommand('commit', message);
        },
        updatePackageVersion: function (langs) {
            return gitCommand('commit', 'update dictionaries')
                .then(function () {
                    return gitCommand('push', gitubUrl, 'master');
                });
        }
    };
};

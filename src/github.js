var _ = require('lodash');
var fs = require('fs');

/**
 *
 * @param {{username:String, password:String, repo: String, pathToLocalRepo:String}} config
 * @return {{initRepo: Function, addDictionariesToGit: Function, removeDictionariesToGit: Function, getLanguagesFromRepository: Function, updatePackageVersion: Function, initRepo: Function}}
 */
module.exports = function (config) {
    var gitubUrl = `https://${config.username}:${config.password}@github.com/${config.repo}.git`;
    var pathToLocalRepo = config.pathToLocalRepo || 'tmp_repo';
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

    var updatePackageJson = function () {
        return new Promise(function (resolve, reject) {
            var path = pathToLocalRepo + '/package.json';
            fs.readFile(path, function (err, buffer) {
                if (err) {
                    reject(err);
                } else {
                    var config = JSON.parse(buffer.toString());
                    var split = config.version.split('.');
                    split[1] = parseInt(split[1]) + 1;
                    split[2] = 0;
                    var version = split.join('.');
                    config.version = version;
                    fs.writeFile(path, JSON.stringify(config, null, 2), function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(version);
                        }
                    })
                }
            })
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
        addLanguagesInfoToGit: function (info) {
            return new Promise(function (resolve, reject) {
                fs.writeFile(`${pathToLocalRepo}/languages.json`, JSON.stringify(info, null, 2), function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve('languages.json');
                    }
                });
            }).then(function (file) {
                    return gitCommand('add', [file]);
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
        updatePackageVersion: function () {
            return updatePackageJson()
                .then(function (version) {
                    return gitCommand('add', ['package.json'])
                        .then(function () {
                            return gitCommand('commit', 'update dictionaries to version ' + version)
                        })
                        .then(function () {
                            return gitCommand('addTag', version)
                        })
                        .then(function () {
                            return Promise.all([
                                gitCommand('push', gitubUrl, 'master'),
                                gitCommand('pushTags', gitubUrl)
                            ])
                        }).then(function () {
                            return 'Version of dictionaries was updated to ' + version;
                        });
                });
        }
    };
};

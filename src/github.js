var _ = require('lodash');
var fs = require('fs');

/**
 * @param {{username: String, password: String, repo: String, pathToLocalRepo: String}} config
 * @returns {{initRepo, addDictionaryToGit, removeLanguageFromGit, addLanguagesInfoToGit, getLanguagesFromRepository, getStatus, commit, updatePackageVersion}}
 */
module.exports = function (config) {
    var githubUrl = `https://${config.username}:${config.password}@github.com/${config.repo}.git`;
    var pathToLocalRepo = config.pathToLocalRepo || 'tmp_repo';
    var git = require('simple-git')(pathToLocalRepo);

    var mkdirIfNotExists = function (path) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
            return true;
        }

        return false;
    };

    var isAlreadyCloned = true;
    if (mkdirIfNotExists(pathToLocalRepo)) {
        isAlreadyCloned = false;
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

    var gitAdd = files => gitCommand('add', files);

    var gitCommit = message => gitCommand('commit', message);

    var updatePackageJson = function () {
        return new Promise(function (resolve, reject) {
            var path = `${pathToLocalRepo}/package.json`;
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
                    });
                }
            });
        });
    };

    var writeDictionary = function (languageCode, content) {
        var langDir = `dict/${languageCode}`;
        mkdirIfNotExists(`${pathToLocalRepo}/${langDir}`);

        var path = `${langDir}/${languageCode}.json`;
        return new Promise(function (resolve, reject) {
            fs.writeFile(`${pathToLocalRepo}/${path}`, content, function (err) {
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
            var cloneOrUpdateRepo = isAlreadyCloned ?
                gitCommand('fetch', githubUrl).then(() => gitCommand('pull')) :
                gitCommand('clone', githubUrl, '.');

            return cloneOrUpdateRepo.then(function () {
                return git;
            });
        },

        addDictionaryToGit: function (languageCode, content) {
            return writeDictionary(languageCode, content).then(files => gitAdd(files));
        },

        removeLanguageFromGit: function (languageCode) {
            return gitCommand('rm', `dict/${languageCode}/${languageCode}.json`);
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
            }).then(file => gitAdd([file]));
        },

        getLanguagesFromRepository: function () {
            return new Promise(function (resolve, reject) {
                fs.readdir(`${pathToLocalRepo}/dict/`, function (err, stats) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(stats);
                    }
                });
            });
        },

        getStatus: function () {
            return gitCommand('status');
        },

        commit: gitCommit,

        updatePackageVersion: function () {
            var version;
            return updatePackageJson()
                .then(updatedVersion => {
                    version = updatedVersion;
                    return gitAdd(['package.json']);
                })
                .then(() => gitCommit(`Update dictionaries to version ${version}`))
                .then(() => gitCommand('addTag', version))
                .then(function () {
                    return Promise.all([
                        gitCommand('push', githubUrl, 'master'),
                        gitCommand('pushTags', githubUrl)
                    ]);
                })
                .then(() => `Updated dictionaries to version ${version}`);
        }
    };
};

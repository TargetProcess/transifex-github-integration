var _ = require('lodash');
var git = require('./github');
var transifex = require('tau-transifex');

module.exports = function (config) {
    var gitRepo = git(config.github);
    var getTranslatedResources = transifex(config.transifex).getTranslatedResources;
    return gitRepo.initRepo()
        .then(function () {
            return Promise.all([getTranslatedResources(), gitRepo.getLanguagesFromRepository()])
        })
        .then(function (res) {
            var dictionaryFromTransifex = res[0];
            var dictionaryFromGitRepository = res[1];
            return {
                add: dictionaryFromTransifex,
                remove: _.difference(dictionaryFromGitRepository, _.pluck(dictionaryFromTransifex, 'lang'))
            };
        })
        .then(function (files) {
            return Promise.all(
                _.flatten([
                    gitRepo.addDictionariesToGit(files.add),
                    gitRepo.removeDictionariesToGit(files.remove)
                ])
            );
        }).then(function () {
            return gitRepo.getStatus();
        })
        .then(function (status) {
            var hasChange = _.reduce(status, function (hasChange, st) {
                return hasChange || Boolean(st.length);
            }, false);
            if (hasChange) {
                return gitRepo.updatePackageVersion().then(function (res) {
                    return res;
                });
            } else {
                return "No update";
            }
        })
};
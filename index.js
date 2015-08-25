var https = require('https');
var fs = require('fs');
var _ = require('lodash');
var config = require('./config/config');
var gitRepo = require('./src/github')(config.github);
var getTranslatedResources = require('tau-transifex')(config.transifex).getTranslatedResources;

gitRepo.initRepo()
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
            return gitRepo.updatePackageVersion().then(function () {
                return "Dictionaries were updated"
            });
        } else {
            return "No update";
        }
    })
    .then(function (res) {
        console.log(res);
    }).catch(function () {
        console.log(arguments);
    });



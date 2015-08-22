var https = require('https');
var fs = require('fs');
var _ = require('lodash');
var config = require('./config/config');
var github = require('./src/github');
var getTranslatedResources = require('./src/transifex').getTranslatedResources;
var updateDictionaryInGithub = github.updateDictionaryInGithub;
var createDictionaryInGithub = github.createDictionaryInGithub;
var removeDictionaryInGithub = github.removeDictionaryInGithub;
var getDictionaryFromGithub = github.getDictionaryFromGithub;
var writeDictionary = function (dict) {
    return new Promise(function (resolve) {
        fs.writeFile(`res/${dict.lang}.json`, dict.content, function () {
            resolve();
        });
    });
};

Promise.all([getTranslatedResources(), getDictionaryFromGithub()]).then(function (res) {
    var dictionaryFromTransifex = res[0];
    var dictionaryFromGitHub = res[1];
    return dictionaryFromTransifex.reduce(function (memo, file) {
        var langIsFind = _.find(dictionaryFromGitHub, function (item) {
            return item.path.includes(`${file.lang}/${file.lang}.json`);
        });
        if (langIsFind) {
            memo.update.push(_.extend({}, langIsFind, file))
        } else {
            memo.create.push(file);
        }
        memo.remove = dictionaryFromGitHub.filter(function (item) {
            return !_.find(memo.update, function (file) {
                return file.path === item.path;
            });
        });
        return memo;
    }, {create: [], update: [], remove: []});
}).then(function (files) {
    var updateFiles = files.update.map(updateDictionaryInGithub);
    var createFiles = files.create.map(createDictionaryInGithub);
    var removeFiles = files.remove.map(removeDictionaryInGithub);
    return Promise.all([updateFiles, createFiles, removeFiles])
}).catch(function () {
    console.log(arguments);
});


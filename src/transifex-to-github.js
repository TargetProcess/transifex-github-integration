var _ = require('lodash');
var git = require('./github');
var transifex = require('tau-transifex');

var retrieveTransifexTranslations = (transifexApi) => {
    return Promise
        .all([
            transifexApi.getProjectLanguages(),
            transifexApi.getLanguagesInfo()
        ])
        .then(([projectLanguages, allLanguagesInfo]) => Promise.all(projectLanguages.map(language => {
            var languageInfo = _.find(allLanguagesInfo, i => i.code === language.code) || {name: language.code};

            return Promise
                .all([
                    transifexApi.getTranslationStats(language.code),
                    transifexApi.getTranslatedResource(language.code)
                ])
                .then(([stats, resource]) => ({
                    languageCode: language.code,
                    name: languageInfo.name,
                    stats,
                    resource
                }));
        })));
};

/**
 * @param {{github, transifex}} config
 * @returns {Promise.<String>}
 */
module.exports = function update(config) {
    var gitRepo = git(config.github);
    var transifexApi = transifex(config.transifex);
    var getRepositoryLanguages = gitRepo
        .initRepo()
        .then(() => gitRepo.getLanguagesFromRepository());

    return Promise
        .all([retrieveTransifexTranslations(transifexApi), getRepositoryLanguages])
        .then(function ([translations, languagesInGit]) {
            var missingLanguages = _.difference(languagesInGit, _.pluck(translations, 'languageCode'));
            var languagesInfo = translations.map(({languageCode, name, stats}) => ({
                code: languageCode,
                name,
                stats
            }));
            return [gitRepo.addLanguagesInfoToGit(languagesInfo)]
                .concat(missingLanguages.map(x => gitRepo.removeLanguageFromGit(x)))
                .concat(translations.map(({languageCode, resource}) => gitRepo.addDictionaryToGit(languageCode, resource)));
        })
        .then(() => gitRepo.getStatus())
        .then(function (status) {
            var hasChange = _.reduce(status, (hasChange, st) => hasChange || Boolean(st.length), false);
            return hasChange ? gitRepo.updatePackageVersion() : 'No update';
        });
};

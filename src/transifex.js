var https = require('https');
var config = require('./../config/config');
var apiUrl = '/api/2/project/';

var getResponse = function (url) {
    console.log(apiUrl + url);
    var options = {
        host: 'transifex.com',
        path: apiUrl + url,
        method: 'GET',
        auth: `${config.transifex.login}:${config.transifex.password}`
    };
    return new Promise(function (resolve, reject) {
        var req = https.request(options, function (resp) {
            var body = '';
            resp.on('data', function (chunk) {
                body += chunk;
            });
            resp.on('end', function () {
                resolve(JSON.parse(body));
            });
        }).on("error", function (e) {
            reject(e);
        });
        req.end();

        req.on('error', function (e) {
            reject(e);
        });
    })
};
var getLanguages = function () {
    var url = `${config.transifex.projectSlug}/?details`;
    return getResponse(url).then(function (data) {
        return data.teams;
    });
};
var getTranslation = function (langCode) {
    var url = `${config.transifex.projectSlug}/resource/${config.transifex.resourceSlug}/translation/${langCode}/`;
    return getResponse(url).then(function (data) {
        langCode = langCode.replace('_','-');
        if(langCode.indexOf('-') === -1) {
            langCode = langCode + '-' + langCode.toUpperCase();
        }
        return {lang: langCode, content: data.content};
    });
};
var getTranslatedResources = function () {
    return getLanguages().then(function (languages) {
        var resources = languages.map(getTranslation);
        return Promise.all(resources)
    })
};
module.exports = {
    getTranslatedResources:getTranslatedResources
};

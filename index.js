var update = require('./src/transifex-to-github');
var fs = require('fs');
var config = require('./config/config');

update(config).then(function (res) {
        console.log(res);
    }).catch(function (err) {
        console.log(err);
    }).catch();



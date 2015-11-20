var update = require('./src/transifex-to-github');
var config = require('./config/config');

update(config)
    .then(function (res) {
        console.log(res);
    })
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });

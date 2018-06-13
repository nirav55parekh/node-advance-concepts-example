var ResponseBase = require('../controllers/response/responseBase');
var objResponse = new ResponseBase();

var fileNotFoundRoute = function(expressApp) {
    expressApp.use('*', function(req, res) {
        objResponse.sendNotFound(res);
        //res.send('Sorry, this is an invalid URL.');
    });
};

module.exports = fileNotFoundRoute;
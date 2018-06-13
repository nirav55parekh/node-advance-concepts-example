var ErrorController = require('./error/errorController');

class BaseController extends ErrorController {
    getFullUrl(req) {
        return req.protocol + '://' + req.headers.host;
    }
}

module.exports = BaseController;
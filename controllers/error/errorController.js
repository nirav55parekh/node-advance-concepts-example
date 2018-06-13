var ResponseBase = require('../response/responseBase');
var Messages = require('../../enum/wootravelEnum');
var ErrorLogModel = require('../../models/errorlog');

class ErrorController extends ResponseBase {
    handleError(res, err) {
        this.handleServerError(err, null, res, null);
    }

    handleServerError(err, req, res, next) {
        if (err.message === Messages.error.InvalidToken || err.message === Messages.error.NotAuthorized) {
            this.sendNotAuthorized(res);
        } else if (err.message === Messages.error.InvalidUser || err.message === Messages.error.VerifyEmail || err.message === Messages.error.InvalidEmailId || err.message === Messages.error.oldPasswordMatch || err.message === Messages.error.oldNewPasswordMatch) {
            this.send(res, 401, err.message, null);
        } else if (err.message === Messages.error.tokenExpired || err.type == 1) {
            this.send(res, 401, err.message, err.emailId);
        } else if (err.errors && err.name === Messages.error.ValidationError) {
            var validationErrorKeys = Object.keys(err.errors);
            var errorMsg = [];
            for (let i = 0; i < validationErrorKeys.length; i++) {
                let valError = err.errors[validationErrorKeys[i]];
                if (i === validationErrorKeys.length - 1) {
                    // errorMsg = errorMsg + valError.message;
                    errorMsg.push(valError.message);
                } else {
                    // errorMsg = errorMsg + valError.message + ', ';
                    errorMsg.push(valError.message);
                }
            }
            this.sendBadRequest(res, errorMsg);
        } else if (err.message) {
            this.send(res, 412, err.message, null);
        } else {
            this.logServerError(res.req, err);
            this.sendServerError(res, err.message);
        }
    }

    logServerError(req, err) {
        var newErrorLog = new ErrorLogModel({
            userId: req.user ? req.user.id : null,
            reqUrl: req.protocol + '://' + req.headers.host + req.originalUrl,
            reqMethod: req.method,
            message: err.message,
            stack: err.stack,
            date: Date.now()
        });
        newErrorLog.save()
            .then(function () {
                //log recorded 
            })
            .catch(function (err) {
                //error in recording log
                //TODO: what to do if error occurs in logging error
            });
    }
}

module.exports = ErrorController;
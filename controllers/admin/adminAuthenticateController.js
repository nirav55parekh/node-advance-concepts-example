//include config
var appConfig = require('../../config/appconfig');

//include models
var AdminModel = require('../../models/admin');
var TokenModel = require('../../models/token');
var jwtService = require('../../services/adminJwt');

//include controllers
var BaseController = require('./../baseController');
var EmailController = require('./../emailController');
var CommonController = require('./../commonServicesController');

//include enums
var TokenTypes = require('../../enum/tokenType');
var Messages = require('../../enum/wootravelEnum');

//other libraries
var Q = require('q');
var request = require('request');
const url = require('url');



class adminAuthenticateController extends BaseController {

    constructor() {
        super();
        this.Token = TokenModel;
        this.Admin = AdminModel;
        this.commonController = new CommonController();
        this.reqToken = "";
    }

    checkUserAvailable(req, res) {
        let token = req.headers.authorization;
        var that = this;
        this.Token.aggregate([
            {
                $lookup: {
                    from: "admins",
                    localField: "adminUserId",
                    foreignField: "_id",
                    as: "admins"
                }
            },
            { $unwind: "$admins" },
            { $match: { "token": token, "admins.isActive": true } }
        ])
            .then(function (response) {
                that.send(res, 200, "", response.length);
            })
            .catch(this.handleError.bind(this, res));
    }


    authorize(req, res, next) {
        try {
            let token = req.headers.authorization;
            if (!token) {
                next(new Error(Messages.error.InvalidToken));
            } else {
                jwtService.validateToken(token)
                    .then(function (data) {
                        var payload = data.payload,
                            user = data.user;
                        if (payload && (payload.type == TokenTypes.Authentication || payload.type == TokenTypes.EmailVerification)) {
                            if (user) {
                                req.user = user;
                                next();
                            } else {
                                next(new Error(Messages.error.InvalidToken));
                            }
                        } else {
                            next(new Error(Messages.error.InvalidToken));
                        }
                    })
                    .catch(function () {
                        next(new Error(Messages.error.InvalidToken));
                    });
            }
        } catch (error) {

        }
    }

    //Website Login code
    authenticate(req, res) {
        try {
            let emailId = req.body.emailId;
            let password = req.body.password;

            this.Admin.findOne({
                "emailId": new RegExp('^' + emailId + '$', "i"), isActive: true
            })
                .then(this.isPasswordSet.bind(this, res, password))
                .then(this.authenticateCallback.bind(this))
                .then(this.comparePassword.bind(this, password))
                .then(this.authenticationSuccess.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    isPasswordSet(res, password, adminUser) {
        try {
            var deferred = Q.defer();
            if ("password" in adminUser._doc) {
                deferred.resolve(adminUser);
            } else {
                if (adminUser._doc.tempPassword === password) {
                    var payload = { "adminUserDetails": adminUser._doc, "resetPassword": true };
                    this.send(res, 200, "Reset Password", payload);
                } else {
                    deferred.reject(new Error(Messages.error.loginError));
                }
            }
            return deferred.promise;
        } catch (error) {

        }
    }

    authenticateCallback(admin) {
        try {
            var deferred = Q.defer();
            if (admin) {
                deferred.resolve(admin);
            } else {
                deferred.reject(new Error(Messages.error.loginError));
            }
            return deferred.promise;
        } catch (error) {

        }
    }

    comparePassword(password, admin) {
        try {
            var deferred = Q.defer();
            //comparing admin Password
            admin.comparePassword(password).then(function (isMatch) {
                if (!isMatch) {
                    deferred.reject(new Error(Messages.error.loginError));
                } else {
                    //creating token
                    var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    jwtService.createToken(admin, TokenTypes.Authentication, expiryCondition)
                        .then(function (jwtToken) {
                            deferred.resolve({ admin: admin, token: jwtToken });
                        })
                        .catch(function () {
                            deferred.reject(new Error(Messages.error.loginError));
                        });
                }
            }.bind(this), function () {
                deferred.reject(new Error(Messages.error.loginError));
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    authenticationSuccess(res, data) {
        try {
            delete data.admin._doc.password;
            var obj = {
                "adminUserDetails": data.admin._doc,
                "token": data.token,
            }
            this.send(res, 200, Messages.error.AuthSuccess, obj);
        } catch (error) {

        }
    }

    forgotPasswordEmailVerification(req, res) {
        try {
            var email = req.body.emailId;

            this.Admin.findOne({ emailId: new RegExp('^' + email + '$', "i"), isActive: true })
                .then(this.isAdminExist.bind(this, res))
                .then(this.sendForgotPasswordEmailLink.bind(this, res))
                .then(this.getForgotPasswordEmailVerificationCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    isAdminExist(res, admin) {
        try {
            var deferred = Q.defer();

            if (admin) {
                deferred.resolve(admin);
            } else {
                deferred.reject(new Error(Messages.error.InvalidEmailId));
            }

            return deferred.promise;
        } catch (error) {

        }

    }

    sendForgotPasswordEmailLink(res, admin) {
        try {
            var deferred = Q.defer();
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.sendAdminResetPasswordLink(admin);
            deferred.resolve(admin);
            return deferred.promise;
        } catch (error) {

        }
    }

    getForgotPasswordEmailVerificationCallback(res) {
        this.send(res, 200, Messages.error.resetPasswordMail, null);
    }

    logout(req, res) {
        try {
            let token = req.headers.authorization;
            if (!token) {
                this.sendBadRequest(res, Messages.error.InvalidToken);
            } else {
                this.Token.update({ token: token }, { isExpired: true })
                    .then(function () {
                        this.send(res, 200, Messages.error.LogoutSuccess, "");
                    }.bind(this))
                    .catch(this.handleError.bind(this, res));
            }
        } catch (error) {

        }
    }

    verifyResetPassword(req, res) {
        try {
            let token = req.body.token;
            if (!token) {
                this.sendBadRequest(res, Messages.error.InvalidToken);
            } else {
                jwtService.validateToken(token)
                    .then(this.verifyResetPasswordCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            }
        } catch (error) {

        }
    }

    verifyResetPasswordCallback(res, data) {
        var payload = data.payload,
            admin = data.user;
        if (payload && payload.type == TokenTypes.resetPasswordVerification) {
            if (admin) {
                this.send(res, 200, "Token verified", admin._id);
            }
        }
    }

    setPassword(req, res) {
        try {
            var adminDetails = req.body;
            this.Admin.findById(adminDetails._id)
                .then(this.saveNewPassword.bind(this, res, adminDetails.newPassword))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    resetNewPassword(req, res) {
        try {
            this.reqToken = req.body.token;
            var adminDetails = req.body;
            this.Admin.findById(adminDetails._id)
                .then(this.resetPasswordLinkVerify.bind(this))
                .then(this.saveNewPassword.bind(this, res, adminDetails.newPassword))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    resetPasswordLinkVerify(admin) {
        try {
            var deferred = Q.defer();

            if (admin) {
                deferred.resolve(admin);
            } else {
                deferred.reject(new Error(Messages.error.NotAuthorized));
            }

            return deferred.promise;
        } catch (error) {

        }
    }

    saveNewPassword(res, newPassword, admin) {
        try {
            admin.password = newPassword;
            if (this.reqToken) {
                admin.save()
                    .then(this.commonController.expireVerificationLink.bind(this, res, this.reqToken))
                    .then(this.changePasswordCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            } else {
                admin.save()
                    .then(this.changePasswordCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            }

        } catch (error) {

        }
    }

    changePasswordCallback(res) {
        this.send(res, 200, 'Password changed.', null);
    }
}

module.exports = adminAuthenticateController;
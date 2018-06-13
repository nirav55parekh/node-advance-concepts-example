//include config
var appConfig = require('../../config/appconfig');

//include models
var BusinessUserModel = require('../../models/businessUser');
var TokenModel = require('../../models/token');
var jwtService = require('../../services/businessUserJwt');

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



class businessUserAuthenticateController extends BaseController {

    constructor() {
        super();
        this.Token = TokenModel;
        this.BusinessUser = BusinessUserModel;
        this.commonController = new CommonController();
        this.reqToken = "";
    }

    checkUserAvailable(req, res) {
        let token = req.headers.authorization;
        var that = this;
        this.Token.aggregate([{
            $lookup: {
                from: "businessUsers",
                localField: "businessUserId",
                foreignField: "_id",
                as: "businessUsers"
            }
        },
        { $unwind: "$businessUsers" },
        { $match: { "token": token, "businessUsers.status": 2, "businessUsers.isActive": true, "businessUsers.isDelete": false } }
        ])
            .then(function (response) {
                that.send(res, 200, "", response.length);
            })
            .catch(this.handleError.bind(this, res));
    }
    //Website Login code
    authenticate(req, res) {
        // debugger;
        try {
            let emailId = req.body.emailId;
            let password = req.body.password;
            var that = this;
            this.BusinessUser.findOne({ emailId: new RegExp('^' + emailId + '$', "i"), status: { $in: [1, 2, 3] }, isActive: true, isDelete: false })
                .then(this.authenticateCallback.bind(this))
                .then(this.comparePassword.bind(this, password))
                .then(this.authenticationSuccess.bind(this, res))
                .catch(function (err) {
                    that.send(res, 401, err.message, []);
                });
        } catch (error) {

        }
    }

    authenticateCallback(businessUser) {
        try {
            var deferred = Q.defer();
            if (businessUser) {
                if (businessUser.isEmailVerified) {
                    if (businessUser.status == 1) {
                        deferred.reject(new Error(Messages.error.approvalWaiting));
                    } else if (businessUser.status == 2) {
                        deferred.resolve(businessUser);
                    } else if (businessUser.status == 3) {
                        deferred.reject(new Error(Messages.error.signupRejcted));
                    }
                } else {
                    deferred.reject(new Error(Messages.error.VerifyEmail));
                }
            } else {
                deferred.reject(new Error(Messages.error.loginError));
            }
            return deferred.promise;
        } catch (error) {

        }
    }

    comparePassword(password, businessUser) {
        try {
            var deferred = Q.defer();
            //comparing businessUser Password
            businessUser.comparePassword(password).then(function (isMatch) {
                if (!isMatch) {
                    deferred.reject(new Error(Messages.error.loginError));
                } else {
                    //creating token
                    var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    jwtService.createToken(businessUser, TokenTypes.Authentication, expiryCondition)
                        .then(function (jwtToken) {
                            deferred.resolve({ businessUser: businessUser, token: jwtToken });
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
            delete data.businessUser._doc.password;
            var obj = {
                "businessUserDetails": data.businessUser._doc,
                "token": data.token,
            }
            this.send(res, 200, Messages.error.AuthSuccess, obj);
        } catch (error) {

        }
    }

    forgotPasswordEmailVerification(req, res) {
        try {
            var email = req.body.emailId;

            this.BusinessUser.findOne({ emailId: new RegExp('^' + email + '$', "i"), status: 2 })
                .then(this.isBusinessUserExist.bind(this, res))
                .then(this.sendForgotPasswordEmailLink.bind(this, res))
                .then(this.getForgotPasswordEmailVerificationCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    isBusinessUserExist(res, businessUser) {
        try {
            var deferred = Q.defer();

            if (businessUser) {
                if (businessUser.isEmailVerified) {
                    if (businessUser.status == 1) {
                        deferred.reject(new Error(Messages.error.approvalWaiting));
                    } else if (businessUser.status == 2) {
                        deferred.resolve(businessUser);
                    } else if (businessUser.status == 3) {
                        deferred.reject(new Error(Messages.error.signupRejcted));
                    }
                } else {
                    deferred.reject(new Error(Messages.error.VerifyEmail));
                }
            } else {
                deferred.reject(new Error(Messages.error.InvalidEmailId));
            }

            return deferred.promise;
        } catch (error) {

        }

    }

    // sendForgotPasswordEmailLink(res, businessUser) {
    //     try {
    //         var deferred = Q.defer();
    //         var emailController = new EmailController(this.getFullUrl(res.req));
    //         emailController.sendBusinessUserResetPasswordLink(businessUser);
    //         deferred.resolve(businessUser);
    //         return deferred.promise;
    //     } catch (error) {

    //     }
    // }

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
            businessUser = data.user;
        if (payload && payload.type == TokenTypes.resetPasswordVerification) {
            if (businessUser) {
                this.send(res, 200, "Token verified", businessUser._id);
            }
        }
    }

    setPassword(req, res) {
        try {
            var businessUserDetails = req.body;
            this.BusinessUser.findById(businessUserDetails._id)
                .then(this.saveNewPassword.bind(this, res, businessUserDetails.newPassword))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    resetNewPassword(req, res) {
        try {
            this.reqToken = req.body.token;
            var businessUserDetails = req.body;
            this.BusinessUser.findById(businessUserDetails._id)
                .then(this.resetPasswordLinkVerify.bind(this))
                .then(this.saveNewPassword.bind(this, res, businessUserDetails.newPassword))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    resetPasswordLinkVerify(businessUser) {
        try {
            var deferred = Q.defer();

            if (businessUser) {
                deferred.resolve(businessUser);
            } else {
                deferred.reject(new Error(Messages.error.NotAuthorized));
            }

            return deferred.promise;
        } catch (error) {

        }
    }

    saveNewPassword(res, newPassword, businessUser) {
        try {
            businessUser.password = newPassword;
            if (this.reqToken) {
                businessUser.save()
                    .then(this.commonController.expireVerificationLink.bind(this, res, this.reqToken))
                    .then(this.changePasswordCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            } else {
                businessUser.save()
                    .then(this.changePasswordCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            }
        } catch (error) {

        }
    }

    changePasswordCallback(res) {
        this.send(res, 200, 'Password changed.', null);
    }

    verifyToken(req, res) {
        var token = req.body.token;
        try {
            var that = this;
            this.Token.findOneAndUpdate({ "token": token, type: "EmailVerify", isExpired: false }, { $set: { isExpired: true } }, { new: true })
                .then(this.setEmailTokenVerified.bind(this, res, token))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    setEmailTokenVerified(res, token, data) {
        var that = this;
        if (data) {
            this.BusinessUser.findByIdAndUpdate({ "_id": data._doc.businessUserId }, { $set: { isEmailVerified: true } }, { new: true })
                .then(this.getTokenVerificationCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } else {
            var deferred = Q.defer();
            this.Token.findOne({ token: token }).populate('businessUserId')
                .then(function (data) {
                    if (data) {
                        if (data.isExpired) {
                            deferred.reject({ "message": Messages.error.BusinessUserEmailVerificationTokenExpired, "type": 1, "emailId": data._doc.businessUserId._doc.emailId });
                        }
                    } else {
                        deferred.reject(Messages.error.InvalidToken);
                    }

                })
            return deferred.promise;
        }

    }


    getTokenVerificationCallback(res, data) {
        try {
            if (data) {
                this.send(res, 200, 'done.', []);
            } else {
                this.send(res, 401, Messages.error.tokenExpired, null);
            }
        } catch (error) {
            error
        }
    }

    sendForgotPasswordEmailLink(res, businessUser) {
        try {
            var deferred = Q.defer();
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.sendBusinessUserResetPasswordLink(businessUser);
            deferred.resolve(businessUser);
            return deferred.promise;
        } catch (error) {

        }
    }

    getUpdateRegisteredUserToken(res) {
        this.send(res, 200, 'done.', null);
    }
}

module.exports = businessUserAuthenticateController;
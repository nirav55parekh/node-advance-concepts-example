//include config
var appConfig = require('../config/appconfig');

//include models
var TravellerModel = require('../models/traveller');
var TokenModel = require('../models/token');
var jwtService = require('../services/jwt');

//include controllers
var BaseController = require('./baseController');
var TravellersController = require('./travellersController');

//include enums
var TokenTypes = require('../enum/tokenType');
var Messages = require('../enum/wootravelEnum');

//other libraries
var Q = require('q');
var request = require('request');
const url = require('url');



class authenticateController extends BaseController {

    constructor() {
        super();
        this.Traveller = TravellerModel;
        this.Token = TokenModel;
    }

    checkUserAvailable(req, res) {
        let token = req.headers.authorization;
        var that = this;
        this.Token.aggregate([{
                    $lookup: {
                        from: "travellers",
                        localField: "userId",
                        foreignField: "_id",
                        as: "travellers"
                    }
                },
                { $unwind: "$travellers" },
                { $match: { "token": token, "travellers.isActive": true, "travellers.isDeleted": false } }
            ])
            .then(function(response) {
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
                    .then(function(data) {
                        var payload = data.payload,
                            user = data.user;
                        if (payload && (payload.type == TokenTypes.Authentication || payload.type == TokenTypes.EmailVerification)) {
                            //let tokenExpiry = new Date(payload.exp);
                            //if (tokenExpiry > Date.now()) {
                            //let id = payload.sub;
                            //this.userModel.findOne({ _id: id })
                            //    .then(function (user) {
                            if (user) {
                                req.user = user;
                                next();
                            } else {
                                next(new Error(Messages.error.InvalidToken));
                            }
                            //})
                            //.catch(this.handleError.bind(this, res));
                        } else {
                            next(new Error(Messages.error.InvalidToken));
                        }
                    })
                    .catch(function() {
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

            this.Traveller.findOne({ emailId: new RegExp('^' + emailId + '$', "i"), isDeleted: false })
                .then(this.authenticateCallback.bind(this))
                .then(this.comparePassword.bind(this, password))
                .then(this.authenticationSuccess.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    authenticateCallback(traveller) {
        try {
            var deferred = Q.defer();
            if (traveller && traveller.isDeleted) {
                deferred.reject(new Error(Messages.error.InvalidUser));
            }
            if (traveller && traveller.isActive) {
                if (traveller.isEmailVerified) {
                    deferred.resolve(traveller);
                } else {
                    deferred.reject(new Error(Messages.error.VerifyEmail));
                }
            } else {
                if (traveller && traveller.isActive == false) {
                    if (!traveller.isEmailVerified) {
                        deferred.reject(new Error(Messages.error.VerifyEmail));
                    } else {
                        deferred.reject(new Error(Messages.error.InvalidUser));
                    }
                } else {
                    deferred.reject(new Error(Messages.error.InvalidUser));
                }
            }
            return deferred.promise;
        } catch (error) {

        }
    }

    comparePassword(password, traveller) {
        try {
            var deferred = Q.defer();
            //comparing traveller Password
            traveller.comparePassword(password).then(function(isMatch) {
                if (!isMatch) {
                    deferred.reject(new Error(Messages.error.InvalidUser));
                } else {
                    //creating token
                    var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    jwtService.createToken(traveller, TokenTypes.Authentication, expiryCondition)
                        .then(function(jwtToken) {
                            deferred.resolve({ traveller: traveller, token: jwtToken });
                        })
                        .catch(function() {
                            deferred.reject(new Error(Messages.error.InvalidUser));
                        });
                }
            }.bind(this), function() {
                deferred.reject(new Error(Messages.error.InvalidUser));
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    authenticationSuccess(res, data) {
        try {
            var obj = {
                "travellerId": data.traveller._doc._id,
                "token": data.token,
                "privilege": Messages.type.userType1,
            }
            this.send(res, 200, Messages.error.AuthSuccess, obj);
        } catch (error) {

        }
    }

    verifyEmail(req, res) {
            try {
                let token = req.body.token;
                if (!token) {
                    this.sendBadRequest(res, Messages.error.InvalidToken);
                } else {
                    jwtService.validateToken(token)
                        .then(function(data) {
                            var payload = data.payload,
                                traveller = data.user;
                            if (payload && payload.type == TokenTypes.EmailVerification) {
                                if (traveller) {
                                    if (traveller.isEmailVerified) {
                                        res.redirect(appConfig.appKeys.travellerUrl);
                                    } else {
                                        traveller.isEmailVerified = true;
                                        traveller.isActive = true;
                                        traveller.save()
                                            .then(function(traveller) {
                                                var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
                                                var that = this;
                                                jwtService.createToken(traveller, TokenTypes.Authentication, expiryCondition)
                                                    .then(function(jwtToken) {
                                                        var obj = {
                                                            "travellerId": traveller._doc._id,
                                                            "token": jwtToken,
                                                            "privilege": Messages.type.userType1,
                                                        }
                                                        that.send(res, 200, Messages.error.AuthSuccess, obj);
                                                    })
                                                    .catch(function() {
                                                        deferred.reject(new Error(Messages.error.InvalidUser));
                                                    });

                                            }.bind(this))
                                            .catch(this.handleError.bind(this, res))
                                    }
                                } else {
                                    this.sendBadRequest(res, Messages.error.InvalidToken);
                                }
                            } else {
                                this.sendBadRequest(res, Messages.error.InvalidToken);
                            }
                        }.bind(this))
                        .catch(this.handleError.bind(this, res));
                }
            } catch (error) {

            }
        }
        //End of website Login

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
            traveller = data.user;
        if (payload && payload.type == TokenTypes.resetPasswordVerification) {
            if (traveller) {
                this.send(res, 200, "Token verified", traveller._id);
            }
        }
    }

    //Social App Login code
    verifySocialLoginToken(req, res) {
        try {
            var token = req.body.access_token;
            var socialType = req.body.type;

            if (socialType == 1) {
                this.loginWithGoogle(res, token);
            } else {
                var facebookAppId = req.body.userId
                this.loginWithFacebook(res, token, facebookAppId);
            }

        } catch (error) {

        }
    }

    loginWithGoogle(res, token) {
        try {
            var data = this.verifyFromGoogle(token);

            Promise.all([data]).then(result => {
                this.Traveller.findOne({ emailId: new RegExp('^' + result[0].email + '$', "i") })
                    .then(this.checkSocialTravellerExist.bind(this, res, 1, result, ""))
                    .then(this.authenticateCallback.bind(this))
                    .then(this.generateTokenForSocialLogin.bind(this))
                    .then(this.socialLoginAuthenticationSuccess.bind(this, res, 0))
                    .catch(this.handleError.bind(this, res));
            }, reason => {
                console.log(reason);
            });
        } catch (error) {

        }
    }

    loginWithFacebook(res, token, facebookAppId) {
        try {
            var data = this.verifyFromFacebook(token);

            Promise.all([data]).then(result => {
                if (result[0].error) {
                    return this.send(res, 401, result[0].error.message, null);
                }

                var isVerified = (appConfig.appKeys.facebookAppId == result[0].id) ? true : false;
                if (isVerified) {
                    this.getFacebookUserData(res, token)
                        .then(this.findFacebookUser.bind(this, res, token))
                        .catch(this.handleError.bind(this, res));

                }
            }, reason => {
                console.log(reason);
            });
        } catch (error) {

        }
    }

    findFacebookUser(res, token, fbUser) {
        // this.Traveller.findOne({ emailId: fbUser.email, isActive: true })
        this.Traveller.findOne({ emailId: new RegExp('^' + fbUser.email + '$', "i") })
            // this.Traveller.findOne({ emailId: fbUser.email })
            .then(this.checkSocialTravellerExist.bind(this, res, 2, token, fbUser))
            .then(this.authenticateCallback.bind(this))
            .then(this.generateTokenForSocialLogin.bind(this))
            .then(this.socialLoginAuthenticationSuccess.bind(this, res, 0))
            .catch(this.handleError.bind(this, res));
    }

    verifyFromGoogle(token) {
        try {
            return new Promise((resolve, reject) => {
                request({
                    uri: appConfig.appKeys.googleOathTokenUrl,
                    qs: {
                        id_token: token
                    }
                }, function(error, response, body) {
                    resolve(JSON.parse(body));
                });
            });
        } catch (error) {

        }
    }

    verifyFromFacebook(token) {
        try {
            return new Promise((resolve, reject) => {
                request({
                    uri: appConfig.appKeys.facebookDebugTokenUrl,
                    qs: {
                        access_token: token,
                    }
                }, function(error, response, body) {
                    resolve(JSON.parse(body));
                });
            });
        } catch (error) {

        }
    }

    checkSocialTravellerExist(res, loginType, accessToken, fbUser, traveller) {
        try {
            var deferred = Q.defer();
            if (traveller) {
                if (!traveller._doc.isEmailVerified) {
                    traveller.isEmailVerified = true;
                    traveller.isActive = true;
                    traveller.isSocialLogin = true;
                    traveller.save()
                        .then(function(res) {
                            deferred.resolve(res);
                        }).catch(function(err) {
                            deferred.reject(err);
                        });
                } else {
                    if (traveller.isActive) {
                        deferred.resolve(traveller);
                    } else {
                        deferred.reject(new Error(Messages.error.NotAuthorized));
                    }
                }
            } else {
                if (loginType == 1) {
                    this.createGoogleUser(res, accessToken)
                        .catch(this.handleError.bind(this, res));
                } else {
                    this.createFacebookUser(res, fbUser);
                    deferred.reject(null);
                }
            }
            return deferred.promise;
        } catch (error) {

        }
    }


    createGoogleUser(res, result) {
        try {
            var deferred = Q.defer();

            var profileData = result[0];
            var newTraveller = new this.Traveller({
                emailId: profileData.email,
                fullName: profileData.name,
                isSocialLogin: true,
                gender: null,
                isEmailVerified: profileData.email_verified,
                cityId: null,
                countryId: null,
                stateId: null,
                address: null,
                zipcode: null,
                isActive: true
            });

            newTraveller.save()
                .then(this.generateTokenForSocialLogin.bind(this))
                .then(this.socialLoginAuthenticationSuccess.bind(this, res, 1))
                .catch(this.handleError.bind(this, res));

            return deferred.promise;
        } catch (error) {

        }
    }

    getFacebookUserData(res, accessToken) {
        try {
            var deferred = Q.defer();
            request({
                uri: appConfig.appKeys.getFacebookUserProfile,
                qs: {
                    "access_token": accessToken,
                    "debug": "all",
                    "fields": "id,name,email,gender",
                    "format": "json",
                    "method": "get",
                    "pretty": 0,
                    "suppress_http_code": 1
                }
            }, function(error, response, body) {
                deferred.resolve(JSON.parse(body));
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    createFacebookUser(res, result) {
        try {
            var profileData = result;
            var newTraveller = new this.Traveller({
                emailId: profileData.email,
                fbUserId: profileData.id,
                fullName: profileData.name,
                gender: (profileData.gender.toLowerCase() === "male") ? 1 : 2,
                isEmailVerified: true,
                isSocialLogin: true,
                cityId: null,
                countryId: null,
                stateId: null,
                address: null,
                zipcode: null,
                isActive: true
            });

            newTraveller.save()
                .then(this.generateTokenForSocialLogin.bind(this))
                .then(this.socialLoginAuthenticationSuccess.bind(this, res, 1))
                .catch(this.handleError.bind(this, res));

        } catch (error) {

        }
    }

    generateTokenForSocialLogin(traveller) {
        try {
            var deferred = Q.defer();
            //comparing traveller Password
            var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
            jwtService.createToken(traveller, TokenTypes.Authentication, expiryCondition)
                .then(function(jwtToken) {
                    deferred.resolve({ traveller: traveller, token: jwtToken });
                })
                .catch(function() {
                    deferred.reject(new Error(Messages.error.InvalidUser));
                });

            return deferred.promise;
        } catch (error) {

        }
    }

    socialLoginAuthenticationSuccess(res, newUser, data) {
            try {
                var obj = {
                    "travellerId": data.traveller._doc._id,
                    "token": data.token,
                    "privilege": Messages.type.userType1,
                    "needProfileDetails": (newUser == 1) ? true : false,
                    "setPassword": (data.traveller._doc.password) ? false : true
                }
                this.send(res, 200, Messages.error.AuthSuccess, obj);
            } catch (error) {

            }
        }
        //End of social Login

    logout(req, res) {
        let token = req.headers.authorization;
        this.Token.findOneAndUpdate({ "token": token }, { $set: { "isExpired": true } }, { upsert: true, new: true })
            .then(this.logoutCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    logoutCallback(res, data) {
        this.send(res, 200, "", "");
    }
}

module.exports = authenticateController;
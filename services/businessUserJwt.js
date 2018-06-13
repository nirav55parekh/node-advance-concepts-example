var crypto = require('crypto');
var jwt = require('jwt-simple');
var config = require('../config/index');
var TokenModel = require('../models/token');
var Messages = require('../enum/wootravelEnum');
var mongoose = require('mongoose');
var Q = require('q');

function sign(str, key) {
    return crypto.createHmac('SHA256', key).update(str).digest('base64');
}

function base64Encode(str) {
    return new Buffer(str).toString('base64');
}

function base64Decode(str) {
    return new Buffer(str, 'base64').toString();
}

var verify = function (raw, secret, signature) {
    return (sign(raw, secret) === signature);
};

var encode = function (payload, secret) {
    let algorithm = 'HS256';
    let header = {
        typ: 'JWT',
        alg: algorithm
    };

    let jwt = base64Encode(JSON.stringify(header)) + '.' + base64Encode(JSON.stringify(payload));
    return jwt + '.' + sign(jwt, secret);
};

var decode = function (token, secret) {
    let segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('Invalid token');
    }
    var header = JSON.parse(base64Decode(segments[0]));
    var payload = JSON.parse(base64Decode(segments[1]));

    var raw = segments[0] + '.' + segments[1];
    if (!verify(raw, secret, segments[2])) {
        throw new Error('Verification failed.');
    }
    return payload;
};

var createToken = function (user, tokenType, expireTime) {

    let payload = {
        iss: 'rishabh software',
        sub: user._id,
        exp: expireTime, //24 hr,
        //"type": tokenType
    };
    var jwtToken = jwt.encode(payload, config.secrets.token);
var deferred = Q.defer();
    //saving token to token schema
    TokenModel.updateMany({ "businessUserId": mongoose.Types.ObjectId(user.id), "type": tokenType }, { "isExpired": "true" })
        .then(function (response) {
            
            var newToken = new TokenModel({
                token: jwtToken,
                type: tokenType,
                businessUserId: user.id,
                isExpired: false
            });
            newToken.save()
                .then(function (data) {
                    deferred.resolve(jwtToken);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
            
        })

return deferred.promise;

    //return jwtToken;
};

var validateToken = function (token) {
    var deferred = Q.defer();
    try {
        let payload = jwt.decode(token, config.secrets.token);
        let hourDiff = new Date(Date.now()) - new Date(payload.exp);
        var diffMins = Math.round(hourDiff / 60000);
        //check in token schema for token availability and is expire

        TokenModel.findOne({ token: token }).populate('businessUserId')
            .then(function (data) {
                if (diffMins <= 0) {
                    if (data) {
                        payload.type = data.type;
                        if (data.isExpired && payload.type === "EmailVerify") {
                            deferred.reject({ "message": Messages.error.BusinessUserEmailVerificationTokenExpired, "type": 1, "emailId": data._doc.businessUserId._doc.emailId });
                        }
                        if (data.isExpired && payload.type === "resetPasswordVerification") {
                            deferred.reject({ "message": Messages.error.resetPasswrodLinkExpired, "type": 1, "emailId": data._doc.businessUserId._doc.emailId });
                        } else {
                            if (data) {
                                payload.type = data.type;
                                if (payload.type === "EmailVerify" || payload.type === "resetPasswordVerification") {
                                    if (diffMins >= 0 || payload.type === "EmailVerify") {
                                        data.isExpired = true;
                                    }
                                    data.save();
                                }
                                deferred.resolve({ user: data.businessUserId, payload: payload });
                            } else {
                                deferred.reject({ "message": Messages.error.tokenExpired, "type": 1, "emailId": data._doc.businessUserId._doc.emailId });
                            }
                        }
                    } else {
                        deferred.reject(Messages.error.InvalidToken);
                    }
                } else {
                    if (payload.type === "EmailVerify") {
                        deferred.reject({ "message": Messages.error.BusinessUserEmailVerificationTokenExpired, "type": 1, "emailId": data._doc.businessUserId._doc.emailId });
                    }
                    deferred.reject({ "message": Messages.error.tokenExpired, "type": 1, "emailId": data._doc.businessUserId._doc.emailId });
                }
            })

        //return payload;
    } catch (err) {
        deferred.reject(new Error(Messages.error.tokenExpired));
    }
    return deferred.promise;
};

module.exports = {
    encode: encode,
    decode: decode,
    createToken: createToken,
    validateToken: validateToken
};
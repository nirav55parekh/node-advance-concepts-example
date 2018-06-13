//include config
var appConfig = require('../../config/appconfig');

//include models
var BusinessUserModel = require('../../models/businessUser');
var TravellerModel = require('../../models/traveller');
var CampaignModel = require('../../models/campaign');
var TokenModel = require('../../models/token');
var attractionTransactionModel = require('../../models/attractionTransactionModel');
var travelerTripModel = require('../../models/travelerTripModel');
var jwtService = require('../../services/businessUserJwt');

//include controllers
var BaseController = require('./../baseController');
var EmailController = require('./../emailController');
var CommonController = require('./../commonServicesController');
var mongoose = require('mongoose');

//include enums
var TokenTypes = require('../../enum/tokenType');
var Messages = require('../../enum/wootravelEnum');

//other libraries
var Q = require('q');
var request = require('request');
const url = require('url');

var ObjectId = require('mongodb').ObjectId;



class businessUsersController extends BaseController {

    constructor() {
        super();
        this.Token = TokenModel;
        this.BusinessUser = BusinessUserModel;
        this.attractionTransactionModel = attractionTransactionModel;
        this.TravellerModel = TravellerModel;
        this.Campaign = CampaignModel;
        this.travelerTripModel = travelerTripModel;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    list(req, res) {

        var search = req.body;
        var conditions = this.commonController.getSearchConditions(search);
        conditions.isEmailVerified = true;
        conditions.isDelete = false;

        var that = this;

        var aggregate = this.BusinessUser.aggregate();
        aggregate.
            match(conditions)
            .lookup({ from: "countries", localField: "countryId", foreignField: "countryId", as: "busisnessUserCountry" })
            .lookup({ from: "states", localField: "stateId", foreignField: "stateId", as: "busisnessUserState" })
            .lookup({ from: "cities", localField: "cityId", foreignField: "cityId", as: "busisnessUserCity" })
            .project({
                "id": "$_id",
                "companyName": "$companyName",
                "companyAnnualRevenueCurrency": "$companyAnnualRevenueCurrency",
                "companyAnnualRevenue": "$companyAnnualRevenue",
                "contactPersonName": "$contactPersonName",
                "emailId": "$emailId",
                "contactNo": "$contactNo",
                "status": "$status",
                "countryId": "$countryId",
                "isActive": "$isActive",
                "country": {
                    $arrayElemAt: [
                        "$busisnessUserCountry.name",
                        0
                    ]
                }
            }).sort({ "status": 1 });

        this.BusinessUser.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
            function (err, results, pageCount, count) {
                var those = that;
                that.BusinessUser.find({ status: 1, isEmailVerified: true, isDelete: false }).count()
                    .then(function (response) {
                        var pendingUsers = response;
                        those.listCallBack(res, results, pendingUsers, search, pageCount, count);
                    })

            });
    }
    deleteBusinessUser(req, res) {
        var buDetail = req.body;
        var that = this;
        this.attractionTransactionModel.updateMany({businessUserId:buDetail.businessUserId},
            { $set:
                {
                  "associationStatus" : 4,
                   "businessUserId":null
                }
            }).then(function (result){                
                that.Campaign.updateMany({businessUserId:buDetail.businessUserId},
                    {
                        $set:
                        {
                            "businessUserId":null
                        }})
            }).then(this.deleteBusinessUserCallBack.bind(this, res, buDetail))                        
            .catch (function (error){
                this.handleError.bind(this, res)
            })
    }
    deleteBusinessUserCallBack(res, postData, data) {
        var _this = this;
        this.BusinessUser.findOneAndUpdate({ "_id": postData.businessUserId }, { $set: { isDelete: postData.isDelete } }, { new: true })
            .then(function (callback) {
                var mailObj = {
                    businessUserName: callback._doc.contactPersonName,
                    businessUserEmail: callback._doc.emailId,
                }
                var emailController = new EmailController(_this.getFullUrl(res.req));
                emailController.businessUserDeleteNotify(mailObj);
            }) .then(this.deleteCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    } 
    deleteCallback(res, responseData) {
        this.send(res, 200, "Business User Deleted Successfully", responseData);
    }

    mailSentToAllTravelers(res, postData, wootData, responseData) {
        var deferred = Q.defer();
        var emailController = new EmailController(this.getFullUrl(res.req));
        emailController.sendAttractionListToTravelers(responseData);
        deferred.resolve(responseData);
        return deferred.promise;
    }

    prepareMailData(res, postData, wootData, responseData) {
        var deferred = Q.defer();
        var tempArr = [];
        var masterAttracionArray = [];
        var masterAttracionObj = {};
        var index = '';
        responseData.forEach(function (travelerData) {
            var attractionNameArray = [];
            travelerData.attracionArray.forEach(function (attraction) {
                var array = wootData.wootArray
                index = array.findIndex(x => x.attractionId == attraction);
                attractionNameArray.push(wootData.wootArray[index].AttractionMasterData.attractionName);
            });
            masterAttracionObj = {
                attractionName: attractionNameArray,
                emailId: travelerData.emailId,
                fullName: travelerData.fullName
            }
            masterAttracionArray.push(masterAttracionObj);
        });
        deferred.resolve(masterAttracionArray);
        return deferred.promise;
    }

    getTravelerDetails(res, postData, wootData, responseData) {
        var deferred = Q.defer();
        var masterObj = {};
        var masterArray = [];
        var travelerIds = [];
        // var _this = this;

        responseData.forEach(function (travelerData) {
            travelerIds.push(mongoose.Types.ObjectId(travelerData.tevalerId));
        });

        this.TravellerModel.find({
            "_id": {
                "$in": travelerIds
            }
        })
            .then(function (callback) {
                callback.forEach(function (travelerDataCallback) {
                    responseData.forEach(function (travelerData) {
                        masterObj = {};

                        if (travelerData.tevalerId === travelerDataCallback._doc._id.toString()) {
                            masterObj = {
                                attracionArray: travelerData.attracionArray,
                                emailId: travelerDataCallback._doc.emailId,
                                fullName: travelerDataCallback._doc.fullName
                            }
                            masterArray.push(masterObj);
                        }
                    });
                });
                deferred.resolve(masterArray);
            })
            .catch(function (error) {
                error
            })
        return deferred.promise;
    }

    checkAllTravelerAndAttractionId(res, postData, wootData, responseData) {
        var deferred = Q.defer();
        var travelerIdArray = [];
        var travelerMasterArray = [];
        // travelerIdArray.travelerAttractionId = [];

        responseData.forEach(function (travelerData) {
            if (travelerIdArray.indexOf(travelerData.travelerId) === -1) {

                if (travelerData.travelerId != undefined) {
                    travelerIdArray.push(travelerData.travelerId);
                }
            }
        });

        travelerIdArray.forEach(function (travelerId, index) {
            var tempArr = [];
            responseData.forEach(function (travelerData) {
                if (travelerData.travelerId === travelerId) {
                    if (tempArr.indexOf(travelerData.tripSummery.tripMainEvents.attractionList.attractionId) === -1) {
                        tempArr.push(travelerData.tripSummery.tripMainEvents.attractionList.attractionId);
                    }
                }
            });
            var travelerObj = {
                tevalerId: travelerId,
                attracionArray: tempArr
            }
            travelerMasterArray.push(travelerObj);
        });

        deferred.resolve(travelerMasterArray);

        return deferred.promise;
    }

    changeProfileStatus(req, res) {
        var businessUserTransectionDetails = req.body.data.isActive;
        var businessDetails = req.body.data;

        this.BusinessUser.findOneAndUpdate({ "_id": businessDetails._id }, { $set: businessDetails }, { new: true })
            .then(this.updateBusinessTransectionDetails.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    updateBusinessTransectionDetails(res, data) {
        this.send(res, 200, "Profile Status has been Changed", data);
    }

    /**
     * attracion data callback 
     */
    listCallBack(res, results, pendingUsers, search, pageCount, count) {
        var listData = {
            list: results,
            pendingUsers: pendingUsers,
            page: parseInt(search.page),
            records: count,
            total: Math.ceil(count / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' business users', listData);
    }

    getBusinessUserDetails(req, res) {
        var businessUserId = req.query.businessUserId;

        this.BusinessUser.aggregate([{
            $match: {
                "_id": new ObjectId(businessUserId),
            }
        },
        {
            $lookup: {
                from: "countries",
                localField: "countryId",
                foreignField: "countryId",
                as: "busineeUserCountry"
            }
        },
        {
            $lookup: {
                from: "states",
                localField: "stateId",
                foreignField: "stateId",
                as: "busineeUserState"
            }
        },
        {
            $lookup: {
                from: "cities",
                localField: "cityId",
                foreignField: "cityId",
                as: "busineeUserCity"
            }
        }
        ])
            .then(this.getBusinessUserDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getBusinessUserDetailsCallback(res, businessUserDetails) {
        delete businessUserDetails[0].password;
        if (businessUserDetails)
            this.send(res, 200, 'Business User details found', businessUserDetails);
        else
            this.send(res, 404, "No Business User details found", null);
    }

    addOrUpdate(req, res) {
        var businessUserDetails = req.body.data;
        var reason = "";

        if (businessUserDetails._id) {
            if ("reason" in req.body) {
                reason = req.body.reason;
                // businessUserDetails.isEmailVerified = false;
            }

            if (businessUserDetails.status == 1) {
                businessUserDetails.countryId = (typeof (businessUserDetails.countryId) == "object") ? businessUserDetails.countryId.countryId : businessUserDetails.countryId;
                businessUserDetails.stateId = (businessUserDetails.stateId  && typeof (businessUserDetails.stateId) == "object") ? businessUserDetails.stateId.stateId : businessUserDetails.stateId;
                businessUserDetails.cityId = (typeof (businessUserDetails.cityId) == "object") ? businessUserDetails.cityId.cityId : businessUserDetails.cityId;

                this.BusinessUser.findOneAndUpdate({ _id: businessUserDetails._id }, businessUserDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                    .then(this.sendEmailVerificationCallback.bind(this, res))
                    .then(this.registeredBusinessUserCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            } else {
                this.BusinessUser.findOneAndUpdate({ _id: businessUserDetails._id }, businessUserDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                    .then(this.addOrUpdateCallback.bind(this, res, reason))
                    .catch(this.handleError.bind(this, res));
            }
        } else {
            businessUserDetails.countryId = businessUserDetails.countryId.countryId;
            businessUserDetails.stateId = (businessUserDetails.stateId) ? businessUserDetails.stateId.stateId : null;
            businessUserDetails.cityId = businessUserDetails.cityId.cityId;
            var businessUser = new this.BusinessUser(businessUserDetails);
            businessUser.save()
                .then(this.sendEmailVerificationCallback.bind(this, res))
                .then(this.registeredBusinessUserCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        }
    }

    addOrUpdateCallback(res, reason, data) {
        try {
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.sendBusinessUserApproveReject(data, reason);
            this.send(res, 200, "Business User details updated", data);
        } catch (error) {

        }
    }

    updateProfile(req, res) {
        var businessUserDetails = req.body.data;
        var oldEmailId = businessUserDetails.oldEmailId;
        if (businessUserDetails.emailId !== oldEmailId) {
            businessUserDetails.isEmailVerified = false;
        }

        businessUserDetails.countryId = (typeof (businessUserDetails.countryId) == "object") ? businessUserDetails.countryId.countryId : businessUserDetails.countryId;
        businessUserDetails.stateId = (businessUserDetails.stateId  && typeof (businessUserDetails.stateId) == "object") ? businessUserDetails.stateId.stateId : businessUserDetails.stateId;
        businessUserDetails.cityId = (typeof (businessUserDetails.cityId) == "object") ? businessUserDetails.cityId.cityId : businessUserDetails.cityId;

        this.BusinessUser.findOneAndUpdate({ _id: businessUserDetails._id }, businessUserDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.sendUpdatedEmailVerificationCallback.bind(this, res, oldEmailId))
            .then(this.getUpdateBusinessUserProfileCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    sendUpdatedEmailVerificationCallback(res, oldEmailId, data) {
        //send Verification mail to traveller.
        try {
            if (oldEmailId !== data._doc.emailId) {
                var emailController = new EmailController(this.getFullUrl(res.req));
                emailController.sendBusinessUserEmailUpdatedVerification(data, oldEmailId);
            }
            return data;
        } catch (error) {

        }
    }

    getUpdateBusinessUserProfileCallback(res, data) {
        this.send(res, 200, ' Information Updated Successfully', data);
    }

    checkEmailAddressExist(req, res) {

        var email = req.body.email;
        this.BusinessUser.findOne({ emailId: new RegExp('^' + email + '$', "i"), isEmailVerified: false }, { upsert: true, new: true })
            .then(this.isBusinessUserExist.bind(this, res))
            .then(this.checkEmailAddressExistCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    isBusinessUserExist(res, businessUser) {
        try {
            var deferred = Q.defer();

            if (businessUser) {
                deferred.resolve(businessUser);
            } else {
                deferred.reject(new Error(Messages.error.InvalidEmailId));
            }

            return deferred.promise;
        } catch (error) {

        }

    }

    checkEmailAddressExistCallback(res, data) {
        this.send(res, 200, "Email ID already exist and waiting for the user verification", data);
    }

    resendVerificationLink(req, res) {
        try {
            var email = req.body.email;
            this.BusinessUser.findOne({ emailId: new RegExp('^' + email + '$', "i") })
                .then(this.isBusinessUserExist.bind(this, res))
                .then(this.sendEmailVerificationCallback.bind(this, res))
                .then(this.updateRegisteredBusinessUserToken.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    updateRegisteredBusinessUserToken(res, data) {
        try {
            var deferred = Q.defer();
            this.Token.findOneAndUpdate({ businessUserId: data._id, type: "EmailVerify" }, { $set: { isExpired: true } }, { new: true })
                .then(this.resendVerificationLinkCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));

            return deferred.promise;
        } catch (error) {

        }
    }

    resendVerificationLinkCallback(res, data) {
        this.send(res, 200, 'Email verification url sent.', "");
    }

    /**
     *sendEmailVerificationCallback function
     */
    sendEmailVerificationCallback(res, data) {
        //send Verification mail to business user.
        try {
            var emailController = new EmailController(this.getFullUrl(res.req));
            return emailController.sendBusinessUserVerification(data);
        } catch (error) {

        }
    }

    registeredBusinessUserCallback(res, data) {
        this.send(res, 200, 'Email verification url sent.', "");
    }

    changePassword(req, res) {
        try {
            var businessUserDetails = req.body.data;
            this.BusinessUser.findById(businessUserDetails._id)
                .then(this.compareWithOldPassword.bind(this, res, businessUserDetails.oldPassword, businessUserDetails.newPassword))
                .then(this.saveChangedPassword.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    changePasswordCallback(res) {
        this.send(res, 200, 'Password changed.', null);
    }

    compareWithOldPassword(res, oldPassword, newPassword, businessUser) {
        try {
            var deferred = Q.defer();
            businessUser.comparePassword(oldPassword)
                .then(function (isMatch) {
                    if (!isMatch) {
                        deferred.reject(new Error(Messages.error.oldPasswordMatch));
                    } else {
                        if (oldPassword === newPassword) {
                            deferred.reject(new Error(Messages.error.oldNewPasswordMatch));
                        } else {
                            businessUser.password = newPassword;
                            deferred.resolve(businessUser);
                        }
                    }
                });

            return deferred.promise;
        } catch (error) {

        }

    }

    saveChangedPassword(res, businessUser) {
        try {
            businessUser.save()
                .then(this.changePasswordCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }
}

module.exports = businessUsersController;
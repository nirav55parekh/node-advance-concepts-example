var mongoose = require('mongoose');

// models
var attractionMasterModel = require('../../models/attractionMasterModel');
var attractionTransactionModel = require('../../models/attractionTransactionModel');
var BusinessUserModel = require('../../models/businessUser');
var TravellerModel = require('../../models/traveller');
var roleModel = require('../../models/role');
var multer = require('multer');
var fs = require('fs-extra');
var path = require('path');
var mv = require('mv');
var Q = require('q');
var _ = require('lodash');


//controllers
var BaseController = require('../baseController');
var CommonController = require('../commonServicesController');
var EmailController = require('../emailController');

//include enums
var Messages = require('../../enum/wootravelEnum');


class manageAttractionController extends BaseController {
    constructor() {
        super();
        this.attractionMasterModel = attractionMasterModel;
        this.attractionTransactionModel = attractionTransactionModel;
        this.Traveller = TravellerModel;
        this.BusinessUser = BusinessUserModel;
        this.roleModel = roleModel;
        this.commonController = new CommonController();
        this.isTravellerRelatedChanges = false;
    }

    /**
     * get list of all atttractions
     */
    getAttractionData(req, res) {
        var search = req.body;
        var conditions = {};
        var conditions = this.commonController.getSearchConditions(search);
        var that = this;

        var aggregate = attractionMasterModel.aggregate();
        aggregate.lookup({
            from: "attractionTransaction",
            localField: "attractionId",
            foreignField: "attractionId",
            as: "attrTransactionDetail"
        })
            .match(conditions)
            .project({
                _id: 0,
                attractionId: "$attractionId",
                attractionName: "$attractionName",
                attractionCountry: "$attractionCountry",
                attractionCityName: "$attractionCityName",
                attractionVisitType: {
                    $arrayElemAt: [
                        "$attrTransactionDetail.attractionVisitType",
                        0
                    ]
                },
                associationStatus: {
                    $arrayElemAt: [
                        "$attrTransactionDetail.associationStatus",
                        0
                    ]
                },
                isAttractionActive: {
                    $arrayElemAt: [
                        "$attrTransactionDetail.isAttractionActive",
                        0
                    ]
                },
                source: "$source"
            });

        attractionMasterModel.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
            function (err, results, pageCount, count) {
                that.attractionDataCallBack(res, results, search, pageCount, count);
            });
    }

    /**
     * attracion data callback 
     */
    attractionDataCallBack(res, results, search, pageCount, count) {
        var attractiondata = {
            attractions: results,
            page: parseInt(search.page),
            records: count,
            total: Math.ceil(count / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' attractions', attractiondata);
    }

    /**
     * get attraction detail from attraction master
     */
    getAttractionDetailbyAttractionId(req, res) {
        var attractionId = req.body.attractionId;
        attractionMasterModel.aggregate([{
            $match: {
                "attractionId": attractionId,
            }
        },
        {
            $lookup: {
                from: "attractionTransaction",
                localField: "attractionId",
                foreignField: "attractionId",
                as: "attrTransactionDetail"
            }
        },
        {
            $unwind: {
                path: "$attrTransactionDetail",
                preserveNullAndEmptyArrays: true
            }
        },
        // { $unwind: "$attrTransactionDetail" },
        {
            $lookup: {
                from: "businessUsers",
                localField: "attrTransactionDetail.businessUserId",
                foreignField: "_id",
                as: "businessUser"
            }
        }
        ])
            .then(this.attractionDetailByIdCallBack.bind(this, res))
            .catch(this.handleError.bind(this, res));

    }

    attractionDetailByIdCallBack(res, attractionDetail) {
        if (attractionDetail.length > 0)
            this.send(res, 200, 'attraction details', attractionDetail);
        else
            this.send(res, 404, "No  attraction details found", null);
    }

    getAttractionDataSearch(req, res) {
        try {
            var search = req.params.destSearch;
            var attraction = this.getAttractionDataList(search);

            Promise.all([attraction]).then(result => {
                var data = {};
                data.attraction = result[0];
                this.send(res, 200, '', data);
            }, reason => {
                console.log(reason);
            });
        } catch (error) {

        }
    }

    getAttractionDataList(search) {
        try {
            return new Promise((resolve, reject) => {
                attractionMasterModel.aggregate([
                    { $match: { "attractionName": new RegExp(search, "i") } },
                    {
                        $lookup: {
                            from: "attractionTransaction",
                            localField: "attractionId",
                            foreignField: "attractionId",
                            as: "attrTransactionDetail"
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            attractionId: '$attractionId',
                            attractionName: '$attractionName',
                            attractionCityName: '$attractionCityName',
                            businessUserId: {
                                $arrayElemAt: [
                                    "$attrTransactionDetail.businessUserId",
                                    0
                                ]
                            },
                            isAttractionActive: {
                                $arrayElemAt: [
                                    "$attrTransactionDetail.isAttractionActive",
                                    0
                                ]
                            },
                            associationStatus: {
                                $arrayElemAt: [
                                    "$attrTransactionDetail.associationStatus",
                                    0
                                ]
                            },
                            // custom: '$attractionName' + ' - ' + '$attractionCityName'
                        }
                    },
                ], function (err, res) {
                    resolve(res, "countries");
                });
            });
        } catch (error) {

        }
    }


    checkBeforeAdd(req, res) {
        var attractionName = req.body.attractionName;
        var attractionCityId = req.body.attractionCityId;

        attractionMasterModel.aggregate([
            {
                $lookup: {
                    from: "attractionTransaction",
                    localField: "attractionId",
                    foreignField: "attractionId",
                    as: "attrTransactionDetail"
                }
            },
            { $unwind: "$attrTransactionDetail" },
            {
                $match: {
                    "attractionName": new RegExp(attractionName, "i"),
                    "attractionCityId": attractionCityId
                }
            },
        ])
            .then(this.checkBeforeAddCallBack.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    checkBeforeAddCallBack(res, attractionDetail) {
        this.send(res, 200, 'attraction details', attractionDetail);
    }

    updateAttractionDetails(req, res) {

        var attractionTransactionsDetails = req.body.data.attrTransactionDetail;
        attractionTransactionsDetails.last_updated = new Date();
        var businessUser = req.body.data.attrTransactionDetail.businessUserName;
        var businessUserId = req.body.data.attrTransactionDetail.businessUserId;
        var businessUseremailId = req.body.data.attrTransactionDetail.businessUseremailId;
        this.isTravellerRelatedChanges = req.body.data.isTravellerRelatedChanges;
        var attractionName = req.body.data.attractionName;
        var mailObj = {
            attractionName: attractionName,
            businessUser: businessUser,
            businessUserId: businessUserId,
            businessUseremailId: businessUseremailId
        }
        var attractionDetails = req.body.data;

        delete attractionDetails.attrTransactionDetail;
        var source = attractionDetails.source;

        if (source === "GOOGLE") {
            this.attractionMasterModel.findOneAndUpdate({ "attractionId": attractionDetails.attractionId }, { $set: attractionDetails }, { new: true })
                .then(this.updateAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails, businessUser))
                .catch(this.handleError.bind(this, res));
        }
        if (source === "WOOTRAVEL") {
            if (attractionDetails.attractionId) {

                if (typeof (attractionDetails.attractionCountry) === "object") {
                    attractionDetails.attractionCountryId = attractionDetails.attractionCountry.countryId;
                    attractionDetails.attractionCountry = attractionDetails.attractionCountry.countryName;
                }

                if (attractionDetails.attractionState && typeof (attractionDetails.attractionState) === "object") {
                    attractionDetails.attractionStateId = attractionDetails.attractionState.stateId;
                    attractionDetails.attractionState = attractionDetails.attractionState.stateName;
                }

                if (typeof (attractionDetails.attractionCityName) === "object") {
                    attractionDetails.attractionCityId = attractionDetails.attractionCityName.cityId;
                    attractionDetails.attractionCityName = attractionDetails.attractionCityName.cityName;
                }

                attractionDetails.address.city = attractionDetails.attractionCityName;
                attractionDetails.address.state = attractionDetails.attractionState;
                attractionDetails.address.country = attractionDetails.attractionCountry;

                this.attractionMasterModel.findOneAndUpdate({ "attractionId": attractionDetails.attractionId }, { $set: attractionDetails }, { new: true })
                    .then(this.updateAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails, businessUser))
                    .catch(this.handleError.bind(this, res));
            } else {

                attractionTransactionsDetails.attractionStatus = 2;
                attractionDetails.attractionCountryId = attractionDetails.attractionCountry.countryId;
                attractionDetails.attractionCountry = attractionDetails.attractionCountry.countryName;
                attractionDetails.attractionStateId = (attractionDetails.attractionState) ? attractionDetails.attractionState.stateId : null;
                attractionDetails.attractionState = (attractionDetails.attractionState) ? attractionDetails.attractionState.stateName : null;
                attractionDetails.attractionCityId = attractionDetails.attractionCityName.cityId;
                attractionDetails.attractionCityName = attractionDetails.attractionCityName.cityName;
                // last_updated

                attractionDetails.address.city = attractionDetails.attractionCityName;
                attractionDetails.address.state = attractionDetails.attractionState;
                attractionDetails.address.country = attractionDetails.attractionCountry;

                var attractionMaster = new this.attractionMasterModel(attractionDetails);
                attractionMaster.save(attractionDetails)
                    .then(this.addAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails, mailObj))
                    .catch(this.handleError.bind(this, res));
            }

        }
    }

    updateAttractionTransactionDetails(res, attractionTransactionsDetails, businessUser, attractionDetails) {
        // var status = attractionTransactionsDetails.associationStatus;

        this.attractionTransactionModel.findOneAndUpdate({ "attractionId": attractionDetails._doc.attractionId }, { $set: attractionTransactionsDetails }, { upsert: true, new: true, setDefaultsOnInsert: true })
            // .then(this.updateAttractionEmail.bind(this, res, attractionTransactionsDetails, businessUser, attractionDetails))
            .then(this.getAllTravellerEmail.bind(this, res, attractionTransactionsDetails, businessUser, attractionDetails))
            .then(this.getAllTravellerEmailPrepareData.bind(this, res, attractionTransactionsDetails, attractionDetails))
            .then(this.getTravellerData.bind(this, res, attractionTransactionsDetails, attractionDetails))
            .then(this.updateAttractionEmailToTraveller.bind(this, res, attractionTransactionsDetails, attractionDetails))
            .then(this.updateAttractionTransactionDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getTravellerData(res, attractionTransactionsDetails, attractionDetails, responce) {

        var tempArray = [];
        responce.forEach(function (entry) {
            var object = mongoose.Types.ObjectId(entry);
            tempArray.push(object);
        });

        try {
            return new Promise((resolve, reject) => {
                this.Traveller.aggregate([
                    { $match: { "_id": { $in: tempArray } } },
                ], function (err, responce) {
                    resolve({ "responce": responce, "attractionTransactionsDetails": attractionTransactionsDetails, "attractionDetails": attractionDetails });
                });
            });
        } catch (error) {

        }
    }

    getAllTravellerEmailPrepareData(res, attractionTransactionsDetails, attractionDetails, responce) {
        var deferred = Q.defer();
        // var tryThis = _.uniqBy(responce['responce'], 'travelerId');
        var result = _.map(_.uniqBy(responce['responce'], 'travelerId'), 'travelerId')
        deferred.resolve(result);
        return deferred.promise;
    }

    updateAttractionEmailToTraveller(res, attractionTransactionsDetails, attractionDetails, travellers) {
        var deferred = Q.defer();
        if (this.isTravellerRelatedChanges) {
            var tempArray = [];
            var travellerArray = travellers['responce'];
            travellerArray.forEach(function (entry) {
                // var object = mongoose.Types.ObjectId(entry);
                tempArray.push({
                    email: entry.emailId,
                    travelerName: entry.fullName,
                });
            });
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.updateAttractionEmailToTraveller(attractionTransactionsDetails, tempArray, attractionDetails._doc);
            deferred.resolve(attractionTransactionsDetails);
        } else {
            deferred.resolve(attractionTransactionsDetails);
        }
        return deferred.promise;
    }

    getAllTravellerEmail(res, attractionTransactionsDetails, businessUser, attractionDetails) {
        try {
            return new Promise((resolve, reject) => {
                this.attractionTransactionModel.aggregate([
                    {
                        $lookup: {
                            from: "saveTrip",
                            localField: "attractionId",
                            foreignField: "tripSummery.tripMainEvents.attractionList.attractionId",
                            as: "tripOwnerDetails"
                        }
                    },
                    // {
                    //     $project: {
                    //         travelerId: "$tripOwnerDetails.travelerId"
                    //     }
                    // },
                    // { $unwind: $tripOwnerDetails },
                    // {
                    //     $lookup: {
                    //         from: "travellers",
                    //         localField: "_id",
                    //         foreignField: "tripOwnerDetails.travelerId",
                    //         as: "traveller"
                    //     }
                    // },
                    // { $match: { "attractionId": attractionTransactionsDetails.attractionId } },
                    { $match: { "attractionId": attractionTransactionsDetails.attractionId } },
                ], function (err, responce) {
                    if (responce.length > 0) {
                        resolve({ "responce": responce[0]['tripOwnerDetails'], "attractionTransactionsDetails": attractionTransactionsDetails, "attractionDetails": attractionDetails });
                    } else {
                        var responce = [];
                        resolve({ "responce": responce, "attractionTransactionsDetails": attractionTransactionsDetails, "attractionDetails": attractionDetails });
                    }
                });
            });
        } catch (error) {

        }
    }

    // updateAttractionEmail(res, attractionTransactionsDetails, businessUser, attractionDetails) {
    //     var deferred = Q.defer();
    //     var emailController = new EmailController(this.getFullUrl(res.req));
    //     emailController.sendUpdateAttractionEmail(attractionTransactionsDetails, businessUser, attractionDetails);
    //     deferred.resolve(attractionTransactionsDetails);
    //     return deferred.promise;
    // }

    updateAttractionTransactionDetailsCallback(res, data) {
        this.send(res, 200, "Attraction Details has been Updated", data);
    }

    // db.getCollection('AttractionMaster').find({"source":{$ne:"GOOGLE"}})
    // db.getCollection('attractionTransaction').find({"attractionId":"WTA-39373"})

    checkBeforeUpdate(req, res) {
        attractionMasterModel.aggregate([
            {
                $match: {
                    "attractionId": { $ne: req.body.attractionId },
                    "attractionName": new RegExp(req.body.attractionName, "i"),
                    "attractionCityId": req.body.attractionCityId
                }
            },
        ])
            .then(this.checkBeforeAddCallBack.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    reportOnAttraction(req, res) {
        var mailObj = req.body;
        this.attractionTransactionModel.find({ "attractionId": req.body.attractionId })
            .then(this.checkAdminEmailDetails.bind(this, res, mailObj))
            .then(this.prepareMailData.bind(this, res))
            .then(this.reportOnAttractionMail.bind(this, res))
            .then(this.reportOnAttractionCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    reportOnAttractionCallback(res, data) {
        this.send(res, 200, "Reported On Attraction Successfully", data);
    }

    reportOnAttractionMail(res, data) {
        var deferred = Q.defer();
        var emailController = new EmailController(this.getFullUrl(res.req));
        emailController.reportOnAttractionMailToAdmin(data.adminEmailArr, data.data);
        emailController.reportOnAttractionMailToUser(data.adminEmailArr, data.data);
        deferred.resolve(data);
        return deferred.promise;
    }

    associateReqForAttraction(req, res) {
        var mailObj = req.body;
        var last_updated = new Date();

        this.attractionMasterModel.findOneAndUpdate({ "attractionId": req.body.attractionId }, { $set: { last_updated: last_updated } }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(function (callback) {

            }).catch(function (error) {

            })

        this.attractionTransactionModel.findOneAndUpdate({ "attractionId": req.body.attractionId }, { $set: { businessUserId: req.body.businessUserId, associationStatus: req.body.associationStatus } }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.checkAdminEmailDetails.bind(this, res, mailObj))
            .then(this.prepareMailData.bind(this, res))
            .then(this.sendMailForAssociationReq.bind(this, res))
            .then(this.addAttractionTransactionDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }


    addAttractionTransactionDetails(res, attractionTransactionsDetails, mailObj, attractionDetails) {
        this.attractionTransactionModel.findOneAndUpdate({ "attractionId": attractionDetails._doc.attractionId }, { $set: attractionTransactionsDetails }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.checkAdminEmailDetails.bind(this, res, mailObj))
            .then(this.prepareMailData.bind(this, res))
            .then(this.sendMailForAssociationReq.bind(this, res))
            .then(this.addAttractionTransactionDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    sendMailForAssociationReq(res, data) {
        var deferred = Q.defer();
        var emailController = new EmailController(this.getFullUrl(res.req));
        emailController.sendMailForAssociationReqEmail(data.adminEmailArr, data.data);
        emailController.sendMailForBusinessUserForConfirmation(data.adminEmailArr, data.data);
        deferred.resolve(data['mainData']._doc);
        return deferred.promise;
    }

    prepareMailData(res, data) {
        var deferred = Q.defer();
        var adminData = data['responce'].role;
        var adminEmailArr = [];
        var businessUserId = data['mailObj'].businessUserId;

        this.BusinessUser.aggregate([
            { $match: { "_id": mongoose.Types.ObjectId(businessUserId) } },
        ], function (err, responce) {
            data['mailObj'].businessUserEmailId = responce[0].emailId;
            data['mailObj'].businessUser = responce[0].contactPersonName;

            adminData.forEach(function (item) {
                adminEmailArr.push(item.emailId);
            })

            deferred.resolve({ "adminEmailArr": adminEmailArr, "data": data['mailObj'], "mainData": data['mainData'] });
        });

        // adminData.forEach(function (item) {
        //     adminEmailArr.push(item.emailId);
        // })

        // deferred.resolve({ "adminEmailArr": adminEmailArr, "data": data['mailObj'], "mainData": data['mainData'] });
        // return deferred.promise;
        return deferred.promise;
    }

    checkAdminEmailDetails(res, mailObj, data) {
        try {
            return new Promise((resolve, reject) => {
                this.roleModel.aggregate([
                    {
                        $lookup: {
                            from: "admins",
                            localField: "_id",
                            foreignField: "roleId",
                            as: "role"
                        }
                    },
                    { $match: { "roleName": "Admin" } },
                ], function (err, responce) {
                    resolve({ "responce": responce[0], "mailObj": mailObj, "mainData": data });
                });
            });
        } catch (error) {

        }
    }

    addAttractionTransactionDetailsCallback(res, data) {
        this.send(res, 200, "Attraction Details has been added", data);
    }

    uploadPhoto(req, res) {

        if (!req.files.file) {
            this.send(res, 200, '', "");
        }
        var file1 = req.files.file.attractionImage;
        var file2 = req.files.file.attractionBannerImage;
        var attrId = req.body.attractionId;
        var oldImages = req.body.oldImages;
        var setImage = { "attractionImage": oldImages.attractionImage, "attractionBannerImage": oldImages.attractionBannerImage };
        if (file1) {
            var tempPath1 = file1.path;
            var imageName = this.generateRandomImageName(attrId + "attractionImage" + file1.name);
            var targetPath1 = path.join(__dirname, "../uploads/" + imageName + path.extname(file1.name));
            var saveName1 = imageName + path.extname(file1.name);
            setImage.attractionImage = saveName1;

            mv(tempPath1, targetPath1, function (err) {
                if (err) {
                    console.log(err);
                } else {

                }
            });

            if (oldImages.attractionImage) {
                fs.remove(path.join(__dirname, "../uploads/" + oldImages.attractionImage), (err) => {
                    if (err) throw err;
                });
            }
        }
        if (file2) {
            var tempPath2 = file2.path;
            var imageName = this.generateRandomImageName(attrId + "attractionBannerImage" + file2.name);
            var targetPath2 = path.join(__dirname, "../uploads/" + imageName + path.extname(file2.name));
            var saveName2 = imageName + path.extname(file2.name);
            setImage.attractionBannerImage = saveName2;

            mv(tempPath2, targetPath2, function (err) {
                if (err) {
                    console.log(err);
                } else {

                }
            });

            if (oldImages.attractionBannerImage) {
                fs.remove(path.join(__dirname, "../uploads/" + oldImages.attractionBannerImage), (err) => {
                    if (err) throw err;
                });
            }
        }


        attractionTransactionModel.findOneAndUpdate({ "attractionId": attrId }, { $set: setImage }, { upsert: true, new: true })
            .then(this.uploadPhotoCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    uploadPhotoCallback(res, data) {
        this.send(res, 200, "", data);
    }

    searchAttractions(req, res) {
        let token = req.headers.authorization;
        var search = req.params.searchAttraction;

        this.attractionMasterModel.aggregate([
            {
                "$lookup": {
                    "from": "attractionTransaction",
                    "localField": "attractionId",
                    "foreignField": "attractionId",
                    "as": "attractionTransaction",
                }
            },
            { "$unwind": "$attractionTransaction" },
            {
                "$lookup": {
                    "from": "Token",
                    "localField": "attractionTransaction.businessUserId",
                    "foreignField": "businessUserId",
                    "as": "Token",
                }
            },
            { "$unwind": "$Token" },
            {
                "$match": {
                    "Token.token": token, "attractionTransaction.associationStatus": 2, "attractionName": new RegExp(search, "i")
                }
            },
            {
                "$project": {
                    "id": "$attractionId",
                    "attractionName": "$attractionName",
                }
            }
        ])
            .then(this.searchAttractionsListCallBack.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    searchAttractionsListCallBack(res, results) {
        this.send(res, 200, 'Found ' + results.length + ' attractions', results);
    }

    generateRandomImageName(chars) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

        for (var i = 0; i < 16; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        var datetime = new Date()
        return text + datetime.getTime();
    }
}

module.exports = manageAttractionController;
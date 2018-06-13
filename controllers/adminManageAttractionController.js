var mongoose = require('mongoose');

// models
var attractionMasterModel = require('../models/attractionMasterModel');
var attractionTransactionModel = require('../models/attractionTransactionModel');
var CampaignModel = require('../models/campaign');
var businessUserModel = require('../models/businessUser');
var TravellerModel = require('../models/traveller');
var multer = require('multer');
var fs = require('fs-extra');
var path = require('path');
var mv = require('mv');
var Q = require('q');
var _ = require('lodash');

//controllers
var BaseController = require('./baseController');
var CommonController = require('./commonServicesController');
var EmailController = require('./emailController');

//include enums
var Messages = require('../enum/wootravelEnum');


class adminManageAttractionController extends BaseController {
    constructor() {
        super();
        this.attractionMasterModel = attractionMasterModel;
        this.attractionTransactionModel = attractionTransactionModel;
        this.businessUser = businessUserModel;
        this.Traveller = TravellerModel;
        this.Campaign = CampaignModel;
        this.isTravellerRelatedChanges = false;
        this.isAttractionUpdated = false;

        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    // getAttractionData(req, res) {
    //     var search = req.body;
    //     var limit = req.body.page * req.body.pgsize;
    //     var Skip = limit - req.body.pgsize;
    //     var conditions = this.commonController.getSearchConditions(search);

    //     var that = this;
    //     var those = that;
    //     that.attractionMasterModel.aggregate(
    //         [{
    //                 $lookup: {
    //                     from: "attractionTransaction",
    //                     localField: "attractionId",
    //                     foreignField: "attractionId",
    //                     as: "attrTransactionDetail"
    //                 }
    //             },
    //             { $match: conditions },
    //             { $group: { _id: null, count: { $sum: 1 } } }
    //         ]
    //     ).then(function(totalAttractions) {
    //         var totalAttractions = (totalAttractions.length) ? totalAttractions[0].count : 0;
    //         that.attractionMasterModel.aggregate([{
    //                 $lookup: {
    //                     from: "attractionTransaction",
    //                     localField: "attractionId",
    //                     foreignField: "attractionId",
    //                     as: "attrTransactionDetail"
    //                 }
    //             },
    //             { $match: conditions },
    //             {
    //                 $unwind: {
    //                     path: "$attrTransactionDetail",
    //                     preserveNullAndEmptyArrays: true
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     _id: 0,
    //                     attractionId: "$attractionId",
    //                     attractionName: "$attractionName",
    //                     attractionCountry: "$attractionCountry",
    //                     attractionCityName: "$attractionCityName",
    //                     attractionVisitType: "$attrTransactionDetail.attractionVisitType",
    //                     associationStatus: { $ifNull: ["$attrTransactionDetail.associationStatus", "null"] },
    //                     isAttractionActive: "$attrTransactionDetail.isAttractionActive",
    //                     source: "$source",
    //                     addedBy: "$attrTransactionDetail.addedBy"
    //                 }
    //             },
    //             { "$sort": { "associationStatus": 1 } },
    //             { "$limit": limit },
    //             { "$skip": Skip },
    //         ]).then(function(results) {
    //             var those = that;
    //             that.attractionMasterModel.aggregate([{
    //                         $lookup: {
    //                             from: "attractionTransaction",
    //                             localField: "attractionId",
    //                             foreignField: "attractionId",
    //                             as: "attrTransactionDetail"
    //                         }
    //                     },
    //                     {
    //                         $unwind: {
    //                             path: "$attrTransactionDetail",
    //                             preserveNullAndEmptyArrays: true
    //                         }
    //                     },
    //                     { $match: { "attrTransactionDetail.associationStatus": 1 } },
    //                     { $project: { "_id": "$_id" } }
    //                 ])
    //                 .then(function(response) {
    //                     var pendingApprovals = response.length;
    //                     those.attractionDataCallBack(res, results, totalAttractions, pendingApprovals, search);
    //                 });
    //         })
    //     })
    // }

    getAttractionData(req, res) {
        var search = req.body;
        var limit = req.body.page * req.body.pgsize;
        var Skip = limit - req.body.pgsize;
        var conditions = this.commonController.getSearchConditions(search);
        var isTransactionQuery = conditions.isTransactionQuery;
        delete conditions.isTransactionQuery;
        var that = this;
        var those = that;

        // that.attractionMasterModel.find(conditions).count().then(function(totalAttractions) {
        //console.log(totalAttractions);


        if (!isTransactionQuery) {
            that.attractionMasterModel.aggregate(
                [
                    { $match: conditions },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ]
            ).then(function(totalAttractions) {
                var totalAttractions = (totalAttractions.length) ? totalAttractions[0].count : 0;
                that.attractionMasterModel.aggregate([{
                            $lookup: {
                                from: "attractionTransaction",
                                localField: "attractionId",
                                foreignField: "attractionId",
                                as: "attrTransactionDetail"
                            }
                        },
                        { $match: conditions },
                        {
                            $unwind: {
                                path: "$attrTransactionDetail",
                                preserveNullAndEmptyArrays: true
                            }
                        },

                        {
                            $project: {
                                _id: 0,
                                attractionId: "$attractionId",
                                attractionName: "$attractionName",
                                attractionCountry: "$attractionCountry",
                                attractionCityName: "$attractionCityName",
                                attractionVisitType: "$attrTransactionDetail.attractionVisitType",
                                associationStatus: { $ifNull: ["$attrTransactionDetail.associationStatus", "null"] },
                                isAttractionActive: "$attrTransactionDetail.isAttractionActive",
                                source: "$source",
                                addedBy: "$attrTransactionDetail.addedBy"
                            }
                        },
                        //  { "$sort": { "associationStatus": 1, "date_created": -1 } },
                        { "$limit": limit },
                        { "$skip": Skip },
                    ]).then(function(results) {
                        //  console.log(results);
                        // var pendingApprovals = response.length;
                        //those.attractionDataCallBack(res, results, pendingApprovals, search, pageCount, count);
                        those.attractionDataCallBack(res, results, search, totalAttractions);
                    })
                    // var pendingApprovals = response.length;
                    //those.attractionDataCallBack(res, results, pendingApprovals, search, pageCount, count);
                    //those.attractionDataCallBack(res, results, search);

            })
        } else {
            that.attractionMasterModel.aggregate(
                [{
                        $lookup: {
                            from: "attractionTransaction",
                            localField: "attractionId",
                            foreignField: "attractionId",
                            as: "attrTransactionDetail"
                        }
                    },
                    { $match: conditions },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ]
            ).then(function(totalAttractions) {
                var totalAttractions = (totalAttractions.length) ? totalAttractions[0].count : 0;
                that.attractionMasterModel.aggregate([{
                            $lookup: {
                                from: "attractionTransaction",
                                localField: "attractionId",
                                foreignField: "attractionId",
                                as: "attrTransactionDetail"
                            }
                        },
                        { $match: conditions },
                        {
                            $unwind: {
                                path: "$attrTransactionDetail",
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                attractionId: "$attractionId",
                                attractionName: "$attractionName",
                                attractionCountry: "$attractionCountry",
                                attractionCityName: "$attractionCityName",
                                attractionVisitType: "$attrTransactionDetail.attractionVisitType",
                                associationStatus: { $ifNull: ["$attrTransactionDetail.associationStatus", "null"] },
                                isAttractionActive: "$attrTransactionDetail.isAttractionActive",
                                source: "$source",
                                addedBy: "$attrTransactionDetail.addedBy"
                            }
                        },
                        //   { "$sort": { "associationStatus": 1, "date_created": -1 } },
                        { "$limit": limit },
                        { "$skip": Skip },
                    ]).then(function(results) {
                        //  console.log(results);
                        // var pendingApprovals = response.length;
                        //those.attractionDataCallBack(res, results, pendingApprovals, search, pageCount, count);
                        those.attractionDataCallBack(res, results, search, totalAttractions);
                    })
                    // var pendingApprovals = response.length;
                    //those.attractionDataCallBack(res, results, pendingApprovals, search, pageCount, count);
                    //those.attractionDataCallBack(res, results, search);

            })
        }


    }

    /**
     * attracion data callback 
     */
    attractionDataCallBack(res, results, search, totalAttractions) {
        var attractiondata = {
            attractions: results,
            pendingApprovals: 0, //pendingApprovals,
            page: parseInt(search.page),
            records: totalAttractions,
            total: Math.ceil(totalAttractions / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' attractions', attractiondata);
    }

    getAttractionDetailbyId(req, res) {
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
                {
                    $lookup: {
                        from: "businessUsers",
                        localField: "attrTransactionDetail.businessUserId",
                        foreignField: "_id",
                        as: "attrTransactionDetail.businessUser",
                    }
                },
            ])
            .then(this.attractionByIdCallBack.bind(this, res))
            .catch(this.handleError.bind(this, res));

    }
    attractionByIdCallBack(res, attractionDetail) {
        if (attractionDetail.length > 0)
            this.send(res, 200, 'attraction details', attractionDetail);
        else
            this.send(res, 404, "No  attraction details found", null);
    }

    /**
     * get attraction detail from attraction master
     */
    getAttractionDetailbyAttractionId(req, res) {
        var attractionId = req.body.attractionId;
        var campaignDate = null;
        if ("startDate" in req.body) {
            campaignDate = {
                "startDate": req.body.startDate,
                "endDate": req.body.endDate,
            };
        }


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
                {
                    $lookup: {
                        from: "businessUsers",
                        localField: "attrTransactionDetail.businessUserId",
                        foreignField: "_id",
                        as: "attrTransactionDetail.businessUser",
                    }
                },
                {
                    $project: {
                        "attractionId": "$attractionId",
                        "attractionName": "$attractionName",
                        "coords": "$coords",
                        "visitTime": "$visitTime",
                        "address": "$address",
                        "attractioncategory": "$attractioncategory",
                        "attrTransactionDetail.attractionBannerImage": "$attrTransactionDetail.attractionBannerImage",
                        "attractionCityId": "$attractionCityId",
                        "attrTransactionDetail.attractionDescription": "$attrTransactionDetail.attractionDescription",
                        "attrTransactionDetail.attractionVisitDuration": "$attrTransactionDetail.attractionVisitDuration",
                        "attrTransactionDetail.attractionVisitType": "$attrTransactionDetail.attractionVisitType",
                        "attractioncontactNumber": "$attractioncontactNumber",
                        "attrTransactionDetail.attractionVisitFee": "$attrTransactionDetail.attractionVisitFee",
                        "attrTransactionDetail.attractionEmailAddress": "$attrTransactionDetail.attractionEmailAddress",
                        "attrTransactionDetail.attractionVisitFeeCurrency": "$attrTransactionDetail.attractionVisitFeeCurrency",
                    }
                }
            ])
            .then(this.attractionDetailByIdCallBack.bind(this, res, campaignDate))
            .catch(this.handleError.bind(this, res));

    }
    attractionDetailByIdCallBack(res, campaignDate, attractionDetail) {
        if (attractionDetail.length > 0) {
            var formatedVisitTimeArray = this.commonController.formatVisitTime(attractionDetail[0].visitTime, this);
            // var formatedVisitTime = {};
            // var dayarray = [];
            // var openDays = [];
            // var daysNo = [0, 1, 2, 3, 4, 5, 6];
            // var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            // var closeDays;
            // attractionDetail[0].visitTime.forEach(function (daytime) {
            //     var day, dayName, open = 0,
            //         close = 0,
            //         alwaysOpen = false;

            //     if (daytime.open != undefined && daytime.close != undefined) {
            //         day = daytime.open.day;
            //         openDays.push(day);
            //         dayName = weekDays[day];
            //         open = daytime.open.time.toString();
            //         open = this.commonController.formatOpenCloseTime(open);
            //     }
            //     if (daytime.close != undefined) {
            //         close = daytime.close.time.toString();
            //         close = this.commonController.formatOpenCloseTime(close)
            //     } else {
            //         alwaysOpen = true;
            //     }

            //     var displayHours = (alwaysOpen == true ? 'Open 24 Hours' : open + ' - ' + close);
            //     dayarray.push({
            //         'day': day,
            //         'dayName': dayName,
            //         'displayHours': displayHours,
            //         'open': open,
            //         'close': close,
            //         'alwaysOpen': alwaysOpen,
            //         'isClose': false
            //     });
            // }, this);

            // if (openDays.length > 0) {
            //     closeDays = daysNo.filter(function (n) { return !this.has(n) }, new Set(openDays));
            // }
            // if (closeDays !== undefined) {
            //     closeDays.forEach(function (closeDay) {
            //         dayarray.push({
            //             'day': closeDay,
            //             'dayName': weekDays[closeDay],
            //             'displayHours': "Closed",
            //             'open': 0,
            //             'close': 0,
            //             'isClose': true
            //         })
            //     }, this);
            // }
            attractionDetail[0].formatedvisitTime = formatedVisitTimeArray; //dayarray;
            if (campaignDate) {
                var startDateObject = campaignDate.startDate.split("/");
                campaignDate.startDate = startDateObject[2] + "-" + startDateObject[0] + "-" + startDateObject[1] + "T00:00:00.00Z";

                var endDateObject = campaignDate.endDate.split("/");
                campaignDate.endDate = endDateObject[2] + "-" + endDateObject[0] + "-" + endDateObject[1] + "T00:00:00.00Z";

                var d = new Date(campaignDate.startDate);
                var startDate = d.toISOString();
                var d = new Date(campaignDate.endDate);
                var endDate = d.toISOString();
                var that = this;


                // .findOneAndUpdate({age: 17}, {$set:{name:"Naomi"}}, {new: true}, function(err, doc){
                this.Campaign.findOneAndUpdate({
                        "campaignDate.startDate": {
                            "$lte": endDate
                        },
                        "campaignDate.endDate": {
                            "$gte": startDate
                        },
                        "type": 1,
                        "attractionId": attractionDetail[0].attractionId
                    }, { $inc: { Click: 1 } }, { new: true })
                    .then(function(response) {
                        if (response) {
                            var formatedCampaignDate = {
                                "startDate": that.commonController.converDateformatToDayDateMonthYear(response._doc.campaignDate.startDate),
                                "endDate": that.commonController.converDateformatToDayDateMonthYear(response._doc.campaignDate.endDate)
                            }
                            attractionDetail[0].campaignDetails = {};
                            attractionDetail[0].campaignDetails.id = response._doc._id;
                            attractionDetail[0].campaignDetails.name = response._doc.name;
                            attractionDetail[0].campaignDetails.isActive = response._doc.isActive;
                            attractionDetail[0].campaignDetails.dealImage = response._doc.campaignImage;
                            attractionDetail[0].campaignDetails.campaignDate = response._doc.campaignDate;
                            attractionDetail[0].campaignDetails.formatedCampaignDate = formatedCampaignDate;
                            attractionDetail[0].campaignDetails.description = response._doc.description;
                            attractionDetail[0].campaignDetails.dealheadline = response._doc.headline;
                            attractionDetail[0].campaignDetails.destinationUrl = response._doc.destinationUrl;
                            attractionDetail[0].campaignDetails.budgetPerTraveller = response._doc.budgetPerTraveller;
                            attractionDetail[0].campaignDetails.associatedAttractionId = response._doc.attractionId;
                            attractionDetail[0].campaignDetails.associatedAttractionName = attractionDetail[0].attractionName;
                            attractionDetail[0].campaignDetails.validTill = that.commonController.converDateformatToDayDateMonthYear(attractionDetail[0].campaignDetails.campaignDate.endDate);
                            attractionDetail[0].campaignDetails.Click = response._doc.Click;
                        }

                        that.send(res, 200, 'attraction details', attractionDetail);
                    })
                    .catch(this.handleError.bind(this, res));


            } else {
                this.send(res, 200, 'attraction details', attractionDetail);
            }
        } else {
            this.send(res, 404, "No  attraction details found", null);
        }
    }

    updateAttractionDetails(req, res) {
        var attractionTransactionsDetails = req.body.data.attrTransactionDetail;
        attractionTransactionsDetails.last_updated = new Date();
        this.isTravellerRelatedChanges = req.body.data.isTravellerRelatedChanges;
        this.isAttractionUpdated = req.body.data.isAttractionUpdated;
        var businessUser = (req.body.data.attrTransactionDetail.businessUserName) ? req.body.data.attrTransactionDetail.businessUserName : 'Admin';
        var businessUserId = (req.body.data.attrTransactionDetail.businessUserId) ? req.body.data.attrTransactionDetail.businessUserId : '-';
        var businessUseremailId = (req.body.data.attrTransactionDetail.businessUseremailId) ? req.body.data.attrTransactionDetail.businessUseremailId : '-';
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
                // .then(this.updateAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails))
                .then(this.updateAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails, businessUser))
                .catch(this.handleError.bind(this, res));
        }
        if (source === "WOOTRAVEL") {
            if (attractionDetails.attractionId) {

                if (typeof(attractionDetails.attractionCountry) === "object") {
                    attractionDetails.attractionCountryId = attractionDetails.attractionCountry.countryId;
                    attractionDetails.attractionCountry = attractionDetails.attractionCountry.countryName;
                }

                if (attractionDetails.attractionState && typeof(attractionDetails.attractionState) === "object") {
                    attractionDetails.attractionStateId = attractionDetails.attractionState.stateId;
                    attractionDetails.attractionState = attractionDetails.attractionState.stateName;
                }

                if (typeof(attractionDetails.attractionCityName) === "object") {
                    attractionDetails.attractionCityId = attractionDetails.attractionCityName.cityId;
                    attractionDetails.attractionCityName = attractionDetails.attractionCityName.cityName;
                }

                this.attractionMasterModel.findOneAndUpdate({ "attractionId": attractionDetails.attractionId }, { $set: attractionDetails }, { new: true })
                    // .then(this.updateAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails))
                    .then(this.updateAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails, businessUser))
                    .catch(this.handleError.bind(this, res));
            } else {

                attractionTransactionsDetails.isAttractionActive = true;
                attractionDetails.attractionCountryId = attractionDetails.attractionCountry.countryId;
                attractionDetails.attractionCountry = attractionDetails.attractionCountry.countryName;
                attractionDetails.attractionStateId = (attractionDetails.attractionState) ? attractionDetails.attractionState.stateId : null;
                attractionDetails.attractionState = (attractionDetails.attractionState) ? attractionDetails.attractionState.stateName : null;
                attractionDetails.attractionCityId = attractionDetails.attractionCityName.cityId;
                attractionDetails.attractionCityName = attractionDetails.attractionCityName.cityName;

                attractionDetails.address = {};
                attractionDetails.address.city = attractionDetails.attractionCityName;
                attractionDetails.address.state = attractionDetails.attractionState;
                attractionDetails.address.country = attractionDetails.attractionCountry;

                var attractionMaster = new this.attractionMasterModel(attractionDetails);
                attractionMaster.save(attractionDetails)
                    .then(this.addAttractionTransactionDetails.bind(this, res, attractionTransactionsDetails))
                    .catch(this.handleError.bind(this, res));
            }

        }
    }

    updateAttractionTransactionDetails(res, attractionTransactionsDetails, businessUser, attractionDetails) {

        // this.attractionTransactionModel.findOneAndUpdate({ "attractionId": attractionDetails._doc.attractionId }, { $set: attractionTransactionsDetails }, { upsert: true, new: true, setDefaultsOnInsert: true })
        //     .then(this.isBuisnessUserAssociated.bind(this, res, attractionDetails))
        //     .catch(this.handleError.bind(this, res));

        if (!attractionTransactionsDetails.businessUserId) {
            attractionTransactionsDetails.associationStatus = 4;
        }

        this.attractionTransactionModel.findOneAndUpdate({ "attractionId": attractionDetails._doc.attractionId }, { $set: attractionTransactionsDetails }, { upsert: true, new: true, setDefaultsOnInsert: true })
            // .then(this.updateAttractionEmail.bind(this, res, attractionTransactionsDetails, businessUser, attractionDetails))
            .then(this.getAllTravellerEmail.bind(this, res, attractionTransactionsDetails, businessUser, attractionDetails))
            .then(this.getAllTravellerEmailPrepareData.bind(this, res, attractionTransactionsDetails, attractionDetails))
            .then(this.getTravellerData.bind(this, res, attractionTransactionsDetails, attractionDetails))
            .then(this.updateAttractionEmailToTraveller.bind(this, res, attractionTransactionsDetails, attractionDetails))
            .then(this.updateAttractionTransactionDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));


    }

    getAllTravellerEmail(res, attractionTransactionsDetails, businessUser, attractionDetails) {
        try {
            return new Promise((resolve, reject) => {
                this.attractionTransactionModel.aggregate([{
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
                ], function(err, responce) {
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

    getAllTravellerEmailPrepareData(res, attractionTransactionsDetails, attractionDetails, responce) {
        var deferred = Q.defer();
        // var tryThis = _.uniqBy(responce['responce'], 'travelerId');
        var result = _.map(_.uniqBy(responce['responce'], 'travelerId'), 'travelerId')
        deferred.resolve(result);
        return deferred.promise;
    }

    getTravellerData(res, attractionTransactionsDetails, attractionDetails, responce) {

        var tempArray = [];
        responce.forEach(function(entry) {
            var object = mongoose.Types.ObjectId(entry);
            tempArray.push(object);
        });

        try {
            return new Promise((resolve, reject) => {
                this.Traveller.aggregate([
                    { $match: { "_id": { $in: tempArray } } },
                ], function(err, responce) {
                    resolve({ "responce": responce, "attractionTransactionsDetails": attractionTransactionsDetails, "attractionDetails": attractionDetails });
                });
            });
        } catch (error) {

        }
    }

    updateAttractionEmailToTraveller(res, attractionTransactionsDetails, attractionDetails, travellers) {
        var deferred = Q.defer();
        var tempArray = [];
        var obj = {}
        var travellerArray = travellers['responce'];
        var emailController = new EmailController(this.getFullUrl(res.req));
        if (this.isTravellerRelatedChanges) {

            travellerArray.forEach(function(entry) {
                // var object = mongoose.Types.ObjectId(entry);
                obj = {
                    email: entry.emailId,
                    travelerName: entry.fullName
                }
                if (entry.isActive) {
                    tempArray.push(obj);
                }
            });


        }
        if (attractionTransactionsDetails.businessUserId && this.isAttractionUpdated) {
            this.businessUser.aggregate([{
                    $match: {
                        "_id": mongoose.Types.ObjectId(attractionTransactionsDetails.businessUserId),
                        "isActive": true
                    }
                }, ])
                .then(function(responce) {
                    if (responce.length > 0) {
                        var businessUserMailObj = {
                            email: responce[0].emailId,
                            businessUserName: responce[0].contactPersonName,
                            attractionName: attractionDetails._doc.attractionName
                        }

                        emailController.updateAttractionEmailToBusinessUser(businessUserMailObj);
                        if (this.isTravellerRelatedChanges) {
                            emailController.updateAttractionEmailToTraveller(attractionTransactionsDetails, tempArray, attractionDetails._doc);
                        }
                        deferred.resolve(attractionTransactionsDetails);
                    } else {
                        if (this.isTravellerRelatedChanges) {
                            emailController.updateAttractionEmailToTraveller(attractionTransactionsDetails, tempArray, attractionDetails._doc);
                        }
                        deferred.resolve(attractionTransactionsDetails);
                    }

                }).catch(function(error) {
                    console.log(error);
                })

        } else {
            if (this.isTravellerRelatedChanges) {
                emailController.updateAttractionEmailToTraveller(attractionTransactionsDetails, tempArray, attractionDetails._doc);
            }
            deferred.resolve(attractionTransactionsDetails);
        }


        // return deferred.promise;
    }

    isBuisnessUserAssociated(res, attractionDetails, data) {
        // var deferred = Q.defer();
        if (data._doc.businessUserId) {
            this.businessUser.findById(data.businessUserId).select('emailId')
                .then(this.sendAttractionDetailsUpdatedEmail.bind(this, res, attractionDetails, data))
                .then(this.updateAttractionTransactionDetailsCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } else {
            this.updateAttractionTransactionDetailsCallback(res, data);
        }

        // return deferred.promise;
    }

    sendAttractionDetailsUpdatedEmail(res, attractionDetails, data, businessUser) {
        var deferred = Q.defer();
        var emailController = new EmailController(this.getFullUrl(res.req));
        emailController.sendAttractionDetailsUpdated(businessUser, attractionDetails);
        deferred.resolve(attractionDetails);
        return deferred.promise;
    }

    updateAttractionTransactionDetailsCallback(res, data) {
        this.send(res, 200, "Attraction Details has been Updated", data);
    }

    addAttractionTransactionDetails(res, attractionTransactionsDetails, attractionDetails) {
        this.attractionTransactionModel.findOneAndUpdate({ "attractionId": attractionDetails._doc.attractionId }, { $set: attractionTransactionsDetails }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.addAttractionTransactionDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
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

            mv(tempPath1, targetPath1, function(err) {
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

            mv(tempPath2, targetPath2, function(err) {
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

    approveRejectAttraction(req, res) {
        var attractionTransactionsDetails = req.body.data.attrTransactionDetail;
        var attractionDetails = req.body.data;
        var reason = "";
        if ("reason" in req.body) {
            reason = req.body.reason;
        }
        this.attractionTransactionModel.findOneAndUpdate({ "attractionId": attractionTransactionsDetails.attractionId }, { $set: attractionTransactionsDetails }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.approveRejectAttractionCallback.bind(this, res, attractionDetails, reason))
            .catch(this.handleError.bind(this, res));
    }

    approveRejectAttractionCallback(res, attractionDetails, reason, data) {
        try {
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.sendAttractionApproveReject(attractionDetails, reason);
            var message = (reason === "") ? "Attraction association request approved" : "Attraction association request rejected";
            this.send(res, 200, message, "");
        } catch (error) {

        }
    }

    checkIfAttractionExistsInAnyTrip(req, res) {
        var attractionId = req.query.attractionId;

        var mainAttractions = this.getMainAttractionsResult(attractionId);
        var otherAttractions = this.getOtherAttractionsResult(attractionId);

        Promise.all([mainAttractions, otherAttractions]).then(result => {
            var data = {};
            data.mainAttractions = result[0];
            data.otherAttractions = result[1];
        }, reason => {
            console.log(reason);
        });
    }

    getMainAttractionsResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.TravelerTrip.aggregate([
                    { $match: { "tripSummery.tripMainEvents.attractionList.attractionId": search } },
                ], function(err, res) {
                    resolve(res);
                });
            });
        } catch (error) {

        }
    }

    getOtherAttractionsResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.TravelerTrip.aggregate([

                    { $unwind: "$tripSummery" },
                    { $unwind: "$tripSummery.tripOtherEvents" },
                    {
                        $lookup: {
                            from: "AttractionMaster",
                            localField: "tripSummery.tripOtherEvents.attractionId",
                            foreignField: "attractionId",
                            as: "AttractionMaster"
                        }
                    },
                    {
                        $lookup: {
                            from: "cities",
                            localField: "destinationId",
                            foreignField: 'cityId',
                            as: "cities"
                        }
                    },
                    { $unwind: "$cities" },
                    { $unwind: "$AttractionMaster" },
                    {
                        $lookup: {
                            from: "campaigns",
                            localField: "AttractionMaster.attractionId",
                            foreignField: "attractionId",
                            as: "campaigns"
                        }
                    },
                    { $match: { "tripSummery.tripOtherEvents.attractionId": search } },
                ], function(err, res) {
                    resolve(res);
                });
            });
        } catch (error) {

        }
    }

    searchAttractions(req, res) {
        var search = req.params.searchAttraction;

        this.attractionMasterModel.aggregate([{
                    "$lookup": {
                        "from": "attractionTransaction",
                        "localField": "attractionId",
                        "foreignField": "attractionId",
                        "as": "attractionTransaction",
                    }
                },
                { "$unwind": "$attractionTransaction" },
                {
                    "$match": {
                        "attractionName": new RegExp(search, "i"),
                    }
                },
                {
                    "$project": {
                        "id": "$attractionId",
                        "attractionName": "$attractionName",
                        "businessUserId": "$attractionTransaction.businessUserId",
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

module.exports = adminManageAttractionController;
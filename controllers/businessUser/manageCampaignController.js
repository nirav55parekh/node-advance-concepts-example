//include models
var CampaignModel = require('../../models/campaign');

//include controllers
var BaseController = require('../baseController');
var CommonController = require('../commonServicesController');

var Q = require('q');
var multer = require('multer');
var fs = require('fs-extra');
var path = require('path');
var mv = require('mv');
var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectId;
class CampaignsController extends BaseController {
    constructor() {
        super();
        this.Campaign = CampaignModel;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    list(req, res) {
        let token = req.headers.authorization;
        var search = req.body;
        var conditions = this.commonController.getSearchConditions(search);
        var today = new Date();
        var that = this;

        if (search["campaignDate.startDate"] && search["campaignDate.endDate"]) {
            delete conditions["campaignDate.endDate"];

            var startDateObject = search["campaignDate.startDate"].split("/");
            search["campaignDate.startDate"] = startDateObject[2] + "-" + startDateObject[0] + "-" + startDateObject[1] + "T00:00:00.00Z";

            var endDateObject = search["campaignDate.endDate"].split("/");
            search["campaignDate.endDate"] = endDateObject[2] + "-" + endDateObject[0] + "-" + endDateObject[1] + "T00:00:00.00Z";

            var d = new Date(search["campaignDate.startDate"]);
            var startDate = d.toISOString();
            var d = new Date(search["campaignDate.endDate"]);
            var endDate = d.toISOString();
            var that = this;

            conditions["campaignDate.startDate"] = {
                    "$lt": new Date(search["campaignDate.endDate"]),
            }
            conditions["campaignDate.endDate"] = {
                    "$gt": new Date(search["campaignDate.startDate"])
            }
        }
        conditions["Token.token"] = token;
        var start = new Date();
        start.setHours(0, 0, 0, 0);

        var end = new Date();
        end.setHours(23, 59, 59, 999);
        this.Campaign.update({
            $or: [{
                $and: [
                    { "campaignDate.startDate": { "$gte": new Date() } }, // trip end date
                    { "campaignDate.endDate": { "$lte": new Date() } } // trip start date
                ],
                $and: [
                    { "campaignDate.startDate": { "$lt": new Date() } }, // trip end date
                    { "campaignDate.endDate": { "$lt": new Date() } } // trip start date
                ],
            }],
            "campaignDate.startDate": { $not: { $gte: start, $lt: end } },
            "campaignDate.endDate": { $not: { $gte: start, $lt: end } },

        },
            { isActive: false },
            {
                multi: true,
            }
        ).then(function (response) {
            var those = that;
            var aggregate = that.Campaign.aggregate();
            aggregate.
                lookup({
                    "from": "AttractionMaster",
                    "localField": "attractionId",
                    "foreignField": "attractionId",
                    "as": "AttractionMaster",
                })
                .lookup({
                    "from": "attractionTransaction",
                    "localField": "attractionId",
                    "foreignField": "attractionId",
                    "as": "attractionTransaction",
                })
                .lookup({
                    "from": "Token",
                    "localField": "businessUserId",
                    "foreignField": "businessUserId",
                    "as": "Token",
                })
                .unwind("$Token")
                .unwind("$AttractionMaster")
                .unwind("$attractionTransaction")
                .match(conditions)
                .project({
                    "id": "$_id",
                    "name": "$name",
                    "type": "$type",
                    "startDate": "$campaignDate.startDate",
                    "endDate": "$campaignDate.endDate",
                    "travellerLimits": "$travellerLimits",
                    "isActive": "$isActive",
                    "attractionName": "$AttractionMaster.attractionName",
                    "Added": "$Added",
                    "Impression": "$Impression",
                    "Click": "$Click",
                    "campaignDate": "$campaignDate",
                    "isDeletable": {
                        $cond: {
                            if: {
                                $or: {
                                    $and: [
                                        { $gte: ["$campaignDate.startDate", new Date()] }, // trip end date
                                        { $gte: ["$campaignDate.endDate", new Date()] } // trip start date
                                    ],
                                    $and: [
                                        { $not: { $lte: ["$campaignDate.startDate", new Date()] } }, // trip end date
                                        { $not: { $lte: ["$campaignDate.endDate", new Date()] } } // trip start date
                                    ]
                                }
                            }, then: true, else: false
                        }
                    },
                    "isEditable": {
                        $cond: {
                            if: {
                                $or: {
                                    $and: [
                                        { "$gte": ["$campaignDate.startDate", new Date()] }, // trip end date
                                        { "$lte": ["$campaignDate.endDate", new Date()] } // trip start date
                                    ],
                                    $and: [
                                        { "$lte": ["$campaignDate.startDate", new Date()] }, // trip end date
                                        { "$lte": ["$campaignDate.endDate", new Date()] } // trip start date
                                    ]
                                }
                            }, then: false, else: true
                        }
                    },
                    "isDateEditable": {
                        $cond: {
                            if: {
                                $and: [
                                    { "$lte": ["$campaignDate.startDate", new Date()] }, // trip end date
                                    { "$gte": ["$campaignDate.endDate", new Date()] } // trip start date
                                ],
                            }, then: false, else: true
                        }
                    }
                });
            that.Campaign.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
                function (err, results, pageCount, count) {
                    that.listCallBack(res, results, search, pageCount, count);
                });
        })
            .catch(this.handleError.bind(this, res))
    }

    listCallBack(res, results, search, pageCount, count) {
        var listData = {
            list: results,
            page: parseInt(search.page),
            records: count,
            total: Math.ceil(count / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' campaigns', listData);
    }

    getCampaignDetails(req, res) {
        var campaignId = req.query.campaignId;

        this.Campaign.aggregate([
            {
                $lookup: {
                    "from": "AttractionMaster",
                    "localField": "attractionId",
                    "foreignField": "attractionId",
                    "as": "AttractionMaster",
                }
            },
            { $unwind: "$AttractionMaster" },
            {
                $lookup: {
                    "from": "businessUsers",
                    "localField": "businessUserId",
                    "foreignField": "_id",
                    "as": "businessUsers",
                }
            },
            { $unwind: "$businessUsers" },
            { $match: { "_id": new ObjectId(campaignId) } },
            {
                $project: {
                    name: "$name",
                    type: "$type",
                    description: "$description",
                    campaignImage: "$campaignImage",
                    attractionId: "$attractionId",
                    businessUserId: "$businessUserId",
                    businessUser: "$businessUsers.contactPersonName",
                    "campaignDate.startDate": "$campaignDate.startDate",
                    "campaignDate.endDate": "$campaignDate.endDate",
                    travellerLimits: "$travellerLimits",
                    budgetPerTraveller: "$budgetPerTraveller",
                    budgetPerTravellerCurrency: "$budgetPerTravellerCurrency",
                    targetingAudience: "$targetingAudience",
                    isActive: "$isActive",
                    attractionName: "$AttractionMaster.attractionName",
                    headline: "$headline",
                    destinationUrl: "$destinationUrl",
                    travelThemes: "$travelThemes",
                    travelProfiles: "$travelProfiles",
                    "isEditable": {
                        $cond: {
                            if: {
                                $or: {
                                    $and: [
                                        { "$gte": ["$campaignDate.startDate", new Date()] }, // trip end date
                                        { "$lte": ["$campaignDate.endDate", new Date()] } // trip start date
                                    ],
                                    $and: [
                                        { "$lte": ["$campaignDate.startDate", new Date()] }, // trip end date
                                        { "$lte": ["$campaignDate.endDate", new Date()] } // trip start date
                                    ]
                                }
                            }, then: false, else: true
                        }
                    },
                    "isDateEditable": {
                        $cond: {
                            if: {
                                $and: [
                                    { "$lte": ["$campaignDate.startDate", new Date()] }, // trip end date
                                    { "$gte": ["$campaignDate.endDate", new Date()] } // trip start date
                                ],
                            }, then: false, else: true
                        }
                    }
                }
            }
        ])
            .then(this.getCampaignDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res))
    }

    getCampaignDetailsCallback(res, campaignDetails) {
        if (campaignDetails.length)
            this.send(res, 200, 'Campaign details found', campaignDetails[0]);
        else
            this.send(res, 404, "No Campaign details found", null);
    }

    addOrUpdate(req, res) {
        var campaignDetails = req.body.data;

        var startDateObject = campaignDetails.campaignDate.startDate.split("/");
        campaignDetails.campaignDate.startDate = startDateObject[2] + "-" + startDateObject[0] + "-" + startDateObject[1] + "T00:00:00.00Z";

        var endDateObject = campaignDetails.campaignDate.endDate.split("/");
        campaignDetails.campaignDate.endDate = endDateObject[2] + "-" + endDateObject[0] + "-" + endDateObject[1] + "T00:00:00.00Z";

        var d = new Date(campaignDetails.campaignDate.startDate);
        var startDate = d.toISOString();
        var d = new Date(campaignDetails.campaignDate.endDate);
        var endDate = d.toISOString();
        var that = this;


        this.Campaign.find({
            "campaignDate.startDate": {
                "$lte": endDate
            },
            "campaignDate.endDate": {
                "$gte": startDate
            },
            "type": campaignDetails.type,
            "attractionId": campaignDetails.attractionId
        }).then(function (response) {
            if (campaignDetails._id) {
                if (response.length && campaignDetails._id === ObjectId(response[0]._doc._id).toString()) {
                    that.Campaign.findOneAndUpdate({ _id: campaignDetails._id }, campaignDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                        .then(function (response) {
                            that.send(res, 200, "Campaign details updated", response);
                        })
                        .catch(that.handleError.bind(this, res));
                } else if (response.length && campaignDetails._id !== ObjectId(response[0]._doc._id).toString()) {
                    that.send(res, 412, "Date already available for this attraction and same type", null);
                } else if (response.length === 0) {
                    that.Campaign.findOneAndUpdate({ _id: campaignDetails._id }, campaignDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                        .then(function (response) {
                            that.send(res, 200, "Campaign details updated", response);
                        })
                        .catch(this.handleError.bind(this, res));
                }
            } else {
                if (response.length === 0) {
                    var Campaign = new that.Campaign(campaignDetails);
                    Campaign.save()
                        .then(function (response) {
                            that.send(res, 200, "This campaign will be set to live on the selected start date", response);
                        })
                        .catch(this.handleError.bind(this, res));
                } else {
                    that.send(res, 412, "Date already available for this attraction and same type", null);
                }

            }
        })

    }

    addOrUpdateCallback(res, message, campaignDetails) {
        this.send(res, 200, message, campaignDetails);
    }

    uploadPhoto(req, res) {

        if (!req.files.file) {
            this.send(res, 200, '', "");
        }
        var file = req.files.file;
        var campaignId = req.body.campaignId;
        var oldImages = req.body.oldImages;
        var setImage = { "campaignImage": oldImages.campaignImage };
        if (file) {
            var tempPath = file.path;
            var imageName = this.generateRandomImageName(campaignId + "campaignImage" + file.name);
            var targetPath = path.join(__dirname, "../../uploads/campaigns/" + imageName + path.extname(file.name));
            var saveName = imageName + path.extname(file.name);
            setImage.campaignImage = saveName;

            mv(tempPath, targetPath, function (err) {
                if (err) {
                    console.log(err);
                } else {

                }
            });

            if (oldImages.campaignImage) {
                fs.remove(path.join(__dirname, "../uploads/campaigns/" + oldImages.campaignImage), (err) => {
                    if (err) throw err;
                });
            }
        }

        this.Campaign.findOneAndUpdate({ "_id": campaignId }, { $set: setImage }, { upsert: true, new: true })
            .then(this.uploadPhotoCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    uploadPhotoCallback(res, data) {
        this.send(res, 200, "", data);
    }

    deleteCampaign(req, res) {
        var campaignId = req.body.id;
        this.Campaign.findByIdAndRemove({ _id: campaignId })
            .then(this.deleteCampaignCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    deleteCampaignCallback(res, data) {
        this.send(res, 200, "Campaign deleted", data);
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

module.exports = CampaignsController;
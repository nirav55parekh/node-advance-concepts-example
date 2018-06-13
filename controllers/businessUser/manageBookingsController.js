/**
 * Include require Models
 */

var bookingModel = require('../../models/booking');

//include controllers
var BaseController = require('./../baseController');
var CommonController = require('./../commonServicesController');
var _ = require('lodash');

var mongoose = require('mongoose');

//include enums
var wootravelEnum = require('../../enum/wootravelEnum');

var ObjectId = require('mongodb').ObjectID;
var Q = require('q');


class bookingController extends BaseController {
    constructor() {
        super();
        this.booking = bookingModel;
        this.commonController = new CommonController();
    }

    /**
     * @description {To show booking list}     
     * @param {*} req 
     * @param {*} res 
     * 
     */
    list(req, res) {

        try {
            var search = req.body;
            var conditions = this.commonController.getSearchConditions(search);
            var deals = [];
            var tickets = [];
            if ("fullName" in conditions) {
                conditions["$or"] = [{ "firstName": new RegExp(conditions.fullName, "i") }, { "lastName": new RegExp(conditions.fullName, "i") }]
                delete conditions.fullName;
            }
            if ("type" in conditions) {
                var type = conditions["type"];
                delete conditions.type;
                if (type == 1) {
                    deals = this.getDealsResult(conditions);
                } else {
                    tickets = this.getTicketsResult(conditions);
                }
            } else {
                deals = this.getDealsResult(conditions);
                tickets = this.getTicketsResult(conditions);
            }

            Promise.all([deals, tickets]).then(result => {
                var data = {};
                var limit = req.body.page * req.body.pgsize;
                var Skip = limit - req.body.pgsize;
                data = result[0].concat(result[1]);
                data =_.orderBy(data, ['bookingRequestDate'],['desc']);
                var listData = {
                    list: data.slice(Skip, limit),
                    page: parseInt(search.page),
                    records: data.length,
                    total: Math.ceil(data.length / parseInt(search.pgsize))
                };
                this.send(res, 200, '', listData);
            }, reason => {
                console.log(reason);
            });
        } catch (error) {

        }
    }

    getTicketsResult(conditions) {
        var search = conditions;
        try {
            if ("status" in search) {
                var status = search.status;
                search["bookingSummary.tickets.bookingStatus"] = status;
                delete search.status;
            }

            return new Promise((resolve, reject) => {
                this.booking.aggregate([
                    { $unwind: "$bookingSummary" },
                    { $unwind: "$bookingSummary.tickets" },
                    {
                        $lookup: {
                            from: "AttractionMaster",
                            localField: "bookingSummary.tickets.attractionId",
                            foreignField: "attractionId",
                            as: "AttractionMaster",
                        }
                    },
                    { $unwind: "$AttractionMaster" },
                    {
                        $lookup: {
                            from: "attractionTransaction",
                            localField: "bookingSummary.tickets.attractionId",
                            foreignField: "attractionId",
                            as: "attractionTransaction",
                        }
                    },
                    { $unwind: "$attractionTransaction" },
                    {
                        $lookup: {
                            from: "businessUsers",
                            localField: "attractionTransaction.businessUserId",
                            foreignField: "_id",
                            as: "businessUsers",
                        }
                    },
                    { $unwind: "$businessUsers" },
                    { $match: search },
                    {
                        $project: {
                            "ticketId": "$bookingSummary.tickets._id",
                            "title": { "$literal": "Ticket" },
                            "associatedAttraction": "$AttractionMaster.attractionName",
                            "fullName": { "$concat": ["$firstName", " ", "$lastName"] },
                            "emailId": "$emailId",
                            "contactNo": "$contactNo",
                            "bookingRequestDate": "$bookingRequestDate",
                            "type": { "$literal": "Ticket" },
                            "status": "$bookingSummary.tickets.bookingStatus"
                        }
                    }
                ], function (err, res) {
                    resolve(res);
                });
            });
        } catch (error) {

        }
    }

    getDealsResult(conditions) {
        var search = conditions;
        try {
            if ("status" in search) {
                var status = search.status;
                search["bookingSummary.deals.bookingStatus"] = status;
                delete search.status;
            }
            delete search.status;
            return new Promise((resolve, reject) => {
                this.booking.aggregate([
                    { $unwind: "$bookingSummary" },
                    { $unwind: "$bookingSummary.deals" },
                    {
                        $lookup: {
                            from: "campaigns",
                            localField: "bookingSummary.deals.dealId",
                            foreignField: "_id",
                            as: "campaigns",
                        }
                    },
                    { $unwind: "$campaigns" },
                    {
                        $lookup: {
                            from: "AttractionMaster",
                            localField: "campaigns.attractionId",
                            foreignField: "attractionId",
                            as: "AttractionMaster",
                        }
                    },
                    { $unwind: "$AttractionMaster" },
                    {
                        $lookup: {
                            from: "attractionTransaction",
                            localField: "campaigns.attractionId",
                            foreignField: "attractionId",
                            as: "attractionTransaction",
                        }
                    },
                    { $unwind: "$attractionTransaction" },
                    {
                        $lookup: {
                            from: "businessUsers",
                            localField: "attractionTransaction.businessUserId",
                            foreignField: "_id",
                            as: "businessUsers",
                        }
                    },
                    { $unwind: "$businessUsers" },
                    { $match: search },
                    {
                        $project: {
                            "dealId": "$bookingSummary.deals._id",
                            "title": "$campaigns.name",
                            "associatedAttraction": "$AttractionMaster.attractionName",
                            "fullName": { "$concat": ["$firstName", " ", "$lastName"] },
                            "emailId": "$emailId",
                            "contactNo": "$contactNo",
                            "bookingRequestDate": "$bookingRequestDate",
                            "type": { "$literal": "Deal" },
                            "status": "$bookingSummary.deals.bookingStatus"
                        }
                    }
                ], function (err, res) {
                    resolve(res);
                });
            });
        } catch (error) {

        }
    }

    changeStatus(req, res) {
        var bookingDetails = req.body;
        if (bookingDetails.type === "Deal") {
            this.booking.update({ "bookingSummary.deals._id": new ObjectId(bookingDetails._id) },{"bookingSummary.deals.$.bookingStatus" : bookingDetails.status} )
                .then(function () {
                    this.send(res, 200, "Status updated!", "");
                }.bind(this))
                .catch(this.handleError.bind(this, res));
        } else {
            this.booking.update({ "bookingSummary.tickets._id": new ObjectId(bookingDetails._id) }, {"bookingSummary.tickets.$.bookingStatus" : bookingDetails.status} )
                .then(function () {
                    this.send(res, 200, "Status updated!", "");
                }.bind(this))
                .catch(this.handleError.bind(this, res));
        }
    }

}

module.exports = bookingController;
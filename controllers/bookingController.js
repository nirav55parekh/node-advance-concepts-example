/**
 * Include require Models
 */

var bookingModel = require('../models/booking');
var attractionTransactionModel = require('../models/attractionTransactionModel');
var campaignModel = require('../models/campaign');
var settingsModel = require('../models/settings');

//include controllers
var BaseController = require('./baseController');
var CommonController = require('./commonServicesController');
var EmailController = require('./emailController');
var CommonController = require('./commonServicesController');
var appConfig = require('../config/appconfig');
var mongoose = require('mongoose');

//include enums
var wootravelEnum = require('../enum/wootravelEnum');

var ObjectId = require('mongodb').ObjectID;
var Q = require('q');
var _ = require('lodash');
var dealNotificationEmail = "";


class bookingController extends BaseController {
    constructor() {
        super();
        this.booking = bookingModel;
        this.attractionTransactionModel = attractionTransactionModel;
        this.campaignModel = campaignModel;
        this.settingsModel = settingsModel;
        this.commonController = new CommonController();
    }

    /**
     * @description {To show booking list}     
     * @param {*} req 
     * @param {*} res 
     * 
     */
    bookingList(req, res) {

        try {
            var search = new ObjectId(req.query.travellerId);
            var deals = this.getDealsResult(search);
            var tickets = this.getTicketsResult(search);

            Promise.all([deals, tickets]).then(result => {
                var data = {};
                data = result[0].concat(result[1]);
                data = _.orderBy(data, ['bookingRequestDate'], ['desc']);
                this.send(res, 200, '', data);
            }, reason => {
                console.log(reason);
            });
        } catch (error) {

        }
    }

    getTicketsResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.booking.aggregate([
                    { $match: { "travellerId": search } },
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
                        $project: {
                            "ticketId": "$bookingSummary.tickets._id",
                            "title": { "$literal": "Ticket" },
                            "associatedAttraction": "$AttractionMaster.attractionName",
                            "type": { "$literal": "Ticket" },
                            "bookingRequestDate": "$bookingRequestDate",
                            "status": "$bookingSummary.tickets.bookingStatus"
                        }
                    }
                ], function(err, res) {
                    resolve(res);
                });
            });
        } catch (error) {

        }
    }

    getDealsResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.booking.aggregate([
                    { $match: { "travellerId": search } },
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
                        $project: {
                            "dealId": "$bookingSummary.deals._id",
                            "title": "$campaigns.name",
                            "associatedAttraction": "$AttractionMaster.attractionName",
                            "type": { "$literal": "Deal" },
                            "bookingRequestDate": "$bookingRequestDate",
                            "status": "$bookingSummary.deals.bookingStatus"
                        }
                    }
                ], function(err, res) {
                    resolve(res);
                });
            });
        } catch (error) {

        }
    }



    /**
     * @description {To add new booking request}     
     * @param {*} req 
     * @param {*} res 
     * 
     */
    addBooking(req, res) {

        var attractionIds = [];
        var attractionIdList = [];
        var dealIds = [];
        var dealIdList = [];
        var travelerEmailId = req.body.emailId;
        req.body.tickets.forEach(function(ticketId, index) {
            attractionIds.push({ _id: new ObjectId(), 'attractionId': ticketId, 'bookingStatus': wootravelEnum.bookingStatus.Active });
            attractionIdList.push(ticketId);
        }, this);


        req.body.deals.forEach(function(dealId, index) {
            dealIds.push({ _id: new ObjectId(), 'dealId': mongoose.Types.ObjectId(dealId), 'bookingStatus': wootravelEnum.bookingStatus.Active });
            dealIdList.push(mongoose.Types.ObjectId(dealId));
        }, this);

        var bookingSummary = {
            "tickets": attractionIds,
            "deals": dealIds
        }

        var noofTravelers = {
            adult: req.body.adult,
            children: req.body.children
        }

        var bookingObj = {
            "travellerId": req.body.travellerId,
            "firstName": req.body.firstName,
            "lastName": req.body.lastName,
            "emailId": req.body.emailId,
            "contactNo": req.body.contactNo,
            "description": req.body.description,
            "noofTravelers": noofTravelers,
            "bookingSummary": bookingSummary
        }

        var booking = new this.booking(bookingObj);
        booking.save()
            .then(this.getDealNitificationEmail.bind(this, res))
            .then(this.prepareTicketDetail.bind(this, res, attractionIdList, dealIdList, travelerEmailId, req.body))
            //   .then(this.sendEmailToTravellrCallback.bind(this, res))
            .then(this.bookingAddCallback.bind(this, res, "Booking request has been added"))
            .catch(this.handleError.bind(this, res));
    }


    /**
     * get Deal & Ticket notification email for admin.
     */
    getDealNitificationEmail(res) {
            this.settingsModel.find({}, { dealsAndNotification: 1, _id: 0 }).then(function(result) { //ticketNotification: 1,
                //  console.log(result);
                if (result.length > 0) {
                    dealNotificationEmail = result[0].dealsAndNotification;
                    //ticketNotificationEmail = result[0].ticketNotification;
                }
            }).catch(function(err) {
                this.handleError.bind(this, res)
            })
        }
        /**
         * Collect attraction ticket information
         */
    prepareTicketDetail(res, attractionIds, dealIds, travelerEmailId, requestDetail) {
        var dealIds = dealIds;
        var travelerEmailId = travelerEmailId;
        var requestDetail = requestDetail;
        this.attractionTransactionModel.aggregate([
                { "$match": { "attractionId": { "$in": attractionIds } } },
                {
                    $lookup: {
                        from: "businessUsers",
                        localField: "businessUserId",
                        foreignField: "_id",
                        as: "businessUser"
                    }
                },
                {
                    $lookup: {
                        from: "AttractionMaster",
                        localField: "attractionId",
                        foreignField: "attractionId",
                        as: "attractionDetail"
                    }
                },
                {
                    $unwind: "$businessUser",
                    $unwind: "$attractionDetail"

                },
                { $project: { 'attractionId': 1, 'attractionVisitFeeCurrency': 1, 'attractionVisitFee': 1, 'businessUser.emailId': 1, 'businessUser.contactPersonName': 1, 'attractionDetail.attractionName': 1 } }
            ]).then(this.prepareDealDetail.bind(this, res, dealIds, travelerEmailId, requestDetail))
            .catch(this.handleError.bind(this, res));
    }

    /**
     * Collect Deals information
     */
    prepareDealDetail(res, dealIdList, travelerEmailId, ticketsInformation, requestDetail) {
        var travelerEmailId = travelerEmailId;
        var ticketsInformation = ticketsInformation;
        var requestDetail = requestDetail;
        this.campaignModel.aggregate([
                { "$match": { '_id': { $in: dealIdList } } },
                {
                    $lookup: {
                        from: "businessUsers",
                        localField: "businessUserId",
                        foreignField: "_id",
                        as: "businessUser"
                    }
                },
                {
                    $lookup: {
                        from: "AttractionMaster",
                        localField: "attractionId",
                        foreignField: "attractionId",
                        as: "attractionDetail"
                    }
                },
                {
                    $lookup: {
                        from: "attractionTransaction",
                        localField: "attractionId",
                        foreignField: "attractionId",
                        as: "attractionTransactionDetail"
                    }
                },
                {
                    $unwind: "$businessUser",
                    $unwind: "$attractionDetail",
                    $unwind: "$attractionTransactionDetail"
                },
                { $project: { 'attractionId': 1, 'name': 1, 'campaignDate': 1, 'attractionVisitFeeCurrency': 1, 'attractionVisitFee': 1, 'businessUser.emailId': 1, 'businessUser.contactPersonName': 1, 'attractionDetail.attractionName': 1 } }
            ]).then(this.sendEmailToTravellrCallback.bind(this, res, ticketsInformation, travelerEmailId, requestDetail))
            .catch(this.handleError.bind(this, res));

    }

    /**
     *send booking email to traveller
     */
    sendEmailToTravellrCallback(res, requestDetail, travelerEmailId, ticketsInformation, dealInformation) {
        try {
            if (requestDetail.children == null) {
                requestDetail.children = "0";
            }
            var requestSummary = '<table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border: 1px solid #DDDDDD;"><tr><td colspan="3" style="text-align: center; background-color:#48555d; font-family:Arial, Helvetica, sans-serif; color:#FFFFFF; font-size:15px; font-weight:bold; padding: 7px 10px; border-bottom: 1px solid #DDDDDD;">Traveller Details</td></tr><tr><td width="130"><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:13px; font-weight:bold; padding:7px 10px; margin: 0;">Name</p></td><td width="2" style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; margin: 0;">:</td><td><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:14px; font-weight:normal; padding:7px 10px; margin: 0;">' + requestDetail.firstName + ' ' + requestDetail.lastName + '</p></td></tr>';
            requestSummary += '<tr><td width="130"><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:13px; font-weight:bold; padding:7px 10px; margin: 0;">Email</p></td><td width="2" style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; margin: 0;">:</td><td><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:14px; font-weight:normal; padding:7px 10px; margin: 0;">' + requestDetail.emailId + '</p></td>';
            requestSummary += '<tr><td width="130"><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:13px; font-weight:bold; padding:7px 10px; margin: 0;">Contact No</p></td><td width="2" style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; margin: 0;">:</td><td><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:14px; font-weight:normal; padding:7px 10px; margin: 0;">' + requestDetail.contactNo + '</p></td></tr>';
            requestSummary += '<tr><td width="130"><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:13px; font-weight:bold; padding:7px 10px; margin: 0;">No of Travelers</p></td><td width="2" style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; margin: 0;">:</td><td><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:14px; font-weight:normal; padding:7px 10px; margin: 0;">Adults - ' + requestDetail.adult + ', Children - ' + requestDetail.children + '</p></td></tr>'
            var description = "";
            var children = "";

            if (requestDetail.description == undefined) {
                description = "-";
            } else {
                description = requestDetail.description;
            }
           
            requestSummary += '<tr><td width="130"><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:13px; font-weight:bold; padding:7px 10px; margin: 0;">Description</p></td><td width="2" style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; margin: 0;">:</td><td><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:14px; font-weight:normal; padding:7px 10px; margin: 0;">' + description + '</p></td></tr></table>';
            var bookingSummary = requestSummary;
            if (ticketsInformation.length > 0) {
                bookingSummary += '<table border="0" cellspacing="0" cellpadding="0" style="margin-top:30px; width: 100%;"><tr><td colspan="2" style="margin: 0; padding: 0 0 10px;"><p style="text-align: center; background-color:#48555d; font-family:Arial, Helvetica, sans-serif; color:#FFFFFF; font-size:15px; margin: 0; font-weight:bold; padding: 7px 10px;">Tickets</p></td></tr>'
                    //bookingSummary += "<h3>Tickets</h3><ul>";
                ticketsInformation.forEach(function(ticket) {
                    bookingSummary += '<tr><td style="padding: 5px 0;"><div class="ticket" style="border: 1px solid #DDDDDD;"><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Attraction</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + ticket.attractionDetail.attractionName + '</p><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Ticket Price</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + ticket.attractionVisitFeeCurrency + ticket.attractionVisitFee + '</p></div></td></tr>'
                        //bookingSummary += "<li><b>Attraction</b>  - " + ticket.attractionDetail.attractionName + ", <b>Ticket Price</b> - " + ticket.attractionVisitFeeCurrency + ticket.attractionVisitFee;
                }, this);
                bookingSummary += "</table>"
            }
            if (dealInformation.length > 0) {
                bookingSummary += '<table border="0" cellspacing="0" cellpadding="0" style="margin-top:30px; width: 100%;"><tr><td colspan="2" style="margin: 0; padding: 0 0 10px;"><p style="text-align: center; background-color:#48555d; font-family:Arial, Helvetica, sans-serif; color:#FFFFFF; font-size:15px; margin: 0; font-weight:bold; padding: 7px 10px;">Deals</p></td></tr>'
                    //bookingSummary += "<h3>Deals</h3><ul>";
                dealInformation.forEach(function(deal) {
                    var dealStartDate = this.commonController.converDateformatToDayDateMonthYear(deal.campaignDate.startDate);
                    var dealEndDate = this.commonController.converDateformatToDayDateMonthYear(deal.campaignDate.endDate)
                    bookingSummary += '<tr><td style="padding: 5px 0;"><div class="ticket" style="border: 1px solid #DDDDDD;"><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Attraction</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + deal.attractionDetail[0].attractionName + '</p><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Deal</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + deal.name + '</p><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Deal Validity</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + dealStartDate + ' to ' + dealEndDate + '</p></div></td></tr>'
                        //bookingSummary += "<li><b>Attraction</b>  - " + deal.attractionDetail[0].attractionName + ", <b>Deal</b> - " + deal.name + " <b>Deal Validity</b> " + dealStartDate + " to " + dealEndDate
                }, this);
                bookingSummary += "</table>"
            }
            var travellerData = {
                'travelerEmail': travelerEmailId,
                'bookingDetail': bookingSummary
            }
            var emailController = new EmailController(this.getFullUrl(res.req));
            //return
            emailController.sendBookingRequestEmailTotraveller(travellerData);

            ticketsInformation.forEach(function(ticket) {
                if (ticket.businessUser.length > 0) {
                    var businessUserTicketDetail = "";
                    businessUserTicketDetail += requestSummary + '<table border="0" cellspacing="0" cellpadding="0" style="margin-top:30px; width: 100%;"><tr><td colspan="2" style="margin: 0; padding: 0 0 10px;"><p style="text-align: center; background-color:#48555d; font-family:Arial, Helvetica, sans-serif; color:#FFFFFF; font-size:15px; margin: 0; font-weight:bold; padding: 7px 10px;">Tickets</p></td></tr><tr><td style="padding: 5px 0;"><div class="ticket" style="border: 1px solid #DDDDDD;"><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Attraction</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + ticket.attractionDetail.attractionName + '</p><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Ticket Price</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + ticket.attractionVisitFeeCurrency + ticket.attractionVisitFee + '</p></div></td></tr>'
                        // "<h3>Ticket</h3><ul>" + "<li><b>Attraction</b>  - " + ticket.attractionDetail.attractionName + ", <b>Ticket Price</b> - " + ticket.attractionVisitFeeCurrency + ticket.attractionVisitFee;
                    var businessUserData = {
                        'businessUserEmail': ticket.businessUser[0].emailId,
                        'bookingDetail': businessUserTicketDetail,
                        'businessUserName': ticket.businessUser[0].contactPersonName
                    }
                    businessUserTicketDetail += "</table>"
                    emailController.sendBookingRequestEmailTobusinesuser(businessUserData);
                }
            }, this);


            dealInformation.forEach(function(deal) {
                if (deal.businessUser.length > 0) {
                    var businessUserDealDetail = "";
                    var dealStartDate = this.commonController.converDateformatToDayDateMonthYear(deal.campaignDate.startDate);
                    var dealEndDate = this.commonController.converDateformatToDayDateMonthYear(deal.campaignDate.endDate)

                    businessUserDealDetail += requestSummary + '<table border="0" cellspacing="0" cellpadding="0" style="margin-top:30px; width: 100%;"><tr><td colspan="2" style="margin: 0; padding: 0 0 10px;"><p style="text-align: center; background-color:#48555d; font-family:Arial, Helvetica, sans-serif; color:#FFFFFF; font-size:15px; margin: 0; font-weight:bold; padding: 7px 10px;">Deals</p></td></tr><tr><td style="padding: 5px 0;"><div class="ticket" style="border: 1px solid #DDDDDD;"><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Attraction</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + deal.attractionDetail[0].attractionName + '</p><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Deal</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + deal.name + '</p><p style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:11px; font-weight:normal; padding:7px 10px 0; margin: 0;">Deal Validity</p><p style="font-family:Arial, Helvetica, sans-serif; color:#48555d; font-size:14px; font-weight:bold; padding:3px 10px 7px; margin: 0;">' + dealStartDate + " to " + dealEndDate + '</p></div></td></tr>';
                    //"<h3>Deal</h3><ul>" + "<li><b>Attraction</b>  - " + deal.attractionDetail[0].attractionName + ", <b>Deal</b> - " + deal.name + " <b>Deal Validity</b> " + dealStartDate + " to " + dealEndDate
                    var businessUserData = {
                        'businessUserEmail': deal.businessUser.length > 0 ? deal.businessUser[0].emailId : appConfig.appKeys.defaultAdminEmailId,
                        'bookingDetail': businessUserDealDetail,
                        'businessUserName': deal.businessUser.length > 0 ? deal.businessUser[0].contactPersonName : "Admin"
                    }
                    businessUserDealDetail += "</ul>"
                    emailController.sendBookingRequestEmailTobusinesuser(businessUserData);
                }
            }, this);
            var adminEmailId = dealNotificationEmail; //appConfig.appKeys.defaultAdminEmailId;
            var adminData = {
                'adminEmailId': adminEmailId,
                'bookingDetail': bookingSummary
            }
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.sendBookingRequestEmailToAdminUser(adminData);


        } catch (error) {

        }
    }

    bookingAddCallback(res, message, bookingDetails) {
        this.send(res, 200, message, bookingDetails);
    }

    getBookingDetails(req, res) {

        var conditions = req.body;

        if (conditions.type === "Deal") {
            this.booking.aggregate([
                    { $match: { "_id": new ObjectId(conditions._id) } },
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
                    { $match: { "bookingSummary.deals._id": new ObjectId(conditions.dealId) } },
                ]).then(this.getBookingDetailsCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } else {
            this.booking.aggregate([
                    { $match: { "_id": new ObjectId(conditions._id) } },
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
                    { $match: { "bookingSummary.tickets._id": new ObjectId(conditions.ticketId) } },
                ]).then(this.getBookingDetailsCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        }
    }

    getBookingDetailsCallback(res, bookingDetails) {
        this.send(res, 200, 'Booking Details.', bookingDetails[0]);
    }

}

module.exports = bookingController;
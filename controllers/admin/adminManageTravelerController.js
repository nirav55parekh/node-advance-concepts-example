// models
// var travelerMasterModel = require('../models/admin/travelerMasterModel');
var traveller = require('../../models/traveller');
var multer = require('multer');
var fs = require('fs-extra');
var path = require('path');
var mv = require('mv');
var Q = require('q');


//controllers
var BaseController = require('../baseController');
var CommonController = require('../commonServicesController');

//include enums
var Messages = require('../../enum/wootravelEnum');


class adminManageTravelerController extends BaseController {
    constructor() {
        super();
        this.traveller = traveller;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    getTravelerData(req, res) {

        var search = req.query;
        var that = this;

        var aggregate = traveller.aggregate();

        aggregate
            .lookup({ from: "countries", localField: "countryId", foreignField: "countryId", as: "travelerCountry" })
            .lookup({ from: "states", localField: "stateId", foreignField: "stateId", as: "travelerState" })
            .lookup({ from: "cities", localField: "cityId", foreignField: "cityId", as: "travelerCity" })
            .match({ $or: [{ emailId: new RegExp(search.searchValue, "i") }, { fullName: new RegExp(search.searchValue, "i") }], "isDeleted": false })
            .project({
                travelerName: "$fullName",
                travelerEmail: "$emailId",
                travelerAddress: "$address",
                travelerZipcode: "$zipcode",
                travelerGender: "$gender",
                isEmailVerified: "$isEmailVerified",
                travelerCountry: {
                    $arrayElemAt: [
                        "$travelerCountry.name",
                        0
                    ]
                },
                travelerState: {
                    $arrayElemAt: [
                        "$travelerState.name",
                        0
                    ]
                },
                travelerCity: {
                    $arrayElemAt: [
                        "$travelerCity.name",
                        0
                    ]
                },
                travelerStatus: "$isActive"
            });

        traveller.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
            function (err, results, pageCount, count) {
                that.travelerDataCallBack(res, results, search, pageCount, count);
            });
    }

    // http://172.16.4.102:4400/api/adminManageTravelers/getAllTravelers
    // http://172.16.4.102:4400/api/adminManageAttractions/getallattractions
    // http://172.16.3.15:4400/api/adminManageTraveler/getAllTravelers?page=1&pgsize=10&sord=asc

    /**
     * attracion data callback 
     */
    travelerDataCallBack(res, results, search, pageCount, count) {
        var travelerdata = {
            travellers: results,
            page: parseInt(search.page),
            records: count,
            total: Math.ceil(count / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' travellers', travelerdata);
    }

    updateTravelerStatus(req, res) {
        var travelerTransectionDetails = req.body.data.isActive;
        var travelerDetails = req.body.data;

        this.traveller.findOneAndUpdate({ "_id": travelerDetails._id }, { $set: travelerDetails }, { new: true })
            .then(this.updateTravelerTransectionDetails.bind(res, travelerTransectionDetails))
            .catch(this.handleError.bind(this, res));
    }

    updateTravelerTransectionDetails(res, data) {
        this.send(res, 200, "Traveler Details has been Updated", data);
    }

    // updateTravelerTransectionDetails(res, travelerTransectionDetails, travelerDetails) {

    //     this.traveller.findOneAndUpdate({ "_id": travelerDetails._id }, { $set: { 'isActive': travelerTransectionDetails } }, { upsert: true, new: true, setDefaultsOnInsert: true })
    //         .then(this.updateTravelerTransectionDetailsCallback.bind(this, res))
    //         .catch(this.handleError.bind(this, res));
    // }

    // updateTravelerTransectionDetailsCallback(res, data) {
    //     this.send(res, 200, "Traveler Details has been Updated", data);
    // }

    deleteTraveler(req, res) {
        // this.traveller.remove({ "_id": req.body.data })
        this.traveller.findOneAndUpdate({ "_id": req.body.data }, { $set: { isDeleted: true, } }, { new: true })
            .then(this.deleteTravelerCallback.bind(res, req.body.data))
            .catch(this.handleError.bind(this, res));
    }

    deleteTravelerCallback(res, data) {
        this.send(res, 200, "Traveler Details has been Updated", data);
    }

}

module.exports = adminManageTravelerController;
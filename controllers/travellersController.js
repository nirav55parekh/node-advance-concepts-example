//include models
var TravellerModel = require('../models/traveller');
var travelerTripModel = require('../models/travelerTripModel');
var TokenModel = require('../models/token');
let attractionMasterListModel = require("../models/attractionMasterModel");
let states = require("../models/state");
let cities = require("../models/city");
let attractionNearByTempModel = require("../models/attractionNearByTempModel");
let whatsAroundMeTempModel = require("../models/whatsAroundMeTempModel");
var TravellerProfilesModel = require('../models/travellerProfiles');
var TravellerThemesModel = require('../models/travellerThemes');
var https = require('https');
let _ = require("lodash");

//include controllers
var BaseController = require('./baseController');
var CommonController = require('./commonServicesController');
var EmailController = require('./emailController');

//include enums
var Messages = require('../enum/wootravelEnum');

var ObjectId = require('mongodb').ObjectId;

var Q = require('q');

class TravellersController extends BaseController {
    constructor() {
        super();
        this.Traveller = TravellerModel;
        this.Token = TokenModel;
        this.TravellerProfiles = TravellerProfilesModel;
        this.TravellerThemes = TravellerThemesModel;
        this.travelerTripModel = travelerTripModel;
        this.attractionMasterList = attractionMasterListModel;
        this.states = states;
        this.cities = cities;
        this.attractionNearByTempModel = attractionNearByTempModel;
        this.whatsAroundMeTempModel = whatsAroundMeTempModel;
        this.reqToken = "";
        this.commonController = new CommonController();
    }

    saveTravelerTrip(req, res) {

        if (req.body.tripStartDate != null || req.body.tripStartDate != "") {
            var startDateObject = req.body.tripStartDate.split("/");
            req.body.tripStartDate = startDateObject[2] + "-" + startDateObject[0] + "-" + startDateObject[1] + "T00:00:00.00Z";
        }

        if (req.body.tripEndDate != null || req.body.tripEndDate != "") {
            var endDateObject = req.body.tripEndDate.split("/");
            req.body.tripEndDate = endDateObject[2] + "-" + endDateObject[0] + "-" + endDateObject[1] + "T00:00:00.00Z";
        }

        var saveTrip = new this.travelerTripModel(req.body);

        if (req.body.tripId) {
            var tripId = req.body.tripId;

            // delete req.body.tripId;

            this.travelerTripModel.findOneAndUpdate({ "_id": tripId }, req.body, { upsert: true, new: true, setDefaultsOnInsert: true })
                .then(this.saveTripCallback.bind(this, res, req.body))
                .catch(this.handleError.bind(this, res));
        } else {
            saveTrip.save()
                .then(this.saveTripCallback.bind(this, res, req.body))
                .catch(this.handleError.bind(this, res));
        }
    }

    saveTripCallback(res, postData, data) {
        data._doc.tripStartDate = this.commonController.convertDateToYYMMDD(data._doc.tripStartDate);
        data._doc.tripEndDate = this.commonController.convertDateToYYMMDD(data._doc.tripEndDate);
        data._doc.last_updated = this.commonController.convertDateToYYMMDD(data._doc.last_updated);
        data._doc.date_created = this.commonController.convertDateToYYMMDD(data._doc.date_created);
        if (postData.tripId) {
            this.send(res, 200, "Trip Details Have Been Updated.", data);
        } else {
            this.send(res, 200, "Trip Details Have Been Saved", data);
        }
    }

    updateMyTrip(req, res) {
        try {
            var tripId = req.body.id;

            this.getTripDetailsForUpdate(tripId)
                .then(this.otherAttractionData.bind(this, res, tripId))
                .catch(this.handleError.bind(this, res));
        } catch (error) {
            this.handleError.bind(this, res)
        }
    }

    getTripDetailsForUpdate(tripId) {

        try {
            return this.travelerTripModel.aggregate([{
                    $match: {
                        _id: new ObjectId(tripId)
                    }
                },
                { $unwind: "$tripSummery" },
                { $unwind: "$tripSummery.tripMainEvents" },
                { $unwind: "$tripSummery.tripMainEvents.attractionList" },
                {
                    $lookup: {
                        from: "AttractionMaster",
                        localField: "tripSummery.tripMainEvents.attractionList.attractionId",
                        foreignField: "attractionId",
                        as: "attraction"
                    }
                },
                { $unwind: "$attraction" },
                {
                    $lookup: {
                        from: "attractionTransaction",
                        localField: "tripSummery.tripMainEvents.attractionList.attractionId",
                        foreignField: "attractionId",
                        as: "attractionTrans"
                    }
                }, {
                    $lookup: {
                        from: "campaigns",
                        localField: "tripSummery.tripMainEvents.attractionList.attractionId",
                        foreignField: "attractionId",
                        as: "campaigns"
                    }
                }
            ]);
        } catch (error) {}
    }

    getOtherAttractionData(tripId) {
        var deferred = Q.defer();

        try {
            this.travelerTripModel.aggregate([{
                    $match: {
                        _id: new ObjectId(tripId)
                            // attractionTransaction.isAttractionActive:{$ne: false }
                    }
                },
                { $unwind: "$tripSummery" },
                { $unwind: "$tripSummery.tripOtherEvents" },
                {
                    $lookup: {
                        from: "AttractionMaster",
                        localField: "tripSummery.tripOtherEvents.attractionId",
                        foreignField: "attractionId",
                        as: "otherAttraction"
                    }
                },
                { $unwind: "$otherAttraction" },
                {
                    $lookup: {
                        from: "attractionTransaction",
                        localField: "tripSummery.tripOtherEvents.attractionId",
                        foreignField: "attractionId",
                        as: "attractionTrans"
                    }
                },
                { $unwind: "$otherAttraction" },
                {
                    $match: {
                        "attractionTrans.isAttractionActive": { $ne: false }
                        // attractionTransaction.isAttractionActive:{$ne: false }
                    }
                }, {
                    $lookup: {
                        from: "campaigns",
                        localField: "tripSummery.tripOtherEvents.attractionId",
                        foreignField: "attractionId",
                        as: "campaigns"
                    }
                }
                // {
                //     $group: {
                //         "_id": "$_id",
                //         "otherAttraction": { $push: '$otherAttraction' },
                //         "attractionTrans": { $push: '$attractionTrans' }
                //     }
                // }
            ]).then(function(data) {
                deferred.resolve(data);
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    otherAttractionData(res, tripId, data) {
        try {
            this.getOtherAttractionData(tripId)
                .then(this.getTripDataFormat.bind(this, res, data, tripId))
                .then(this.getTripDataFormatCallback.bind(this, res))
                // .then(this.updateMyTripDataCallBack.bind(this, res, data))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    getTripDataFormatCallback(res, data) {
        data.identifiedProfile = data.otherDetails.profileId;
        this.send(res, 200, data.result.length + data.otherAttraction.length + ' Record Found', data);
    }

    getTripDataFormat(res, data, tripId, other) {
        var that = this;
        var deferred = Q.defer();
        var tripDataArray = [];
        var masterTripArray = {};
        masterTripArray.result = [];
        masterTripArray.otherAttraction = [];
        masterTripArray.otherDetails = {};

        try {
            this.travelerTripModel.aggregate([{
                        $match: {
                            _id: new ObjectId(tripId)
                        }
                    },
                    {
                        $project: {
                            formatDataObj: "$tripSummery"
                        }
                    }
                ]).then(function(formatData) {

                    var formatedData = formatData[0].formatDataObj.tripMainEvents;
                    data.forEach(function(tripDataResult) {
                        var attaction = tripDataResult.attraction;
                        attaction.attractionTrans = tripDataResult.attractionTrans;
                        attaction.campaigns = tripDataResult.campaigns;
                        tripDataArray.push(attaction);
                    });

                    var tripStartDate = that.commonController.convertDateToYYMMDD(data.length ? data[0].tripStartDate : other[0].tripStartDate);
                    var tripEndDate = that.commonController.convertDateToYYMMDD(data.length ? data[0].tripEndDate: other[0].tripEndDate);
                    var last_updated = that.commonController.convertDateToYYMMDD(data.length ? data[0].last_updated : other[0].last_updated);
                    var date_created = that.commonController.convertDateToYYMMDD(data.length ? data[0].date_created: other[0].date_created);
                    
                    masterTripArray.otherDetails = data.length ? data[0] : _.clone(other[0]);
                    masterTripArray.otherDetails.tripStartDate = tripStartDate;
                    masterTripArray.otherDetails.tripEndDate = tripEndDate;
                    masterTripArray.otherDetails.last_updated = last_updated;
                    masterTripArray.otherDetails.date_created = date_created;

                    delete masterTripArray.otherDetails.attraction;
                    delete masterTripArray.otherDetails.attractionTrans;
                    delete masterTripArray.otherDetails.tripSummery;

                    var formatedMainEventData = formatData[0].formatDataObj.tripMainEvents;

                    formatedMainEventData.forEach(function(formatDataResult, i) {
                        var resultObj = {};
                        var index = '';
                        resultObj.dayTitle = formatDataResult.dayTitle;
                        resultObj.dayNumber = i;
                        var attractionList = []
                        var attList = formatDataResult.attractionList
                        if (attList.length > 0) {
                            attList.forEach(function(attListData) {
                                tripDataArray.forEach(function(tripIndData) {
                                    if (tripIndData.attractionId === attListData.attractionId) {

                                        tripIndData.attractionTravelTheme = tripIndData.attractionTrans[0].attractionTravelTheme;
                                        tripIndData.isAttractionActive = tripIndData.attractionTrans[0].isAttractionActive;
                                        tripIndData.attractionImage = tripIndData.attractionTrans[0].attractionImage;
                                        tripIndData.attractionVisitDuration = tripIndData.attractionTrans[0].attractionVisitDuration;
                                        tripIndData.deals = that.commonController.seperateDealsForUpdate(tripIndData.campaigns, tripIndData.attractionName, tripIndData.attractionId, tripStartDate, tripEndDate, that);
                                        var formatedVisitTimeArray = that.commonController.formatVisitTime(tripIndData.visitTime, that);
                                        tripIndData.visitTime = formatedVisitTimeArray; //dayarray

                                        delete tripIndData.address;
                                        delete tripIndData.campaigns;
                                        delete tripIndData.attractionCityId;
                                        delete tripIndData.attractioncontactNumber;
                                        delete tripIndData.attractionCountry;
                                        delete tripIndData.attractionCityName;
                                        delete tripIndData.attractionState;
                                        delete tripIndData.date_created;
                                        delete tripIndData.last_updated;
                                        delete tripIndData.source;
                                        delete tripIndData.sourceID;
                                        delete tripIndData.attractionTrans;

                                        attractionList.push(tripIndData);
                                    }
                                })
                            });
                        } else {
                            // attractionList.push(attList);
                        }
                        resultObj.attractionList = attractionList;
                        masterTripArray.result.push(resultObj);
                    });

                    other.forEach(function(tripIndData) {

                        var otherAttractionObj = {};

                        otherAttractionObj.attractionTravelTheme = tripIndData.attractionTrans[0].attractionTravelTheme;
                        otherAttractionObj.isAttractionActive = tripIndData.attractionTrans[0].isAttractionActive;
                        otherAttractionObj.attractionImage = tripIndData.attractionTrans[0].attractionImage;
                        otherAttractionObj.attractionVisitDuration = tripIndData.attractionTrans[0].attractionVisitDuration;
                        var formatedVisitTimeArray = that.commonController.formatVisitTime(tripIndData.otherAttraction.visitTime, that);
                        otherAttractionObj.visitTime = formatedVisitTimeArray; //dayarray;
                        otherAttractionObj.deals = that.commonController.seperateDealsForUpdate(tripIndData.campaigns, tripIndData.attractionName, tripIndData.attractionId, tripStartDate, tripEndDate, that);
                        //otherAttractionObj.deals = that.commonController.seperateDealsForUpdate(tripIndData.campaigns, tripIndData.attractionName, tripIndData.attractionId, that);
                        otherAttractionObj.attractionId = tripIndData.otherAttraction.attractionId;
                        otherAttractionObj.attractionName = tripIndData.otherAttraction.attractionName;
                        otherAttractionObj.coords = tripIndData.otherAttraction.coords;
                        otherAttractionObj.attractioncategory = tripIndData.otherAttraction.attractioncategory;
                        otherAttractionObj.attractionRating = tripIndData.otherAttraction.attractionRating;

                        masterTripArray.otherAttraction.push(otherAttractionObj);
                    })

                    // that.send(res, 200, masterTripArray.result.length + masterTripArray.otherAttraction.length + ' Record dsfsdffd Found', masterTripArray);
                    deferred.resolve(masterTripArray);
                })
                .catch(this.handleError.bind(this, res));
            return deferred.promise;
        } catch (error) {

        }
    }

    extend(target) {
        var sources = [].slice.call(arguments, 1);
        sources.forEach(function(source) {
            for (var prop in source) {
                target[prop] = source[prop];
            }
        });
        return target;
    }

    getMyTrip(req, res) {
        try {
            var travelerId = req.body.id;

            this.getTravelerTripResult(travelerId)
                .then(this.travelerDataCallBack.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    getSimilerAttraction(req, res) {
        try {
            var data = req.body;

            this.getSimilerAttractionData(data)
                .then(this.getSimilerAttractionDataCallBack.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    getDataFormatedREsponce(data) {
        // return data;

        var FormatedArray = [];
        var pleaseCheck = [];
        var tranObj = {};
        var _this = this;
        data.forEach(function(obj) {
            tranObj = obj.attrTransactionDetail;
            var formatedVisitTimeArray = _this.commonController.formatVisitTime(obj.visitTime, _this);
            var formattedObj = {
                "attractionId": obj.attractionId,
                "attractionName": obj.attractionName,
                "attractionRating": (obj.attractionRating) ? obj.attractionRating : 0,
                "coords": {
                    "lng": obj.coords.lng,
                    "lat": obj.coords.lat
                },
                "visitTime": formatedVisitTimeArray, //dayarray, //obj.visitTime,
                "attractionTravelTheme": tranObj.attractionTravelTheme,
                "attractioncategory": obj.attractioncategory,
                "attractionVisitDuration": (tranObj.attractionVisitDuration || tranObj.attractionVisitDuration == 0) ? tranObj.attractionVisitDuration : 120,
                "isKidFriendly": (obj.isKidFriendly) ? obj.isKidFriendly : true,
                "visitorFee": (obj.visitorFee) ? obj.visitorFee : 0,
                "attractionImage": (tranObj.attractionImage) ? tranObj.attractionImage : '',
                // "startTime": "9:00 am",
            }
            FormatedArray.push(formattedObj);
        });

        return FormatedArray;
    }

    getSimilerAttractionDataCallBack(res, data) {
        var responce = this.getDataFormatedREsponce(data);
        this.send(res, 200, responce.length + ' Record Found', responce); //try to debug here
        // this.send(res, 200, data.length + ' Record Found', data); //try to debug here
    }

    getSimilerAttractionData(data) {
        try {
            return this.attractionMasterList.aggregate([{
                    $match: {
                        "attractioncategory": { $in: data.attractioncategory },
                        "attractionId": { $ne: data.attractionId },
                        "attractionCityId": data.attractionCityId
                    }
                }, {
                    $lookup: {
                        //from: "attractionTransaction_Test",
                        from: "attractionTransaction",
                        localField: "attractionId",
                        foreignField: "attractionId",
                        as: "attrTransactionDetail"
                    }
                },
                { $unwind: "$attrTransactionDetail" }
            ]).sort({ attractionRating: -1 }).limit(10)
        } catch (error) {

        }
    }

    whatsAroundMe(req, res) {

        var deferred = Q.defer();
        var placesNearbyOptions = {};
        var that = this;
        var options = '';

        placesNearbyOptions = {
            // location: param.location,
            lat: 51.338025,
            long: 0.005064,
            radius: 25000, // in meters
            // type: param.type
        };
        // options = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' + param.location + '&radius=25000&type=' + param.type + '&key=' + apiKey;
        // options = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=51.5184928,-0.1676726&key=AIzaSyCdklJOgnuo9Hwaxq4Wf0CnB-5o-qWFybM';
        options = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + req.body.lat + ',' + req.body.lng + '&key=AIzaSyCdklJOgnuo9Hwaxq4Wf0CnB-5o-qWFybM';

        // var options = parse(options);
        // options.headers = {
        //     'User-Agent': 'GoogleGeoApiClientJS/0.0.1'
        // };
        var city = '';
        var state = '';
        https.request(options, function(response) {
            var str = '';
            response.on('data', function(chunk) {
                str += chunk;
            });
            response.on('end', function() {
                let results = JSON.parse(str).results;
                // deferred.resolve({ places: data.results, next_page_token: data.next_page_token, location: param.location });

                if (results[1]) {
                    for (var i = 0; i < results[0].address_components.length; i++) {
                        for (var b = 0; b < results[0].address_components[i].types.length; b++) {
                            if (results[0].address_components[i].types[b] == "administrative_area_level_1") {
                                state = results[0].address_components[i];
                                break;
                            }
                            if (results[0].address_components[i].types[b] == "locality") {
                                city = results[0].address_components[i];
                                break;
                            }
                        }
                    }
                } else {
                    // alert("No results found");
                }

                var obj = {
                    city: city.long_name,
                    state: state.long_name
                }
                var data = req.body;
                data.meters = 5;
                data.location = obj;

                that.getAroundMeStateId(data)
                    .then(that.getAroundMeCityId.bind(that, res, data))
                    .then(that.whatsAroundMeProcess.bind(that, res, data))
                    .catch(that.handleError.bind(that, res));
            });

        }).end();

        return deferred.promise;

    }

    whatsAroundMeProcess(res, postData, data) {

        var whatsAroundMeObj = {
            lat: postData.lat,
            lng: postData.lng,
            cityId: data[0].cityId,
            meters: postData.meters,
            isKidFriendly: postData.isKidFriendly
        }

        this.getAroundData(whatsAroundMeObj)
            .then(this.getAroundDataCallBack.bind(this, res, whatsAroundMeObj))
            // .then(that.whatsAroundMeProcess.bind(that, res, data))
            .catch(this.handleError.bind(this, res));
    }

    getAroundDataCallBack(res, postData, data) {
        var tempArray = [];
        _.each(data, (dataItem) => {
            dataItem.location = {};
            if (dataItem.coords) {
                dataItem.location.type = 'Point';
                dataItem.location.coordinates = [dataItem.coords.lng, dataItem.coords.lat];
            } else {
                dataItem.location.type = 'Point';
                dataItem.location.coordinates = [0, 0];
            }
            delete dataItem['_id'];
            delete dataItem['last_updated'];
            delete dataItem['date_created'];
            delete dataItem['visitTime'];
            delete dataItem['__v'];
            tempArray.push(dataItem);
        });

        this.whatsAroundMeTempModel.insertMany(tempArray)
            .then(this.getAroundMeData.bind(this, res, postData))
            .catch(this.handleError.bind(this, res));
    }


    getAroundMeData(res, postData, resData) {
        this.getAroundMeDataFromTempDoc(postData)
            .then(this.getAroundMeDataCallback.bind(this, res, postData))
            .catch(this.handleError.bind(this, res));
    }

    getAroundMeDataCallback(res, postData, data) {
        // var defer = Q.defer();
        var finalObj = {};
        if (data.length <= 0 && postData.meters < 15) {
            postData.meters = postData.meters + 5;
            this.getAroundMeData(res, postData, data)
        } else {
            var responce = this.getDataFormatedREsponce(data);
            finalObj.cityId = postData.cityId;
            finalObj.resultData = responce;
            this.whatsAroundMeTempModel.deleteMany()
                .then(function(res) {

                })
                .catch(function(err) {

                });
            this.send(res, 200, responce.length + ' Record Found', finalObj);
        }
    }

    getAroundMeDataFromTempDoc(data) {
        var deferred = Q.defer();

        try {
            this.whatsAroundMeTempModel.aggregate(
                [{
                        "$geoNear": {
                            "near": {
                                "type": "Point",
                                "coordinates": [data.lng, data.lat]
                            },
                            "spherical": true,
                            "maxDistance": (data.meters * 1609.34),
                            // "maxDistance": (data.meters * 1),
                            "distanceField": "distance"
                        }
                    }, {
                        $lookup: {
                            //from: "attractionTransaction_Test",
                            from: "attractionTransaction",
                            localField: "attractionId",
                            foreignField: "attractionId",
                            as: "attrTransactionDetail"
                        }
                    },
                    { "$unwind": "$attrTransactionDetail" },
                    { "$sort": { "distance": 1 } }
                ]).then(function(data) {
                deferred.resolve(data);
            });
        } catch (error) {
            deferred.reject(error);
        }
        return deferred.promise;
    }

    getAroundData(data) {
        try {
            return this.attractionMasterList.aggregate([{
                    $lookup: {
                        from: "attractionTransaction",
                        localField: "attractionId",
                        foreignField: "attractionId",
                        as: "attrTransactionDetail"
                    }
                },
                { "$unwind": "$attrTransactionDetail" },
                {
                    $match: {
                        "attractionCityId": data.cityId,
                        "attrTransactionDetail.isKidFriendly": data.isKidFriendly
                    }
                },
                // {
                //     $match: {
                //         "$attrTransactionDetail.isKidFriendly": data.isKidFriendly
                //     }
                // }
            ])
        } catch (error) {

        }
    }

    getAroundMeCityId(res, postData, data) {
        try {
            return this.cities.aggregate([{
                $match: {
                    "stateId": data[0].stateId,
                    "name": postData.location.city
                }
            }])
        } catch (error) {

        }
    }

    getAroundMeStateId(data) {
        try {
            return this.states.aggregate([{
                $match: {
                    "name": data.location.state,
                    // "attractionCityId": data.attractionCityId
                }
            }])
        } catch (error) {

        }
    }

    getNearByAttraction(req, res) {
        try {
            var data = req.body;
            data.meters = 5;

            this.getNearByAttractionData(data)
                .then(this.getNearByAttractionDataCallBack.bind(this, res, data))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    getNearByAttractionData(data) {
        try {
            return this.attractionMasterList.aggregate([{
                $match: {
                    "attractionId": { $ne: data.attractionId },
                    "attractionCityId": data.attractionCityId
                }
            }])
        } catch (error) {

        }
    }

    getNearByAttractionDataCallBack(res, postData, data) {
        var tempArray = [];
        _.each(data, (dataItem) => {
            dataItem.location = {};
            if (dataItem.coords) {
                dataItem.location.type = 'Point';
                dataItem.location.coordinates = [dataItem.coords.lng, dataItem.coords.lat];
            } else {
                dataItem.location.type = 'Point';
                dataItem.location.coordinates = [0, 0];
            }
            delete dataItem['_id'];
            delete dataItem['last_updated'];
            delete dataItem['date_created'];
            // delete dataItem['visitTime'];
            delete dataItem['__v'];
            tempArray.push(dataItem);
        });

        this.attractionNearByTempModel.insertMany(tempArray)
            .then(this.getNearByData.bind(this, res, postData))
            .catch(this.handleError.bind(this, res));
        // .then(function (respo) {
        //     respo
        // })
        // .catch(function (err) {
        //     err
        // });

        // this.send(res, 200, tempArray.length + ' Record Found', tempArray);//ty to debug here
    }

    getNearByData(res, postData, resData) {
        this.getNearByDataFromTempDoc(postData)
            .then(this.getNearByDataCallback.bind(this, res, postData))
            .catch(this.handleError.bind(this, res));
    }

    getNearByDataCallback(res, postData, data) {
        // var defer = Q.defer();
        if (data.length <= 0 && postData.meters < 15) {
            postData.meters = postData.meters + 5;
            this.getNearByData(res, postData, data)
        } else {
            var responce = this.getDataFormatedREsponce(data);
            this.attractionNearByTempModel.deleteMany()
                .then(function(res) {

                })
                .catch(function(err) {

                });
            this.send(res, 200, responce.length + ' Record Found', responce);
        }
    }

    getNearByDataFromTempDoc(data) {
        var deferred = Q.defer();

        try {
            this.attractionNearByTempModel.aggregate(
                [{
                        "$geoNear": {
                            "near": {
                                "type": "Point",
                                "coordinates": [data.lng, data.lat]
                            },
                            "spherical": true,
                            "maxDistance": (data.meters * 1609.34),
                            "distanceField": "distance"
                        }
                    }, {
                        $lookup: {
                            //from: "attractionTransaction_Test",
                            from: "attractionTransaction",
                            localField: "attractionId",
                            foreignField: "attractionId",
                            as: "attrTransactionDetail"
                        }
                    },
                    { "$unwind": "$attrTransactionDetail" },
                    { "$sort": { "distance": 1 } }
                ]).then(function(data) {
                deferred.resolve(data);
            });
        } catch (error) {
            deferred.reject(error);
        }
        return deferred.promise;
    }

    travelerDataCallBack(res, data) {

        var date = new Date();
        date = date.getFullYear() + '/' + ("0" + (date.getMonth() + 1)).slice(-2) + '/' + ("0" + (date.getDate())).slice(-2);
        var upcoming = [];
        var completed = [];
        var master = {};
        // console.log(data.);

        try {
            // var deferred = Q.defer();
            for (var i = 0; i < data.length; i++) {
                if (data[i].tripEndDate >= date) {
                    upcoming.push(data[i]);
                } else {
                    completed.push(data[i]);
                }
            }
            master["completed"] = completed;
            master["upcoming"] = upcoming;
            // deferred.resolve(master);
            this.send(res, 200, data.length + ' Record Found', master);
        } catch (error) {

        }
    }

    deleteTrip(req, res) {
        this.travelerTripModel.remove({ "_id": req.body.id })
            .then(this.deleteTripCallback.bind(res, req.body.data))
            .catch(this.handleError.bind(this, res));
    }

    deleteTripCallback(res, data) {
        this.send(res, 200, "Trip has been Deleted", data);
    }

    getTravelerTripResult(travellerrId) {
        try {
            return this.travelerTripModel.aggregate([{
                    $match: {
                        // travelerId: new ObjectId(travellerrId)
                        travelerId: travellerrId
                    }
                },
                {
                    $project: {
                        // _id: 1,
                        tripStartDate: { $dateToString: { format: "%Y/%m/%d", date: "$tripStartDate" } },
                        tripEndDate: { $dateToString: { format: "%Y/%m/%d", date: "$tripEndDate" } },
                        last_updated: { $dateToString: { format: "%Y/%m/%d %H:%M:%S:%L", date: "$last_updated" } },
                        destinationId: "$destinationId",
                        tripName: "$tripName",
                        destinationName: "$destinationName"
                    }
                }, { $sort: { tripStartDate: 1 } }
            ]);
        } catch (error) {

        }
    }

    checkEmailForVerificationExist(req, res) {

        var email = req.body.email;
        this.Traveller.findOne({ emailId: new RegExp('^' + email + '$', "i"), isEmailVerified: false })
            .then(this.checkEmailAddressExistCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    checkEmailAddressExist(req, res) {

        var email = req.body.email;
        this.Traveller.findOne({ emailId: new RegExp('^' + email + '$', "i"), isEmailVerified: false })
            .then(this.isTravellerExist.bind(this, res))
            .then(this.checkEmailAddressExistCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    checkEmailAddressExistCallback(res, data) {
        if (data) {
            this.send(res, 200, "Email ID already exist and waiting for the user verification", null);
        } else {
            this.send(res, 412, "", null);
        }
    }

    createTraveller(req, res) {

        try {
            var that = this;
            this.Traveller.findOne({ emailId: new RegExp('^' + req.body.emailId + '$', "i") })
                .then(this.checkNewUser.bind(this, res, req))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }


    checkNewUser(res, req, data) {
        if (!data || data._doc.isDeleted) {
            var newTraveller = new this.Traveller({
                emailId: req.body.emailId,
                password: req.body.password,
                fullName: req.body.fullName,
                gender: req.body.gender,
                isEmailVerified: false,
                isSocialLogin: false,
                cityId: req.body.cityId || null,
                countryId: req.body.countryId || null,
                stateId: req.body.stateId || null,
                address: req.body.address || null,
                zipcode: req.body.zipcode || null,
                isActive: false
            });
            newTraveller.save()
                .then(this.sendEmailVerificationCallback.bind(this, res))
                .then(this.createTravellerCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } else {
            if (data._doc.isEmailVerified) {
                this.send(res, 412, Messages.error.travellerExist, "");
            } else {
                this.send(res, 412, Messages.error.VerifyEmail, "");
            }

        }
    }

    /**
     *sendEmailVerificationCallback function
     */
    sendEmailVerificationCallback(res, data) {
        //send Verification mail to traveller.
        try {
            var emailController = new EmailController(this.getFullUrl(res.req));
            return emailController.sendVerification(data);
        } catch (error) {

        }
    }

    /**
     *createUserCallback function
     */
    createTravellerCallback(res, data) {
        var message = Messages.error.NewAccount;
        this.send(res, 200, message, data);
    }

    resendVerificationLink(req, res) {
        try {
            var email = req.body.email;
            this.Traveller.findOne({ emailId: new RegExp('^' + email + '$', "i"), isEmailVerified: false })
                .then(this.isEmailVerificationTravellerExist.bind(this, res))
                .then(this.updateRegisteredUserToken.bind(this, res))
                .then(this.sendEmailVerificationCallback.bind(this, res))
                .then(this.getUpdateRegisteredUserToken.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }


    isEmailVerificationTravellerExist(res, traveller) {
        try {
            var deferred = Q.defer();

            if (traveller) {
                deferred.resolve(traveller);
            } else {
                deferred.reject(new Error(Messages.error.InvalidEmailId));
            }

            return deferred.promise;
        } catch (error) {

        }

    }

    updateRegisteredUserToken(res, traveller) {
        var deferred = Q.defer();
        try {
            this.Token.findOneAndUpdate({ userId: new ObjectId(traveller._doc._id), type: "EmailVerify", isExpired: false }, { $set: { isExpired: true } }, { new: true })
                .then(function () {
                    deferred.resolve(traveller);
                })
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
        return deferred.promise;
    }

    getUpdateRegisteredUserToken(res, data) {
        this.send(res, 200, 'Email verification url sent.', "");
    }

    getTravellerProfile(req, res) {
        try {
            var travellerrId = req.body.id;

            this.getTravellerProfileResult(travellerrId)
                .then(this.getTravellerProfileCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    getTravellerProfileCallback(res, data) {
        this.send(res, 200, data.length + ' Record Found', data[0]);
    }

    updateTravellerProfile(req, res) {

        try {
            var travellerDetails = req.body;

            this.Traveller.findById(travellerDetails._id, function(err, traveller) {
                var oldEmailId = "";
                if (traveller._doc.emailId !== travellerDetails.emailId) {
                    oldEmailId = traveller.emailId;
                    traveller.isEmailVerified = false;
                }
                traveller.emailId = travellerDetails.emailId;
                traveller.fullName = travellerDetails.fullName;
                traveller.gender = travellerDetails.gender || null;
                traveller.cityId = travellerDetails.cityId || null;
                traveller.countryId = travellerDetails.countryId || null;
                traveller.stateId = travellerDetails.stateId || null;
                traveller.address = travellerDetails.address || null;
                traveller.zipcode = travellerDetails.zipcode || null;
                delete traveller._doc.password;

                traveller.save()
                    .then(this.sendUpdatedEmailVerificationCallback.bind(this, res, oldEmailId))
                    .then(this.getUpdateTravellerProfileCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            }.bind(this));
        } catch (error) {

        }

    }

    sendUpdatedEmailVerificationCallback(res, oldEmailId, data) {
        //send Verification mail to traveller.
        try {
            if (oldEmailId !== "") {
                var emailController = new EmailController(this.getFullUrl(res.req));
                emailController.sendEmailUpdatedVerification(data, oldEmailId);
            }
            return data;
        } catch (error) {

        }
    }

    getUpdateTravellerProfileCallback(res, data) {
        this.send(res, 200, ' Information Updated Successfully', data);
    }

    changePassword(req, res) {
        try {
            var travellerDetails = req.body;
            this.Traveller.findById(travellerDetails._id)
                .then(this.compareWithOldPassword.bind(this, res, travellerDetails.oldPassword, travellerDetails.newPassword))
                .then(this.saveChangedPassword.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    changePasswordCallback(res) {
        this.send(res, 200, 'Password changed.', null);
    }

    compareWithOldPassword(res, oldPassword, newPassword, traveller) {
        try {
            var deferred = Q.defer();
            traveller.comparePassword(oldPassword)
                .then(function(isMatch) {
                    if (!isMatch) {
                        deferred.reject(new Error(Messages.error.oldPasswordMatch));
                    } else {
                        if (oldPassword === newPassword) {
                            deferred.reject(new Error(Messages.error.oldNewPasswordMatch));
                        } else {
                            traveller.password = newPassword;
                            deferred.resolve(traveller);
                        }
                    }
                });

            return deferred.promise;
        } catch (error) {

        }

    }

    saveChangedPassword(res, traveller) {
        try {
            traveller.save()
                .then(this.changePasswordCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    setPassword(req, res) {
        try {
            var travellerDetails = req.body;
            this.Traveller.findById(travellerDetails._id)
                .then(this.saveNewPassword.bind(this, res, travellerDetails.newPassword))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    forgotPasswordEmailVerification(req, res) {
        try {
            var email = req.body.email;

            this.Traveller.findOne({ emailId: new RegExp('^' + email + '$', "i"), isActive: true, isDeleted: false })
                .then(this.isTravellerExist.bind(this, res))
                .then(this.sendForgotPasswordEmailLink.bind(this, res))
                .then(this.getForgotPasswordEmailVerificationCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    isTravellerExist(res, traveller) {
        try {
            var deferred = Q.defer();

            if (traveller) {
                if (traveller.isEmailVerified)
                    deferred.resolve(traveller);
                else
                    deferred.reject(new Error(Messages.error.forgotPasswordVerifyEmail));
            } else {
                deferred.reject(new Error(Messages.error.InvalidEmailId));
            }

            return deferred.promise;
        } catch (error) {

        }

    }

    sendForgotPasswordEmailLink(res, traveller) {
        try {
            var deferred = Q.defer();
            var emailController = new EmailController(this.getFullUrl(res.req));
            emailController.sendResetPasswordLink(traveller);
            deferred.resolve(traveller);
            return deferred.promise;
        } catch (error) {

        }
    }

    getForgotPasswordEmailVerificationCallback(res) {
        this.send(res, 200, Messages.error.resetPasswordMail, null);
    }

    resetNewPassword(req, res) {
        try {
            this.reqToken = req.body.token;
            var travellerDetails = req.body;
            this.Traveller.findById(travellerDetails._id)
                .then(this.resetPasswordLinkVerify.bind(this))
                .then(this.saveNewPassword.bind(this, res, travellerDetails.newPassword))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }

    resetPasswordLinkVerify(traveller) {
        try {
            var deferred = Q.defer();

            if (traveller) {
                deferred.resolve(traveller);
            } else {
                deferred.reject(new Error(Messages.error.NotAuthorized));
            }

            return deferred.promise;
        } catch (error) {

        }
    }

    saveNewPassword(res, newPassword, traveller) {
        try {
            traveller.password = newPassword;
            traveller.save()
                .then(this.commonController.expireVerificationLink.bind(this, res, this.reqToken))
                .then(this.changePasswordCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    getTravellerAttractionProfiles(req, res) {
        this.TravellerProfiles.find({ isActive: true }).sort({ profileId: 1 })
            .then(this.getTravellerAttractionProfilesCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getTravellerAttractionProfilesById(req, res) {
        this.TravellerProfiles.find({ isActive: true, profileId: req.params.id })
            .then(this.getTravellerAttractionProfilesCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getTravellerAttractionProfilesByIdInner(id) {
        return this.TravellerProfiles.findOne({ isActive: true, profileId: id });
    }

    getTravellerAttractionProfilesCallback(res, travellerProfiles) {
        this.send(res, 200, 'Traveller Profiles.', travellerProfiles);
    }

    getTravellerAttractionThemes(req, res) {
        this.TravellerThemes.find({ isActive: true })
            .then(this.getTravellerAttractionThemesCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getTravellerAttractionThemesCallback(res, travellerThemes) {
        this.send(res, 200, 'Traveller Themes.', travellerThemes);
    }

    getTravellerProfileResult(travellerrId) {
        try {
            return this.Traveller.aggregate([{
                    $match: {
                        _id: new ObjectId(travellerrId)
                    }
                },
                {
                    $lookup: {
                        from: "cities",
                        localField: "cityId",
                        foreignField: "cityId",
                        as: "city"
                    }
                },
                {
                    $unwind: {
                        path: "$city",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "states",
                        localField: "stateId",
                        foreignField: "stateId",
                        as: "state"
                    }
                },
                {
                    $unwind: {
                        path: "$state",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "countryId",
                        foreignField: "countryId",
                        as: "country",
                    }
                },
                {
                    $unwind: {
                        path: "$country",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        fullName: "$fullName",
                        emailId: "$emailId",
                        cityId: "$cityId",
                        cityName: { $ifNull: ["$city.name", null] },
                        stateId: "$stateId",
                        stateName: { $ifNull: ["$state.name", null] },
                        countryId: "$countryId",
                        countryName: { $ifNull: ["$country.name", null] },
                        gender: "$gender",
                        address: "$address",
                        zipcode: "$zipcode",
                        isSocialLogin: "$isSocialLogin"
                    }
                },
            ]);
        } catch (error) {

        }
    }
}

module.exports = TravellersController;
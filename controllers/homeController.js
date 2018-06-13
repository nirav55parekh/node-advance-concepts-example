//include models
var CountryModel = require('../models/country');
var StateModel = require('../models/state');
var CityModel = require('../models/city');
var QuestionModel = require('../models/question');
var campaignModel = require('../models/campaign');
let attractionMasterListModel = require("../models/attractionMasterModel");
let loyaltyPrograms = require("../models/loyaltyProgram");
let AttractionDetailDayWise = require('./attractionDetailDayWise');
let moment = require('moment');
let _ = require("lodash");
//include controllers
var BaseController = require('./baseController');

//include wootravelEnum
var Messages = require('../enum/wootravelEnum');
var CommonController = require('./commonServicesController');
var mongoose = require('mongoose');
class HomeController extends BaseController {
    constructor() {
        super();
        this.City = CityModel;
        this.State = StateModel;
        this.Country = CountryModel;
        this.Question = QuestionModel;
        this.campaign = campaignModel;
        this.attractionMasterList = attractionMasterListModel;
        this.LoyaltyPrograms = loyaltyPrograms;
        this.commonController = new CommonController();
    }

    /**
     * Get Destination
     * params req - Express request Object
     * params res - Express Response Object
     */
    getDestination(req, res) {

        try {
            var search = req.params.destSearch;
            var cities = this.getDestinationCitiesResult(search);
            var states = this.getDestinationStatesResult(search);
            var countries = this.getDestinationCountriesResult(search);

            Promise.all([cities, states, countries]).then(result => {
                var data = {};
                data.cities = result[0];
                data.states = result[1];
                data.countries = result[2];
                this.send(res, 200, '', data);
            }, reason => {
                console.log(reason);
            });
        } catch (error) {

        }
    }

    /**
     * Get Cities
     * params req - Express request Object
     * params res - Express Response Object
     */
    getCities(req, res) {
        try {
            if (isNaN(req.params.stateId)) {
                this.send(res, 500, Messages.error.ServerError, "");
            }
            var findByStateId = parseInt(req.params.stateId);
            this.City.aggregate([
                    { $match: { "stateId": findByStateId } },
                    { $project: { cityId: "$cityId", cityName: "$name" } }
                ])
                .then(this.getCitiesCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    /**
     * getCities Callback function
     */
    getCitiesCallback(res, data) {
        this.send(res, 200, 'Found ' + data.length + ' City List', data);
    }

    /**
     * Get States
     * params req - Express request Object
     * params res - Express Response Object
     */
    getStates(req, res) {
        try {
            if (isNaN(req.params.countryId)) {
                this.send(res, 500, Messages.error.ServerError, "");
            }
            var findByCountryId = parseInt(req.params.countryId);
            this.State.aggregate([
                    { $match: { "countryId": findByCountryId } },
                    { $project: { stateId: "$stateId", stateName: "$name" } }
                ]).then(this.getStatesCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    /**
     * getStates Callback function
     */
    getStatesCallback(res, data) {
        this.send(res, 200, 'Found ' + data.length + ' State List', data);
    }

    getCountries(req, res) {
        try {
            this.Country.aggregate([
                    { $project: { countryId: "$countryId", countryName: "$name" } }
                ]).then(this.getCountriesCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    /**
     * getCounties Callback function
     */
    getCountriesCallback(res, data) {
        this.send(res, 200, 'Found ' + data.length + ' Country List', data);
    }

    /**
     * Get wizardQuestionDetails
     * params req - Express request Object
     * params res - Express Response Object
     */
    wizardQuestionDetails(req, res) {
        try {
            this.Question.find({}).sort({ questionIndex: 'asc' })
                .then(this.getLoyaltyProgramsCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    /**
     * getWizardQuestionDetailsCallback Callback function
     */
    getLoyaltyProgramsCallback(res, data) {
        this.LoyaltyPrograms.find({}).sort({ value: 'asc' })
            .then(this.getWizardQuestionDetailsCallback.bind(this, res, data))
            .catch(this.handleError.bind(this, res));
    }

    getWizardQuestionDetailsCallback(res, questionWizard, loyaltyPrograms) {
        var data = {
            questionWizard,
            loyaltyPrograms
        }
        this.send(res, 200, 'Found ' + data.length + ' Question Details', data);
    }


    getDestinationCitiesResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.City.aggregate([{
                        $match: {
                            "name": new RegExp(search, "i"),
                        }
                    },
                    {
                        $lookup: {
                            from: "states",
                            localField: "stateId",
                            foreignField: "stateId",
                            as: "states"
                        }
                    },
                    {
                        $unwind: {
                            path: "$states",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "countries",
                            localField: "states.countryId",
                            foreignField: "countryId",
                            as: "states.country",
                        }
                    },
                    {
                        $match: {
                            "states.country.countryId": 230,
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            id: "$cityId",
                            stateId: "$stateId",
                            countryCode: {
                                $arrayElemAt: [
                                    "$states.country.countryCode",
                                    0
                                ]
                            },
                            isCountryActive: {
                                $arrayElemAt: [
                                    "$states.country.isActive",
                                    0
                                ]
                            },
                            description: {
                                $concat: [
                                    "$name", ",", "$states.name", ",",
                                    {
                                        $arrayElemAt: [
                                            "$states.country.name",
                                            0
                                        ]
                                    },
                                ]
                            }
                        }
                    },
                ], function(err, res) {
                    resolve(res, "city");
                });
            });
        } catch (error) {

        }
    }

    getDestinationStatesResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.State.aggregate([
                    { $match: { "name": new RegExp(search, "i") } },
                    {
                        $lookup: {
                            from: "countries",
                            localField: "countryId",
                            foreignField: "countryId",
                            as: "country",
                        }
                    },
                    {
                        $match: {
                            "country.countryId": 230,
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            id: "$stateId",
                            isCountryActive: {
                                $arrayElemAt: [
                                    "$country.isActive",
                                    0
                                ]
                            },
                            countryCode: {
                                $arrayElemAt: [
                                    "$country.countryCode",
                                    0
                                ]
                            },
                            description: {
                                $concat: [
                                    "$name", ",",
                                    {
                                        $arrayElemAt: [
                                            "$country.name",
                                            0
                                        ]
                                    },
                                ]
                            }
                        }
                    },
                ], function(err, res) {
                    resolve(res, "states");
                });
            });
        } catch (error) {

        }
    }

    getDestinationCountriesResult(search) {
        try {
            return new Promise((resolve, reject) => {
                this.Country.aggregate([
                    { $match: { "name": new RegExp(search, "i"), "countryId": 230 } },
                    { $match: { "name": new RegExp(search, "i") } },
                    {
                        $project: {
                            _id: 0,
                            id: "$countryId",
                            countryId: "$countryId",
                            isCountryActive: '$isActive',
                            countryCode: "$countryCode",
                            description: {
                                $concat: [
                                    "$name"
                                ]
                            }
                        }
                    },
                ], function(err, res) {
                    resolve(res, "countries");
                });
            });
        } catch (error) {

        }
    }

    /**
     * Get getattractionListDayWise
     * params req - Express request Object
     * params res - Express Response Object
     */
    // getattractionListDayWise(req, res) {
    //     let attractionDetail = [{ "dayTitle": "Day1", "cityInfo": { "id": 0, "lang": 0, "lat": 0 }, "attractionList": [{ "attractionTitle": "Attraction 1", "attractionId": "WT-001", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 0 }, { "attractionTitle": "Attraction 2", "attractionId": "WT-002", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 1 }, { "attractionTitle": "Attraction 3", "attractionId": "WT-003", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 2 }] }, { "dayTitle": "Day2", "cityInfo": { "id": 0, "lang": 0, "lat": 0 }, "attractionList": [{ "attractionTitle": "Attraction 1", "attractionId": "WT-001", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 0 }, { "attractionTitle": "Attraction 2", "attractionId": "WT-002", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 1 }, { "attractionTitle": "Attraction 3", "attractionId": "WT-003", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 2 }] }, { "dayTitle": "Day3", "cityInfo": { "id": 0, "lang": 0, "lat": 0 }, "attractionList": [{ "attractionTitle": "Attraction 1", "attractionId": "WT-001", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 0 }, { "attractionTitle": "Attraction 2", "attractionId": "WT-002", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 1 }, { "attractionTitle": "Attraction 3", "attractionId": "WT-003", "duration": "40", "visitorFee": 0, "visitorImageUrl": "assets/images/planning.jpg", "index": 2 }] }];
    //     res.json(attractionDetail);
    // }

    /**
     * Get getattractionListDayWiseLive
     * params req - Express request Object
     * params res - Express Response Object
     */
    getattractionListDayWiseLive(req, res) {
            try {
                if (req.body.questionsAnswers.length != 0 && req.body.profileId == -1) {
                    // Attribute set calculation   
                    // var isKidsfriendly = false;
                    // if (req.body.questionsAnswers[2].options[1].multiNumericOptionValue > 0) {
                    //     isKidsfriendly = true;
                    // } else {
                    //     isKidsfriendly = false;
                    // }
                    // req.body.isKidsfriendly = isKidsfriendly;
                    req.body.attributeSet = [];
                    var wizardAnswers = req.body.questionsAnswers;
                    var userSelectedColors = ['B', 'R', 'I', 'E', 'C'];
                    var tempArray1 = {},
                        tempArray2 = {},
                        finalArray = {},
                        merge = [],
                        selectedAnswersQ1 = [],
                        selectedAnswersQ2 = [];
                    if (wizardAnswers.length > 0) {

                        wizardAnswers[0].options.forEach(function(options) {
                            if (options.IsSelected == true) {
                                selectedAnswersQ1.push(options);
                            }
                        }, this);

                        wizardAnswers[1].options.forEach(function(options) {
                            if (options.IsSelected == true) {
                                selectedAnswersQ2.push(options);
                            }
                        }, this);

                        //old calculation
                        // var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                        //     tempArray1[prop] = _.round(_.sumBy(wizardAnswers[0].options, prop) / wizardAnswers[0].options.length);
                        // });

                        //new calculation
                        var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                            //tempArray1[prop] = _.round(_.sumBy(selectedAnswersQ1, prop) / selectedAnswersQ1.length);
                            tempArray1[prop] = _.sumBy(selectedAnswersQ1, prop) / selectedAnswersQ1.length;
                        });
                        merge.push(tempArray1);

                        //old calculation
                        // var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                        //     tempArray2[prop] = _.round(_.sumBy(wizardAnswers[1].options, prop) / wizardAnswers[1].options.length);
                        // });

                        //new calculation
                        var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                            //tempArray2[prop] = _.round(_.sumBy(selectedAnswersQ2, prop) / selectedAnswersQ2.length);
                            tempArray2[prop] = _.sumBy(selectedAnswersQ2, prop) / selectedAnswersQ2.length;
                        });
                        merge.push(tempArray2);

                        var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                            // finalArray[prop] = _.round(_.sumBy(merge, prop) / 2);
                            if (prop !== "E") {
                                finalArray[prop] = _.round(_.sumBy(merge, prop) / 2);
                            } else {
                                finalArray[prop] = _.sumBy(merge, prop)
                            }
                        });

                        var totalExperiance = 0;
                        totalExperiance = this.checkExperianceLevel(wizardAnswers[5].AnswerInfo.totalCountries);
                        // finalArray.E = _.round(finalArray.E + (totalExperiance / 2));
                        finalArray.E = _.round((finalArray.E + totalExperiance) / 3);

                        req.body.attributeSet = finalArray;

                        var obj = { "B": finalArray.B, "R": finalArray.R, "I": finalArray.I, "E": 0, "C": finalArray.C };

                        var maxAttributeSet = Object.keys(obj).reduce(function(a, b) { return obj[a] > obj[b] ? a : b })
                            //console.log(maxAttributeSet);

                        var IdentifiedProfile = "";
                        if (maxAttributeSet == "C") {
                            IdentifiedProfile = 1;
                        } else if (maxAttributeSet == "B") {
                            IdentifiedProfile = 2
                        } else if (maxAttributeSet == "R") {
                            IdentifiedProfile = 3
                        } else if (maxAttributeSet == "I") {
                            IdentifiedProfile = 4
                        } else if (maxAttributeSet == "E") {
                            IdentifiedProfile = 5
                        }
                        req.body.IdentifiedProfile = IdentifiedProfile;
                    }
                    //let attractionList = [];
                    this.getAttractionListDayWiseLiveCall(req, res).
                    then(this.getAttractionListDayWiseLiveCallBack.bind(this, req, res))
                } else if (req.body.profileId >= 0) {
                    //  let attractionList = [];
                    if (req.body.profileId == 0) { req.body.profileId = 1 }
                    this.getAttractionListDayWiseLiveCall(req, res).
                    then(this.getAttractionListDayWiseLiveCallBack.bind(this, req, res))
                } else {
                    this.send(res, 401, 'Please send questions & answers', []);
                }
            } catch (error) {
                console.log(error);
            }
        }
        // formatOpenCloseTime(time) {
        //     var index = time.length == 3 ? 1 : 2;
        //     return time.substring(0, index) + ":" + time.substring(index);
        // }
    getAttractionListDayWiseLiveCallBack(req, res, resultSet) {
        try {
            if (resultSet.length > 0) {
                this.attractionDetailDayWise = new AttractionDetailDayWise();
                let Note = this.attractionDetailDayWise.validateRequest(req);
                if (Note.code == 200) {
                    let attractionList = [];
                    _.each(resultSet, (attractionItem) => {

                        let attraction = {
                            "attractionId": attractionItem.attractionId,
                            "attractionName": attractionItem.attractionName,
                            "attractionRating": attractionItem.attractionRating,
                            "coords": attractionItem.coords,
                            "visitTime": attractionItem.visitTime,
                            "attractioncategory": attractionItem.attractioncategory


                        };
                        // if (attractionItem.attrTransactionDetail.length == 1) {  
                        if (attractionItem.attrTransactionDetail !== undefined) {

                            attraction.attractionVisitFeeCurrency = attractionItem.attrTransactionDetail.attractionVisitFeeCurrency
                            attraction.visitorFee = attractionItem.attrTransactionDetail.attractionVisitFee;
                            attraction.attractionVisitDuration = attractionItem.attrTransactionDetail.attractionVisitDuration;
                            attraction.isKidFriendly = attractionItem.attrTransactionDetail.isKidFriendly;
                            if (attractionItem.attrTransactionDetail.attractionAttributeSet != undefined) {
                                attraction.B = attractionItem.attrTransactionDetail.attractionAttributeSet.B;
                                attraction.R = attractionItem.attrTransactionDetail.attractionAttributeSet.R;
                                attraction.I = attractionItem.attrTransactionDetail.attractionAttributeSet.I;
                                attraction.C = attractionItem.attrTransactionDetail.attractionAttributeSet.C;
                                attraction.E = attractionItem.attrTransactionDetail.attractionAttributeSet.E;
                            }
                            attraction.attractionImage = attractionItem.attrTransactionDetail.attractionImage;
                            attraction.attractionTravelTheme = attractionItem.attrTransactionDetail.attractionTravelTheme
                            attraction.deals = attractionItem.deals
                            attractionList.push(attraction);
                        }
                    });
                    let totalDays = moment(new Date(req.body.endDate)).diff(moment(new Date(req.body.startDate)), 'days') + 1;
                    this.attractionDetailDayWise.assignValues(req.body.cityId, req.body.startDate, req.body.endDate, totalDays, req.body.isKidFriendly)
                    var attributeSet = req.body.attributeSet;

                    this.attractionDetailDayWise.getLinerVersionWithoutDayWisePlan(attributeSet, attractionList, req.body.profileId, totalDays).then((attractionDetailDayWiseProc) => {
                        let attractionDetailDayWiseResult = this.attractionDetailDayWise.convertToDayWisePlanSortByDistance(attractionDetailDayWiseProc, req.body.startDate);
                    });


                    this.attractionDetailDayWise.on("onGetResult", (result) => {
                        let otherAttraction = result.otherAttractionList; //this.attractionDetailDayWise.prepareOtherAttractionType(attractionList, result);

                        _.each(otherAttraction, (otherattractionItem, index) => {

                            var deal = this.commonController.seperateDeals(otherattractionItem.deals, otherattractionItem.attractionName, otherattractionItem.attractionId, this);
                            otherattractionItem.deals = deal;
                            var formatedVisitTimeArray = this.commonController.formatVisitTime(otherattractionItem.visitTime, this);
                            otherAttraction[index].visitTime = formatedVisitTimeArray;
                        });

                        let attractionSet = {};
                        attractionSet.identifiedProfile = req.body.IdentifiedProfile;
                        attractionSet.result = result;

                        var refinedOtherAttractions = _.map(otherAttraction, function(o) {
                            return _.omit(o, ['B', 'R', 'C', 'E', 'I', '_id']);
                        });
                        attractionSet.otherAttraction = refinedOtherAttractions;
                        let dealIds = [];
                        attractionSet.result.forEach(function(attractionList, index) {
                            attractionList.attractionList.forEach(function(attraction) {
                                if (attraction.deals != undefined && attraction.deals.increasevisitorDeals.length) {
                                    dealIds.push(mongoose.Types.ObjectId(attraction.deals.increasevisitorDeals[0].dealId))
                                }
                            }, this);
                        }, this);

                        attractionSet.otherAttraction.forEach(function(attraction, index) {
                            if (attraction.deals != undefined && attraction.deals.increasevisitorDeals.length) {
                                dealIds.push(mongoose.Types.ObjectId(attraction.deals.increasevisitorDeals[0].dealId))
                            }
                        }, this);
                        this.campaign.update({ _id: { $in: dealIds } }, { $inc: { Impression: 1 } }, { multi: true })
                            .then(function(data) {
                                //console.log("Impression added successfully");
                            })
                            .catch(this.handleError.bind(this, res));
                        res.status(Note.code).json(attractionSet);
                    })

                } else {
                    res.status(Note.code).json(Note);
                }
            } else {
                res.status(200).json({ succeeded: true, message: 'No attractions found', data: [] });
            }

        } catch (error) {
            console.log(error);
        }
    }

    // getAttractionListDayWiseLiveCall(req, res) {
    //     try {
    //         return this.attractionMasterList.aggregate([{
    //                 $match: {
    //                     "attractionCityId": req.body.cityId,
    //                 }
    //             },
    //             {
    //                 $lookup: {                        
    //                     from: "attractionTransaction",
    //                     localField: "attractionId",
    //                     foreignField: "attractionId",
    //                     as: "attrTransactionDetail"
    //                 }
    //             }
    //         ])
    //     } catch (error) {

    //     }
    // }



    getAttractionListDayWiseLiveCall(req, res) {
        try {
            var strdestinationObj = req.body.destinationfullName.split(',');
            var city = strdestinationObj[0];
            var state = strdestinationObj[1];
            var country = strdestinationObj[2];

            var tripStartDate = this.commonController.convertDateToYYMMDD(new Date(req.body.startDate));
            tripStartDate = tripStartDate + " 00:00:00.000Z";
            var tripEndDate = this.commonController.convertDateToYYMMDD(new Date(req.body.endDate));
            tripEndDate = tripEndDate + " 00:00:00.000Z";
            return this.attractionMasterList.aggregate([{
                    // $match: {
                    //     "attractionCityId": req.body.cityId,
                    // }
                    $match: {
                        // attractionCityName: new RegExp(city),
                        // attractionCountry: new RegExp(country),
                        // attractionState: new RegExp(state)
                        $and: [
                            { attractionCityName: new RegExp(city, "i") },
                            { attractionCountry: country },
                            { attractionState: state }
                        ]
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
                    $lookup: {
                        //from: "attractionTransaction_Test",
                        from: "campaigns",
                        localField: "attractionId",
                        foreignField: "attractionId",
                        as: "deals"
                    }
                },
                {
                    $unwind: "$deals",
                    $unwind: "$attrTransactionDetail"
                },
                {
                    $match: { "attrTransactionDetail.isAttractionActive": true }
                },
                {
                    $project: {
                        attractionId: "$attractionId",
                        attractionName: "$attractionName",
                        attractioncontactNumber: "$attractioncontactNumber",
                        visitTime: "$visitTime",
                        attractionRating: "$attractionRating",
                        isAttractionActive: "$attrTransactionDetail.isAttractionActive",
                        attrTransactionDetail: "$attrTransactionDetail",
                        attractioncategory: "$attractioncategory",
                        coords: "$coords",
                        attractionVisitFee: "$attrTransactionDetail.attractionVisitFee",
                        attractionVisitFeeCurrency: "$attrTransactionDetail.attractionVisitFeeCurrency",
                        deals: {
                            $filter: {
                                input: "$deals",
                                as: "deals",
                                cond: {
                                    $and: [
                                        { $lte: ["$$deals.campaignDate.startDate", new Date(tripEndDate)] }, // trip end date
                                        { $gte: ["$$deals.campaignDate.endDate", new Date(tripStartDate)] }, // trip start date                                        
                                        { $eq: ["$$deals.isActive", true] }
                                    ]
                                }
                            }
                        }
                    }
                }
            ])
        } catch (error) {
            console.log("error - " + error);
        }
    }


    getWizardQuestionAnswerDetails(req, res) {
        try {
            var wizardAnswers = req.body.data;
            var userSelectedColors = ['B', 'R', 'I', 'E', 'C'];
            var tempArray1 = {},
                tempArray2 = {},
                finalArray = {},
                merge = [];

            var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                tempArray1[prop] = _.round(_.sumBy(wizardAnswers[0].options, prop) / wizardAnswers[0].options.length);

            });
            merge.push(tempArray1);
            var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                tempArray2[prop] = _.round(_.sumBy(wizardAnswers[1].options, prop) / wizardAnswers[1].options.length);
            });
            merge.push(tempArray2);

            var totalCount = _.sumBy(userSelectedColors, function(prop, key) {
                finalArray[prop] = _.round(_.sumBy(merge, prop) / 2);
            });

            var totalExperiance = this.checkExperianceLevel(wizardAnswers[5].AnswerInfo.totalCountries);
            finalArray.E = _.round(finalArray.E + (totalExperiance / 2));

            this.getWizardQuestionAnswerDetailsCallback(res, finalArray);
        } catch (error) {

        }
    }

    getWizardQuestionAnswerDetailsCallback(res, data) {
        this.send(res, 200, 'Found ' + ' Final Calculation', data);
    }

    checkExperianceLevel(totalCountries) {
        if (totalCountries >= 0 && totalCountries <= 3)
            return 0;
        else if (totalCountries >= 4 && totalCountries <= 6)
            return 1;
        else if (totalCountries >= 7 && totalCountries <= 9)
            return 2;
        else if (totalCountries >= 10 && totalCountries <= 11)
            return 3;
        else if (totalCountries >= 12 && totalCountries <= 14)
            return 4;
        else if (totalCountries > 14)
            return 5;
    }

}

module.exports = HomeController;
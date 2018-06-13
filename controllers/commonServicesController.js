var mongoose = require('mongoose');
var Q = require('q');

//include models
var CountryModel = require('../models/country');
var StateModel = require('../models/state');
var CityModel = require('../models/city');
var AttractionMasterModel = require('../models/attractionMasterModel');
var TravellerModel = require('../models/traveller');
var CampaignModel = require('../models/campaign');
var BusinessUserModel = require('../models/businessUser');
var TravellerProfileModel = require('../models/travellerProfiles');
var TravellerThemeModel = require('../models/travellerThemes');
var CategoryModel = require('../models/category');
var PermissionModel = require('../models/permission');
var RoleModel = require('../models/role');
var TokenModel = require('../models/token');
var AttractionTransactionModel = require('../models/attractionTransactionModel');
var BookingModel = require('../models/booking');


//include controllers
var BaseController = require('./baseController');

//include wootravelEnum
var Messages = require('../enum/wootravelEnum');

class CommonServicesController extends BaseController {
    constructor() {
        super();

        this.City = CityModel;
        this.State = StateModel;
        this.Country = CountryModel;
        this.TravellerProfile = TravellerProfileModel;
        this.Category = CategoryModel;
        this.TravellerTheme = TravellerThemeModel;
        this.Permission = PermissionModel;
        this.Role = RoleModel;
        this.Token = TokenModel;
        this.AttractionTransaction = AttractionTransactionModel;
        this.AttractionMaster = AttractionMasterModel;
        this.Traveller = TravellerModel;
        this.Campaign = CampaignModel;
        this.Bookings = BookingModel;
        this.BusinessUser = BusinessUserModel;
    }

    getTravellerThemeList(req, res) {
        this.TravellerTheme.find({ isActive: true }).select({ 'name': 1 })
            .then(this.getTravellerThemeListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getTravellerThemeListCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Traveller Theme List', list);
    }

    getBusinessUserList(req, res) {
        this.BusinessUser.find({ status: 2, isActive: true }).select({ 'contactPersonName': 1 })
            .then(this.getBusinessUserListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getBusinessUserListCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Business User List', list);
    }

    getTravellerProfileList(req, res) {
        this.TravellerProfile.find({ isActive: true }).select({ 'profileId': 1, 'profileName': 1 })
            .then(this.getTravellerProfileListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getTravellerProfileListCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Traveller Profile List', list);
    }

    getCategoryList(req, res) {
        this.Category.find({ isActive: true }).select({ 'categoryName': 1, 'categoryDisplayName': 1 })
            .then(this.getCategoryListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getCategoryListCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Category List', list);
    }

    getCountries(req, res) {
        try {
            this.Country.aggregate([
                { $project: { countryId: "$countryId", countryName: "$name", countryCode: "$countryCode", isActive: "$isActive" } }
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

    getCityStateCountryList(req, res) {
        try {
            var search = req.params.destSearch;

            var cities = this.getCitiesList(search);
            var states = this.getStatesList(search);
            var countries = this.getCountriesList(search);

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

    getCitiesList() {
        return new Promise((resolve, reject) => {
            this.City.aggregate([{
                $project: {
                    _id: 0,
                    id: "$cityId",
                    name: "$name"
                }
            },], function (err, res) {
                resolve(res, "cities");
            });
        });
    }

    getStatesList() {
        return new Promise((resolve, reject) => {
            this.State.aggregate([{
                $project: {
                    _id: 0,
                    id: "$stateId",
                    name: "$name"
                }
            },], function (err, res) {
                resolve(res, "states");
            });
        });
    }

    getCountriesList() {
        return new Promise((resolve, reject) => {
            this.Country.aggregate([{
                $project: {
                    _id: 0,
                    id: "$countryId",
                    countryCode: "$countryCode",
                    name: "$name"
                }
            },], function (err, res) {
                resolve(res, "countries");
            });
        });
    }

    getPermissionList(req, res) {
        this.Permission.find({ isActive: true }).select({ 'permissionName': 1 })
            .then(this.getPermissionListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getCountryCities(req, res) {
        if (isNaN(req.params.countryId)) {
            this.send(res, 500, Messages.error.ServerError, "");
        }
        var findByCountryId = parseInt(req.params.countryId);
        this.State.aggregate([{
            $match: { countryId: findByCountryId }
        },
        {
            $lookup: {
                from: "cities",
                localField: "stateId",
                foreignField: "stateId",
                as: "cities"
            }
        },
        {
            $unwind: {
                path: "$cities",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                "_id": "$cities._id",
                "cityId": "$cities.cityId",
                "cityName": "$cities.name",
            }
        }
        ])
            .then(this.getCountryCitiesCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getCountryCitiesCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Country List', list);
    }

    getPermissionListCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Permission List', list);
    }

    getRoleList(req, res) {
        this.Role.aggregate([{ $match: { "isActive": true } }, { $project: { "id": "$_id", "value": "$roleName" } }])
            .then(this.getRoleListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getRoleListCallback(res, list) {
        this.send(res, 200, 'Found ' + list.length + ' Roles List', list);
    }

    getSearchConditions(searchList) {
        var conditions = {};
        var checkForHexRegExp = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i
        for (var list in searchList) {

            if (isNaN(searchList[list]) == false && typeof (searchList[list]) !== "boolean") {
                if (("stringFields" in searchList) && searchList.stringFields.indexOf(list) == -1) {
                    conditions[list] = Number(searchList[list]);
                } else {
                    conditions[list] = new RegExp(searchList[list], "i")
                }
            } else if (checkForHexRegExp.test(searchList[list]))
                conditions[list] = mongoose.Types.ObjectId(searchList[list]);
            else if (typeof searchList[list] === "boolean")
                conditions[list] = searchList[list];
            else if (((typeof searchList[list] === "string")) && (list === "attractionCityName" || list === "attractionCountry" || list === "attractionState") && (list !== "attractioncategory" && list !== "attrTransactionDetail.attractionTravelTheme"))
                conditions[list] = searchList[list];
            else if (((typeof searchList[list] === "string")) && (list !== "attractioncategory" && list !== "attrTransactionDetail.attractionTravelTheme"))
                conditions[list] = new RegExp(searchList[list], "i");
            else if (list === "attractioncategory" || list === "attrTransactionDetail.attractionTravelTheme")
                conditions[list] = { $in: JSON.parse(searchList[list]) };
        }

        delete conditions.page;
        delete conditions.pgsize;
        delete conditions.sord;
        delete conditions.__proto__;
        return conditions;
    }

    getDashboardCountsForBusinessUser(req, res) {
        var businessUserId = mongoose.Types.ObjectId(req.query.businessUserId);
        var bookingsTickets = this.getBookingsCountForBusinessUserTickets(businessUserId);
        var bookingsDeals = this.getBookingsCountForBusinessUserDeals(businessUserId);

        Promise.all([bookingsTickets, bookingsDeals]).then(result => {
            var data = {};
            var totalTickets = (result[0]) ? result[0].count : 0;
            var totalDeals = (result[1]) ? result[1].count : 0;
            data.bookings = totalTickets + totalDeals;
            this.send(res, 200, '', data);
        }, reason => {
            console.log(reason);
        });
    }

    getBookingsCountForBusinessUserTickets(businessUserId) {
        return new Promise((resolve, reject) => {
            this.Bookings.aggregate(
                [
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
                    { $match: { "bookingSummary.tickets.bookingStatus": Messages.bookingStatus.Resolved, "businessUsers._id": businessUserId } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ],
                function (err, res) {
                    resolve(res[0]);
                });
        });
    }

    getBookingsCountForBusinessUserDeals(businessUserId) {
        return new Promise((resolve, reject) => {
            this.Bookings.aggregate(
                [
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
                    { $match: { "bookingSummary.deals.bookingStatus": Messages.bookingStatus.Resolved, "businessUsers._id": businessUserId } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ],
                function (err, res) {
                    resolve(res[0]);
                });
        });
    }


    getDashboardCounts(req, res) {

        var businessUsers = this.getBusinessUsersCount();
        var travellers = this.getTravellersCount();
        var campaigns = this.getCampaignsCount();
        var attractions = this.getAttractionsCount();
        var bookingsTickets = this.getBookingsCountTickets();
        var bookingsDeals = this.getBookingsCountDeals();

        Promise.all([businessUsers, travellers, campaigns, attractions, bookingsTickets, bookingsDeals]).then(result => {
            var data = {};
            data.businessUsers = (result[0]) ? result[0].count : "";
            data.travellers = (result[1]) ? result[1].count : "";
            data.campaigns = (result[2]) ? result[2].count : "";
            data.attractions = (result[3]) ? result[3].count : "";
            var totalTickets = (result[4]) ? result[4].count : 0;
            var totalDeals = (result[5]) ? result[5].count : 0;
            data.bookings = totalTickets + totalDeals;
            this.send(res, 200, '', data);
        }, reason => {
            console.log(reason);
        });
    }

    getBusinessUsersCount() {
        return new Promise((resolve, reject) => {
            this.BusinessUser.aggregate(
                [
                    { $match: { "status": 1, "isEmailVerified": true } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ],
                function (err, res) {
                    resolve(res[0]);
                });
        });
    }

    getBookingsCountTickets() {
        return new Promise((resolve, reject) => {
            this.Bookings.aggregate(
                [
                    { $match: { "bookingSummary.tickets.bookingStatus": Messages.bookingStatus.Resolved } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ],
                function (err, res) {
                    resolve(res[0]);
                });
        });
    }

    getBookingsCountDeals() {
        return new Promise((resolve, reject) => {
            this.Bookings.aggregate(
                [
                    { $match: { "bookingSummary.deals.bookingStatus": Messages.bookingStatus.Resolved } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ],
                function (err, res) {
                    resolve(res[0]);
                });
        });
    }

    getTravellersCount() {
        return new Promise((resolve, reject) => {
            this.Traveller.aggregate([
                [
                    { $group: { _id: null, count: { $sum: 1 } } }
                ]
            ], function (err, res) {
                resolve(res[0]);
            });
        });
    }

    getCampaignsCount() {
        return new Promise((resolve, reject) => {
            this.Campaign.aggregate([
                [
                    { $group: { _id: null, count: { $sum: 1 } } }
                ]
            ], function (err, res) {
                resolve(res[0]);
            });
        });
    }

    getAttractionsCount() {
        return new Promise((resolve, reject) => {
            this.AttractionTransaction.aggregate([
                { $match: { "associationStatus": 1 } },
                { $group: { _id: null, count: { $sum: 1 } } }
            ], function (err, res) {
                resolve(res[0]);
            });
        });
    }


    /** formate attraction visit time to AM PM */
    formatOpenCloseTime(time) {
        var hours = Math.floor(time / 100);
        var minutes = time % 100;
        var hours1;
        if (hours == 0) {
            hours1 = 12;
        } else {
            hours1 = (hours >= 12) ? (hours % 12) : hours;
        }

        var minutes1 = (minutes <= 9) ? ("0" + minutes) : minutes;

        var format = (hours > 12) ? "PM" : "AM";

        return hours1 + ":" + minutes1 + " " + format;
    }

    /**
     * format Visit time 
     */
    formatVisitTime(visitTimeObject, ref) {
        try {
            if (visitTimeObject != undefined) {
                var formatedVisitTime = {};
                var dayarray = [];
                var openDays = [];
                var daysNo = [0, 1, 2, 3, 4, 5, 6];
                var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                var closeDays;
                visitTimeObject.forEach(function (daytime) {
                    var day, dayName, open = 0,
                        close = 0,
                        alwaysOpen = false;

                    if (daytime.open != undefined && daytime.close != undefined) {
                        day = daytime.open.day;
                        openDays.push(day);
                        dayName = weekDays[day];
                        open = daytime.open.time.toString();
                        open = ref.commonController.formatOpenCloseTime(open);
                    }
                    if (daytime.close != undefined) {
                        close = daytime.close.time.toString();
                        close = ref.commonController.formatOpenCloseTime(close)
                    } else {
                        alwaysOpen = true;
                    }

                    var displayHours = (alwaysOpen == true ? 'Open 24 Hours' : open + ' - ' + close);
                    dayarray.push({
                        'day': day,
                        'dayName': dayName,
                        'displayHours': displayHours,
                        'open': open,
                        'close': close,
                        'alwaysOpen': alwaysOpen,
                        'isClose': false
                    });
                }, this);

                if (openDays.length > 0) {
                    closeDays = daysNo.filter(function (n) { return !this.has(n) }, new Set(openDays));
                }
                if (closeDays !== undefined) {
                    closeDays.forEach(function (closeDay) {
                        dayarray.push({
                            'day': closeDay,
                            'dayName': weekDays[closeDay],
                            'displayHours': "Closed",
                            'open': 0,
                            'close': 0,
                            'isClose': true
                        })
                    }, this);
                }
                // var output = [];
                // dayarray.forEach(function(value) {
                //     var existing = output.filter(function(v, i) {
                //         return v.day == value.day;
                //     });
                //     if (existing.length) {
                //         var existingIndex = output.indexOf(existing[0]);
                //         output[existingIndex].displayHours = output[existingIndex].displayHours + ", " + value.displayHours;
                //     } else {
                //         if (typeof value.day == 'number')
                //             value.value = [value.value];
                //         output.push(value);
                //     }
                // });
                return dayarray;
            }
        } catch (error) {
            console.log(error);
        }

    }



    /**Date format conversion to YY-MM-DD */
    convertDateToYYMMDD(datetime) {
        var formatedDate = datetime.getFullYear() + '-' + ("0" + (datetime.getMonth() + 1)).slice(-2) + '-' + ("0" + (datetime.getDate())).slice(-2)
        return formatedDate;
    }

    /**conver date to date format like Sun, 1 Jan 2017 */
    converDateformatToDayDateMonthYear(date) {
        if (date != null) {
            date = date.toString();
            var splitedDate = date.split(" ");
            return splitedDate[0] + "," + splitedDate[2] + " " + splitedDate[1] + " " + splitedDate[3];
        } else {
            return "Invalid Date";
        }

    }
    /**Append  time zone to input date*/
    addDefaultTimeZone(date) {
        var dateObj = date.split("/");
        return dateObj[2] + "-" + dateObj[0] + "-" + dateObj[1] + "T00:00:00.00Z";
    }
    /**To Diffirenciate deal type */
    seperateDeals(dealObj, attractionName, attractionId, ref) {
        var deals = {};
        var promoDeals = [];
        var increasevisitorDeals = [];
        var dealinformation = {};
        var dealvalidtill;
        dealObj.forEach(function (dealdetail) {
            var dealinformation = {};
            dealinformation.startDate = ref.commonController.converDateformatToDayDateMonthYear(dealdetail.campaignDate.startDate);
            dealinformation.endDate = ref.commonController.converDateformatToDayDateMonthYear(dealdetail.campaignDate.endDate);
            dealinformation.dealId = String(dealdetail._id);
            dealinformation.name = dealdetail.name;
            dealinformation.dealImage = dealdetail.campaignImage;
            dealvalidtill = ref.commonController.convertDateToYYMMDD(dealdetail.campaignDate.startDate);
            dealinformation.validTill = ref.commonController.converDateformatToDayDateMonthYear(dealdetail.campaignDate.endDate); //dealdetail.campaignDate.endDate.toDateString();
            dealinformation.description = dealdetail.description;
            dealinformation.dealheadline = dealdetail.headline;
            dealinformation.destinationUrl = dealdetail.destinationUrl;
            dealinformation.budgetPerTraveller = dealdetail.budgetPerTraveller;
            dealinformation.associatedAttractionName = attractionName
            dealinformation.associatedAttractionId = attractionId
            if (dealdetail.type == 1) {
                increasevisitorDeals.push(dealinformation);
            } else {
                promoDeals.push(dealinformation);
            }
        })
        deals.promoDeals = promoDeals;
        deals.increasevisitorDeals = increasevisitorDeals;
        return deals;
    }

    seperateDealsForUpdate(dealObj, attractionName, attractionId, tripStartDate, tripEndDate, ref) {

        // var tripStartDate = ref.commonController.converDateformatToDayDateMonthYear(new Date(tripStartDate));
        var tripStartDate = new Date(tripStartDate);
        // tripStartDate = tripStartDate + " 00:00:00.000Z";
        // var tripEndDate = ref.commonController.converDateformatToDayDateMonthYear(new Date(tripEndDate));
        var tripEndDate = new Date(tripEndDate);
        // tripEndDate = tripEndDate + " 00:00:00.000Z";

        var deals = {};
        var promoDeals = [];
        var increasevisitorDeals = [];
        var dealinformation = {};
        var dealvalidtill;
        dealObj.forEach(function (dealdetail) {
            var dealinformation = {};
            dealinformation.startDate = ref.commonController.converDateformatToDayDateMonthYear(dealdetail.campaignDate.startDate);
            dealinformation.endDate = ref.commonController.converDateformatToDayDateMonthYear(dealdetail.campaignDate.endDate);
            dealinformation.dealId = String(dealdetail._id);
            dealinformation.name = dealdetail.name;
            dealinformation.dealImage = dealdetail.campaignImage;
            dealvalidtill = ref.commonController.convertDateToYYMMDD(dealdetail.campaignDate.startDate);
            dealinformation.validTill = ref.commonController.converDateformatToDayDateMonthYear(dealdetail.campaignDate.endDate); //dealdetail.campaignDate.endDate.toDateString();
            dealinformation.description = dealdetail.description;
            dealinformation.dealheadline = dealdetail.headline;
            dealinformation.destinationUrl = dealdetail.destinationUrl;
            dealinformation.budgetPerTraveller = dealdetail.budgetPerTraveller;
            dealinformation.associatedAttractionName = attractionName
            dealinformation.associatedAttractionId = attractionId
            if (dealdetail.type == 1) {
                if (dealdetail.isActive && (tripStartDate >= new Date(dealinformation.startDate) || tripEndDate <= new Date(dealinformation.endDate))) {
                    increasevisitorDeals.push(dealinformation);
                }
            } else {
                if (dealdetail.isActive && (tripStartDate >= new Date(dealinformation.startDate) || tripEndDate <= new Date(dealinformation.endDate))) {
                    promoDeals.push(dealinformation);
                }
            }
        })
        deals.promoDeals = promoDeals;
        deals.increasevisitorDeals = increasevisitorDeals;
        return deals;
    }

    expireVerificationLink(res, token, data) {
        var deferred = Q.defer();
        this.Token.findOneAndUpdate({ "token": token }, { $set: { "isExpired": true } })
            .then(function (response) {
                deferred.resolve(response);
            })
            .catch(this.handleError.bind(this, res));
        return deferred.promise;
    }

}

module.exports = CommonServicesController;
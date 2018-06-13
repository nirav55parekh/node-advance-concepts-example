let _ = require('lodash');
let moment = require('moment');
let attractionMasterListModel = require("../models/attractionMasterModel");
let setAttractionDistanceWiseRef = require('./setAttractionDistanceWise');
let events = require('events');
let convertClass = require('./convertToProfileSet');
let TravellersController = require('../controllers/travellersController');
let appKeys = require('../config/appconfig');
let connectionString = appKeys.appKeys.dbConnectionString
let Messages = require('../enum/wootravelEnum');

var EventEmitter = require('event-emitter-es6');


var CommonController = require('./commonServicesController');

//extends EventEmitter
class attractionDetailDayWise extends EventEmitter {

    constructor() {
        super();
        this.commonController = new CommonController();
    }

    validateRequest(req) {
        let dayDiff = moment(new Date(req.body.endDate)).diff(moment(new Date(req.body.startDate)), 'Days');
        let note = { code: 200, message: '' }
        if (dayDiff == -1) {
            note.code = 400;
            note.message = Messages.error.dateRangeForAttractionDetail;
        }
        return note;
    }

    assignValues(cityId, startDate, endDate, noOfDays, isKidFriendly) {
        this.cityId = cityId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.noOfDays = noOfDays;
        this.attractionMasterList = attractionMasterListModel;
        this.travellerRef = new TravellersController();
        this.isKidFriendly = isKidFriendly;
    }

    sortAttractions(selectionItems, rawSource) {
        try {
            rawSource.sort(function(a, b) {
                var nameA = a.attractionName.toLowerCase(),
                    nameB = b.attractionName.toLowerCase()
                if (nameA < nameB) //sort string ascending
                    return -1
                if (nameA > nameB)
                    return 1
                return 0 //default return value (no sorting)
            })
            let attractionList = [];
            _.each(selectionItems, (filterItem) => {
                let attraction = _.filter(rawSource, (raw) => {
                    return (raw[filterItem.key] == filterItem.val);
                });

                if (attraction.length != 0) {
                    _.each(attraction, (attractionItem) => {
                        attractionList.push(attractionItem);
                        _.remove(rawSource, (rawitem) => {
                            return (rawitem.attractionId == attractionItem.attractionId);
                        })
                    })
                }
            })
            return attractionList;
        } catch (error) {
            console.log(error);
        }
    }

    prepareSelectionSequences(travelerAttributeSets, profileId) {
        let convertRef = new convertClass();
        convertRef.setSequence(travelerAttributeSets).then((resultSet) => {
            this.emit("onPrepareSelectionSequences", resultSet);
        });
    }

    getLinerVersionWithoutDayWisePlan(attributeSet, rawSource, profileId, totalNoofDays) {
        //attributeSet = { "B": 0, "R": 5, "C": 5, "I": 2, "E": 0 };
        if (profileId == -1) {
            return new Promise((resolve, reject) => {
                this.prepareSelectionSequences(attributeSet, profileId);
                this.on("onPrepareSelectionSequences", (resultSet) => {
                    //console.log(this.isKidFriendly);
                    var attractionSets = {};
                    var mostRelevantattrction = [];
                    var otherRelevantattrction = [];
                    var totalVisitDuration = 0
                    var totalMinutesforPlanner = 720 * totalNoofDays;

                    let filterList = resultSet;
                    let rawSourcewithKidFriendly = _.filter(rawSource, (rawItem) => { return (rawItem.isKidFriendly == true) });
                    let rawSourcewithoutKidFriendly = _.filter(rawSource, (rawItem) => { return (rawItem.isKidFriendly == false) });
                    let resultwithtKidFriendly = this.sortAttractions(filterList, rawSourcewithKidFriendly);
                    let resultwithoutKidFriendly = this.sortAttractions(filterList, rawSourcewithoutKidFriendly);
                    // resolve(_.union(result1, result2))                    
                    let attractionsSortedbyRelevency;
                    if (this.isKidFriendly) {
                        attractionsSortedbyRelevency = _.union(resultwithtKidFriendly, resultwithoutKidFriendly);
                    } else {
                        attractionsSortedbyRelevency = _.union(resultwithoutKidFriendly, resultwithtKidFriendly);
                    }

                    _.forEach(attractionsSortedbyRelevency, function(attraction) {
                        if (totalVisitDuration <= totalMinutesforPlanner) {
                            totalVisitDuration += attraction.attractionVisitDuration;
                            if (totalVisitDuration <= totalMinutesforPlanner) {
                                mostRelevantattrction.push(attraction);
                            } else {
                                otherRelevantattrction.push(attraction)
                            }
                        } else {
                            otherRelevantattrction.push(attraction)
                        }
                    });
                    attractionSets['mostRelevantattrction'] = mostRelevantattrction;
                    attractionSets['otherRelevantattrction'] = otherRelevantattrction
                    resolve(attractionSets)
                })
            });
        } else {
            return new Promise((resolve, reject) => {
                this.travellerRef.getTravellerAttractionProfilesByIdInner(profileId)
                    .then(resultData => {
                        var arrayAttributeSet = JSON.stringify(resultData.attractionAttributeSet)
                        this.prepareSelectionSequences(JSON.parse(arrayAttributeSet)[0], profileId);
                        this.on("onPrepareSelectionSequences", (resultSet) => {
                            //console.log(resultSet);
                            //console.log(this.isKidFriendly);
                            var attractionSets = {};
                            var mostRelevantattrction = [];
                            var otherRelevantattrction = [];
                            var totalVisitDuration = 0
                            var totalMinutesforPlanner = 720 * totalNoofDays;
                            let filterList = resultSet; //JSON.parse(JSON.stringify(resultData)).sequence;
                            // let result2 = this.sortAttractions(filterList, rawSource);
                            // resolve(result2);
                            let rawSourcewithKidFriendly = _.filter(rawSource, (rawItem) => { return (rawItem.isKidFriendly == true) });
                            let rawSourcewithoutKidFriendly = _.filter(rawSource, (rawItem) => { return (rawItem.isKidFriendly == false) });
                            let resultwithtKidFriendly = this.sortAttractions(filterList, rawSourcewithKidFriendly);
                            let resultwithoutKidFriendly = this.sortAttractions(filterList, rawSourcewithoutKidFriendly);
                            //resolve(_.union(result1, result2))

                            let attractionsSortedbyRelevency;
                            if (this.isKidFriendly) {
                                attractionsSortedbyRelevency = _.union(resultwithtKidFriendly, resultwithoutKidFriendly);
                            } else {
                                attractionsSortedbyRelevency = _.union(resultwithoutKidFriendly, resultwithtKidFriendly);
                            }

                            _.forEach(attractionsSortedbyRelevency, function(attraction) {
                                if (totalVisitDuration <= totalMinutesforPlanner) {
                                    totalVisitDuration += attraction.attractionVisitDuration;
                                    if (totalVisitDuration <= totalMinutesforPlanner) {
                                        mostRelevantattrction.push(attraction);
                                    } else {
                                        otherRelevantattrction.push(attraction)
                                    }
                                } else {
                                    otherRelevantattrction.push(attraction)
                                }
                            });
                            attractionSets['mostRelevantattrction'] = mostRelevantattrction;
                            attractionSets['otherRelevantattrction'] = otherRelevantattrction
                            resolve(attractionSets)
                        })
                    })
            });
        }
    }

    convertToDayWisePlanSortByDistance(attractionList, tripstartDate) { // cityId, startDate, endDate, noOfDays
        var _this = this;
        let prepareBlankArray = function(noOfDays, cityId) {
            let formatedDate = _this.commonController.addDefaultTimeZone(tripstartDate);
            let startDate = new Date(formatedDate);
            let dayNo;
            let blankDayWisePlanStructure = [];
            let blankObject = {
                "dayTitle": "",
                "dayNumber": "",
                "attractionList": []
            };
            let ctrIndex = 1;
            for (let ctr = 0; ctr < noOfDays; ctr++) {
                let blankCloneObject = _.clone(blankObject);
                blankCloneObject.dayTitle = "Day " + ctrIndex;
                dayNo = startDate.getDay();
                blankCloneObject.dayNumber = dayNo;
                startDate.setDate(startDate.getDate() + 1);
                // blankCloneObject.cityInfo.id = cityId;
                blankDayWisePlanStructure.push(blankCloneObject);
                ctrIndex++;
            }
            return blankDayWisePlanStructure;
        }

        let targetArray = prepareBlankArray(this.noOfDays, this.cityId);
        let totalMinutes = 0;
        let targetMinutesPerDay = 720;
        let totalTourMinutes = targetMinutesPerDay * this.noOfDays;
        let groupIndex = 0;
        let attractionListWithGroup = [];
        let currentIndex = 0;

        // function formatOpenCloseTime(time) {
        //     var index = time.length == 3 ? 1 : 2;
        //     var time24 = time.substring(0, index) + ":" + time.substring(index);
        //     var tmpArr = time24.split(':'),
        //         time12;
        //     if (+tmpArr[0] == 12) {
        //         time12 = tmpArr[0] + ':' + tmpArr[1] + ' pm';
        //     } else {
        //         if (+tmpArr[0] == '00') {
        //             time12 = '12:' + tmpArr[1] + ' am';
        //         } else {
        //             if (+tmpArr[0] > 12) {
        //                 time12 = (+tmpArr[0] - 12) + ':' + tmpArr[1] + ' pm';
        //             } else {
        //                 time12 = (+tmpArr[0]) + ':' + tmpArr[1] + ' am';
        //             }
        //         }
        //     }
        //     return time12;
        // }

        function calculateToDayWisePlan(attractionList, noOfDays, cityId) {
            let targetArray = prepareBlankArray(noOfDays, cityId);
            let totalMinutes = 0;
            let targetMinutesPerDay = 720;
            let totalTourMinutes = targetMinutesPerDay * noOfDays;
            let groupIndex = 0;
            let attractionListWithGroup = [];

            _.each(attractionList, (attractionItem, index) => {
                let blankItem = { "attractionId": "", "attractionName": "", "attractionRating": "", "coords": 0, "visitTime": 0, "attractioncategory": 0, "attractionVisitDuration": 0, "isKidFriendly": 0, "visitorFee": 0, "attractionVisitFeeCurrency": "", "attractionImage": "", "attractionTravelTheme": 0, "index": 0, "deals": [] };
                blankItem.attractionName = attractionItem.attractionName;
                blankItem.attractionId = attractionItem.attractionId;
                blankItem.attractionVisitDuration = parseInt(attractionItem.attractionVisitDuration);
                blankItem.attractionRating = attractionItem.attractionRating;
                blankItem.attractionTravelTheme = attractionItem.attractionTravelTheme;
                blankItem.attractioncategory = attractionItem.attractioncategory;
                blankItem.isKidFriendly = attractionItem.isKidFriendly;
                blankItem.coords = attractionItem.coords;
                var deals = _this.commonController.seperateDeals(attractionItem.deals, attractionItem.attractionName, attractionItem.attractionId, _this)
                blankItem.deals = deals;
                var formatedVisitTimeArray = _this.commonController.formatVisitTime(attractionItem.visitTime, _this);
                blankItem.visitTime = formatedVisitTimeArray; //dayarray;
                blankItem.visitorFee = attractionItem.visitorFee;
                blankItem.attractionVisitFeeCurrency = attractionItem.attractionVisitFeeCurrency;
                blankItem.attractionImage = attractionItem.attractionImage;
                blankItem.index = index;
                totalMinutes += blankItem.attractionVisitDuration;
                if (totalMinutes <= targetMinutesPerDay) {
                    attractionListWithGroup.push(blankItem);
                }
            });
            return attractionListWithGroup;
        }

        var randomString = function(length) {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for (var i = 0; i < length; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        }

        function showdata(attractionList, loopStatus, noOfDays, cityId, self) {
            //collectionNameShouldbe unique
            let collectionName = randomString(6);
            //let records = _.clone(attractionList);
            let records = _.clone(attractionList.mostRelevantattrction);

            if (records.length > 0) {
                let setAttractionDistanceWiseObject = new setAttractionDistanceWiseRef(connectionString, collectionName, records);
                setAttractionDistanceWiseObject.processForSorting().then((result) => {
                    for (var i = 0; i < noOfDays; i++) {
                        let procAttractionList = calculateToDayWisePlan(result, noOfDays, cityId);
                        targetArray[i].attractionList = procAttractionList;
                        _.each(_.map(procAttractionList, (item) => {
                            return item.attractionId
                        }), (itemdata) => {
                            _.remove(result, (item) => {
                                return item.attractionId == itemdata
                            })
                        });
                    }
                    result.forEach(function(element) {
                        attractionList.otherRelevantattrction.unshift(element);
                    }, this);
                    targetArray["otherAttractionList"] = attractionList.otherRelevantattrction;
                    self.emit('onGetResult', targetArray);

                    // self.emit('onGetResult', targetArray);
                    // let procAttractionList = calculateToDayWisePlan(result, noOfDays, cityId);
                    // targetArray[currentIndex].attractionList = procAttractionList;
                    // _.each(_.map(procAttractionList, (item) => { return item.attractionId }), (itemdata) => { _.remove(attractionList, (item) => { return item.attractionId == itemdata }) });
                    // currentIndex++;
                    // if (currentIndex < noOfDays) {
                    //     showdata(attractionList, currentIndex, noOfDays, cityId, self);
                    // } else {
                    //     self.emit('onGetResult', targetArray);
                    // }
                });
            } else {
                self.emit('onGetResult', targetArray);
            }
        }

        showdata(attractionList, 0, this.noOfDays, this.cityId, this);

        return targetArray;

    }

    convertToDayWisePlan(attractionList) {
        let targetArray = this.prepareBlankArray(this.noOfDays);
        let totalMinutes = 0;
        let targetMinutesPerDay = 720;
        let totalTourMinutes = targetMinutesPerDay * this.noOfDays;
        let groupIndex = 0;
        let attractionListWithGroup = [];

        _.each(attractionList, (attractionItem, index) => {
            let blankItem = { "attractionName": "", "attractionId": "", "attractionVisitDuration": 0, "visitorFee": 0, "attractionVisitFeeCurrency": "", "attractionImage": "", "attractionTravelTheme": 0, "attractioncategory": 0, "attractionRating": 0, "index": 0 };
            blankItem.attractionName = attractionItem.attractionName;
            blankItem.attractionId = attractionItem.attractionId;
            blankItem.attractionVisitDuration = parseInt(attractionItem.attractionVisitDuration);
            blankItem.visitorFee = 0;
            blankItem.attractionVisitFeeCurrency = "";
            blankItem.attractionImage = attractionItem.attractionImage;
            blankItem.attractionTravelTheme = attractionItem.attractionTravelTheme
            blankItem.attractioncategory = attractionItem.attractioncategory
            blankItem.attractionRating = attractionItem.attractionRating;
            blankItem.index = index;
            totalMinutes += blankItem.duration;
            if (groupIndex < this.noOfDays) {
                if (totalMinutes <= targetMinutesPerDay) {
                    blankItem.groupIndex = groupIndex;
                } else {
                    totalMinutes = 0
                    groupIndex++;
                    blankItem.groupIndex = groupIndex;
                }
            } else {
                blankItem.groupIndex = this.noOfDays;
            }
            attractionListWithGroup.push(blankItem);
        });
        _.each(targetArray, (targetItem, index) => {
            let groupList = _.filter(attractionListWithGroup, (attractionItem) => {
                return attractionItem.groupIndex == index;
            })
            targetItem.attractionList = groupList;
        });
        return targetArray;
    }

    prepareOtherAttractionType(attractionList, resultSet) {
        let resultKeys = [];
        _.each(resultSet, (result) => {
            _.each(result.attractionList, (attraction) => {
                resultKeys.push(attraction.attractionId);
            })
        });
        _.each(resultKeys, (key) => {
            _.remove(attractionList, (attraction) => {
                return (attraction.attractionId == key)
            })
        });
        return attractionList;
    }

}

module.exports = attractionDetailDayWise;
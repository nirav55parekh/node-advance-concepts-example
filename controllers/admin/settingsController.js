var mongoose = require('mongoose');

var conn = mongoose.createConnection('mongodb://172.16.7.101/wootravelUATAtlasCopy1');
var conn2 = mongoose.createConnection('mongodb://172.16.7.101/wootravelUATAtlasCopy2');
var Schema = new mongoose.Schema({});

var model1admin = conn.model('AttractionMaster', Schema, 'AttractionMaster');
var model2admin = conn2.model('AttractionMaster', Schema, 'AttractionMaster');

var totalItrations = 0;
var counter = 0;
var bulkResults = [];
//include models
var SettingsModel = require('../../models/settings');

//include controllers
var BaseController = require('../baseController');
var Q = require('q');

class settingsController extends BaseController {
    constructor() {
        super();
        this.Settings = SettingsModel;
    }

    getSettings(req, res) {
        this.Settings.find({})
            .then(this.getSettingsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getSettingsCallback(res, settingsDetails) {
        this.send(res, 200, "Settings details!", settingsDetails);
    }

    addOrUpdate(req, res) {
        var settingsDetails = req.body.data;
        var that = this;
        this.Settings.findOneAndUpdate(
            { _id: settingsDetails._id }, settingsDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.addOrUpdateCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    addOrUpdateCallback(res, settingsDetails) {
        this.send(res, 200, "Settings Updated!", settingsDetails);
    }



    // Cron settings api


    attractionBulkUpdate(req, res) {
        model1admin.count()
            .then(this.findAllAttractionData.bind(this, res))
            .catch(this.handleError.bind(this));
    }

    findAllAttractionData(res, count) {
        var deferred = Q.defer();
        totalItrations = Math.round((count / 50000)) + 1;
        let firstSkip = 0;

        for (var i = 1; i <= totalItrations; i++) {
            model1admin.find({}, {
                attractionId: 1,
                attractionName: 1,
                address: 1,
                attractionCountry: 1,
                attractionState: 1,
                attractionCityName: 1,
                attractionCityId: 1,
                visitTime: 1,
                coords: 1,
                attractioncategory: 1
            })
                .batchSize(50000).skip(firstSkip).limit(50000)
                .then(this.startBulkUpdate.bind(this))
                .then(this.bulkExecute.bind(this, res))
                .catch(this.handleError.bind(this));
            firstSkip = (i * 50000) + 1;
        }
        return deferred.promise;
    }

    startBulkUpdate(result) {
        var deferred = Q.defer();
        var bulk = conn2.db.collection("AttractionMaster").initializeUnorderedBulkOp();
        let newData = null;
        result.forEach((admin, i) => {
            newData = admin._doc;
            bulk.find({
                'attractionId': newData.attractionId
            }).upsert().updateOne({
                $set: {
                    attractionName: newData.attractionName,
                    address: newData.address,
                    attractionCountry: newData.attractionCountry,
                    attractionState: newData.attractionState,
                    attractionCityName: newData.attractionCityName,
                    attractionCityId: newData.attractionCityId,
                    visitTime: newData.visitTime,
                    coords: newData.coords,
                    attractioncategory: newData.attractioncategory
                }
            });

            if (result.length - 1 == i)
                deferred.resolve(bulk);

        });
        return deferred.promise;
    }

    bulkExecute(res, bulk) {
        var deferred = Q.defer();
        var that = this;
        bulk.execute().then(function (response) {
            counter++;
            bulkResults.push(response)
            if (totalItrations === counter + 1) {
                that.bulkResponseCallback(res);
            }
            deferred.resolve(response);
        }).catch((e) => {
            deferred.reject(new Error("Request timeout!"));
        });
        return deferred.promise;
    }

    bulkResponseCallback(res) {
        this.send(res, 200, "Info updated!", bulkResults);
    }
}

module.exports = settingsController;
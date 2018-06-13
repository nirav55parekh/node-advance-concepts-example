//include models
var KeywordModel = require('../models/keyword');

//include controllers
var BaseController = require('./baseController');
var CommonController = require('./commonServicesController');

var Q = require('q');

class KeywordsController extends BaseController {
    constructor() {
        super();
        this.Keyword = KeywordModel;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    list(req, res) {

        var search = req.body;
        var conditions = this.commonController.getSearchConditions(search);
        var that = this;

        var aggregate = this.Keyword.aggregate();
        aggregate.
            match(conditions)
            .project({
                "id": "$_id",
                "keyword": "$keyword",
            });

        this.Keyword.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
            function (err, results, pageCount, count) {
                that.listCallBack(res, results, search, pageCount, count);
            });
    }

    /**
     * attracion data callback 
     */
    listCallBack(res, results, search, pageCount, count) {
        var listData = {
            list: results,
            page: parseInt(search.page),
            records: count,
            total: Math.ceil(count / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' keywords', listData);
    }

    getKeywordDetails(req, res) {
        var keywordId = req.query.keywordId;

        this.Keyword.findById(keywordId)
            .then(this.getKeywordDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getKeywordDetailsCallback(res, keywordDetails) {
        if (keywordDetails)
            this.send(res, 200, 'Keyword details found', keywordDetails);
        else
            this.send(res, 404, "No keyword details found", null);
    }

    addOrUpdate(req, res) {
        var keywordDetails = req.body.data;

        if (keywordDetails._id) {
            this.Keyword.findOneAndUpdate({ _id: keywordDetails._id }, keywordDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                .then(this.addOrUpdateCallback.bind(this, res, "Keyword details updated"))
                .catch(this.handleError.bind(this, res));
        } else {
            var keyword = new this.Keyword(keywordDetails);
            keyword.save()
                .then(this.addOrUpdateCallback.bind(this, res, "New Keyword details added"))
                .catch(this.handleError.bind(this, res));
        }

    }

    addOrUpdateCallback(res, message, keywordDetails) {
        this.send(res, 200, message, keywordDetails);
    }

    deleteKeyword(req, res) {
        var keywordId = req.query.keywordId;
        this.Keyword.remove({ _id: keywordId })
            .then(this.deleteKeywordCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    deleteKeywordCallback(res, data) {
        this.send(res, 200, "Keyword deleted", data);
    }


}

module.exports = KeywordsController;
//include models
var CategoryModel = require('../models/category');

//include controllers
var BaseController = require('./baseController');
var CommonController = require('./commonServicesController');

var Q = require('q');

class CategorysController extends BaseController {
    constructor() {
        super();
        this.Category = CategoryModel;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    list(req, res) {

        var search = req.body;
        var conditions = this.commonController.getSearchConditions(search);
        conditions.isDeleted = false;
        var that = this;

        var aggregate = this.Category.aggregate();
        aggregate.
            match(conditions)
            .project({
                "id": "$_id",
                "categoryName": "$categoryName",
                "categoryDisplayName": "$categoryDisplayName",
                "categoryType": "$categoryType",
                "discription": "$discription",
                "isActive": "$isActive",
            });

        this.Category.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
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
        this.send(res, 200, 'Found ' + results.length + ' categories', listData);
    }

    getCategoryDetails(req, res) {
        var categoryId = req.query.categoryId;

        this.Category.findById(categoryId)
            .then(this.getCategoryDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getCategoryDetailsCallback(res, categoryDetails) {
        if (categoryDetails)
            this.send(res, 200, 'Category details found', categoryDetails);
        else
            this.send(res, 404, "No category details found", null);
    }

    addOrUpdate(req, res) {
        var categoryDetails = req.body.data;

        if (categoryDetails._id) {
            this.Category.findOneAndUpdate({ _id: categoryDetails._id }, categoryDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                .then(this.addOrUpdateCallback.bind(this, res, "Category details updated"))
                .catch(this.handleError.bind(this, res));
        } else {
            var category = new this.Category(categoryDetails);
            category.save()
                .then(this.addOrUpdateCallback.bind(this, res, "New Category details added"))
                .catch(this.handleError.bind(this, res));
        }

    }

    addOrUpdateCallback(res, message, categoryDetails) {
        this.send(res, 200, message, categoryDetails);
    }

    deleteCategory(req, res) {
        var categoryId = req.query.categoryId;
        this.Category.findByIdAndUpdate(categoryId, { isDeleted: true , isActive :false })
            .then(this.deleteCategoryCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    deleteCategoryCallback(res, data) {
        this.send(res, 200, "Category deleted", data);
    }


}

module.exports = CategorysController;
var express = require("express");
var router = express.Router();

var CategoriesController = require('../controllers/categoriesController');

var categoriesRoute = function (expressApp) {
    var categoriesController = new CategoriesController();

    router.post('/list', categoriesController.list.bind(categoriesController));

    router.get('/getCategoryDetails', categoriesController.getCategoryDetails.bind(categoriesController));

    router.post('/addOrUpdate', categoriesController.addOrUpdate.bind(categoriesController));

    router.get('/deleteCategory', categoriesController.deleteCategory.bind(categoriesController));

    router.use(categoriesController.handleServerError.bind(categoriesController));

    expressApp.use('/api/categories', router);
}

module.exports = categoriesRoute;
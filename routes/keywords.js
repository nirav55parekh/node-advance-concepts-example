var express = require("express");
var router = express.Router();

var KeywordsController = require('../controllers/keywordsController');

var keywordsRoute = function (expressApp) {
    var keywordsController = new KeywordsController();

    router.post('/list', keywordsController.list.bind(keywordsController));

    router.get('/getKeywordDetails', keywordsController.getKeywordDetails.bind(keywordsController));

    router.post('/addOrUpdate', keywordsController.addOrUpdate.bind(keywordsController));

    router.get('/deleteKeyword', keywordsController.deleteKeyword.bind(keywordsController));

    router.use(keywordsController.handleServerError.bind(keywordsController));

    expressApp.use('/api/keywords', router);
}

module.exports = keywordsRoute;
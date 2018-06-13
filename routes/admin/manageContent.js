var express = require("express");
var router = express.Router();

var ManageContentController = require('../../controllers/admin/manageContentController');

var adminManageContentRoute = function (expressApp) {
    var manageContentController = new ManageContentController();

    router.post('/addOrUpdateContent', manageContentController.addOrUpdateContent.bind(manageContentController));

    router.get('/getContentDetails', manageContentController.getContentDetails.bind(manageContentController));

    router.post('/uploadPhoto', manageContentController.uploadPhoto.bind(manageContentController));

    router.post('/uploadVideo', manageContentController.uploadVideo.bind(manageContentController));

    router.post('/uploadVideoBusinessUser', manageContentController.uploadVideoBusinessUser.bind(manageContentController));

    router.use(manageContentController.handleServerError.bind(manageContentController));

    expressApp.use('/api/admin/manageContent', router);
}

module.exports = adminManageContentRoute;
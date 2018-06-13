var express = require("express");
var router = express.Router();

var CampaignsController = require('../../controllers/businessUser/manageCampaignController');

var campaignsRoute = function (expressApp) {
    var campaignsController = new CampaignsController();

    router.post('/list', campaignsController.list.bind(campaignsController));

    router.get('/getCampaignDetails', campaignsController.getCampaignDetails.bind(campaignsController));

    router.post('/uploadPhoto', campaignsController.uploadPhoto.bind(campaignsController));

    router.post('/addOrUpdate', campaignsController.addOrUpdate.bind(campaignsController));

    router.post('/deleteCampaign', campaignsController.deleteCampaign.bind(campaignsController));

    router.use(campaignsController.handleServerError.bind(campaignsController));

    expressApp.use('/api/business-user/campaigns', router);
}

module.exports = campaignsRoute;
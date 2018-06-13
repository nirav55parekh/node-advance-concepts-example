var express = require("express");
var router = express.Router();

var AdminCampaignsController = require('../../controllers/admin/manageCampaignController');

var AdminCampaignsRoute = function (expressApp) {
    var adminCampaignsController = new AdminCampaignsController();

    router.post('/list', adminCampaignsController.list.bind(adminCampaignsController));

    router.get('/getCampaignDetails', adminCampaignsController.getCampaignDetails.bind(adminCampaignsController));

    router.post('/uploadPhoto', adminCampaignsController.uploadPhoto.bind(adminCampaignsController));

    router.post('/addOrUpdate', adminCampaignsController.addOrUpdate.bind(adminCampaignsController));

    router.post('/deleteCampaign', adminCampaignsController.deleteCampaign.bind(adminCampaignsController));

    router.use(adminCampaignsController.handleServerError.bind(adminCampaignsController));

    expressApp.use('/api/admin/campaigns', router);
}

module.exports = AdminCampaignsRoute;
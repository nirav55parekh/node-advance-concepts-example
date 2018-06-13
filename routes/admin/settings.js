var express = require('express');
var router = express.Router();
var SettingsController = require('../../controllers/admin/settingsController');

var adminSettingsRoute = function (expressApp) {
    var settingsController = new SettingsController();

    router.post('/addOrUpdate', settingsController.addOrUpdate.bind(settingsController));

    router.get('/getSettings', settingsController.getSettings.bind(settingsController));

    router.get('/cronfire', settingsController.attractionBulkUpdate.bind(settingsController));

    router.use(settingsController.handleServerError.bind(settingsController));

    expressApp.use('/api/admin/settings', router);
};

module.exports = adminSettingsRoute;
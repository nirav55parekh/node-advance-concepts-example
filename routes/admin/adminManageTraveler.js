var express = require("express");
var router = express.Router();

var AdminManageTravelerController = require('../../controllers/admin/adminManageTravelerController');

var adminManageTravelerRoute = function (expressApp) {
    var adminManageTravelerController = new AdminManageTravelerController();

    router.get('/getAllTravelers', adminManageTravelerController.getTravelerData.bind(adminManageTravelerController));
    
    router.post('/updateTravelerStatus', adminManageTravelerController.updateTravelerStatus.bind(adminManageTravelerController));
    
    router.post('/deleteTraveler', adminManageTravelerController.deleteTraveler.bind(adminManageTravelerController));

    router.use(adminManageTravelerController.handleServerError.bind(adminManageTravelerController));

    expressApp.use('/api/adminManageTravelers', router);
}

module.exports = adminManageTravelerRoute;
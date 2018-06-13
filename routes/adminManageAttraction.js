var express = require("express");
var router = express.Router();

var AdminManageAttractionController = require('../controllers/adminManageAttractionController')

var adminManageAttractionRoute = function (expressApp) {
    var adminManageAttractionController = new AdminManageAttractionController();
    router.post('/getallattractions', adminManageAttractionController.getAttractionData.bind(adminManageAttractionController));

    router.post('/getAttractionDetailbyAttractionId', adminManageAttractionController.getAttractionDetailbyAttractionId.bind(adminManageAttractionController));
    
    router.post('/getAttractionDetailbyId', adminManageAttractionController.getAttractionDetailbyId.bind(adminManageAttractionController));

    router.post('/updateAttractionDetails', adminManageAttractionController.updateAttractionDetails.bind(adminManageAttractionController));

    router.post('/uploadPhoto', adminManageAttractionController.uploadPhoto.bind(adminManageAttractionController));

    router.get('/checkIfAttractionExistsInAnyTrip', adminManageAttractionController.checkIfAttractionExistsInAnyTrip.bind(adminManageAttractionController));

    router.post('/approveRejectAttraction', adminManageAttractionController.approveRejectAttraction.bind(adminManageAttractionController));

    router.get('/searchAttractions/:searchAttraction', adminManageAttractionController.searchAttractions.bind(adminManageAttractionController));

    //handle error in route
    router.use(adminManageAttractionController.handleServerError.bind(adminManageAttractionController));

    expressApp.use('/api/adminManageAttractions', router);
}

module.exports = adminManageAttractionRoute;
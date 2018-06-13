var express = require("express");
var router = express.Router();

var ManageAttractionController = require('../../controllers/businessUser/manageAttractionController')

var manageAttractionRoute = function (expressApp) {
    var manageAttractionController = new ManageAttractionController();
    router.post('/getallattractions', manageAttractionController.getAttractionData.bind(manageAttractionController));

    router.post('/getAttractionDetailbyAttractionId', manageAttractionController.getAttractionDetailbyAttractionId.bind(manageAttractionController));

    router.post('/updateAttractionDetails', manageAttractionController.updateAttractionDetails.bind(manageAttractionController));

    router.post('/uploadPhoto', manageAttractionController.uploadPhoto.bind(manageAttractionController));

    router.get('/searchAttractions/:searchAttraction', manageAttractionController.searchAttractions.bind(manageAttractionController));

    router.post('/checkBeforeAdd', manageAttractionController.checkBeforeAdd.bind(manageAttractionController));

    router.post('/associateReqForAttraction', manageAttractionController.associateReqForAttraction.bind(manageAttractionController));

    router.post('/reportOnAttraction', manageAttractionController.reportOnAttraction.bind(manageAttractionController));

    router.post('/checkBeforeUpdate', manageAttractionController.checkBeforeUpdate.bind(manageAttractionController));

    router.get('/getAttractionData/:destSearch', manageAttractionController.getAttractionDataSearch.bind(manageAttractionController));

    //handle error in route
    router.use(manageAttractionController.handleServerError.bind(manageAttractionController));

    expressApp.use('/api/business-user/ManageAttractions', router);
}

module.exports = manageAttractionRoute;
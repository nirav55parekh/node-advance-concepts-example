var express = require('express');
var router = express.Router();
var HomeController = require('../controllers/homeController');

var homeRoute = function (expressApp) {
    var homeController = new HomeController();

    router.get('/getDestination/:destSearch', homeController.getDestination.bind(homeController));

    router.get('/getCities/:stateId(\\d+)/', homeController.getCities.bind(homeController));

    router.get('/getStates/:countryId(\\d+)/', homeController.getStates.bind(homeController));

    router.get('/getCountries', homeController.getCountries.bind(homeController));

    router.get('/wizardQuestionDetails', homeController.wizardQuestionDetails.bind(homeController));

    router.post('/attractionListDayWise', homeController.getattractionListDayWiseLive.bind(homeController));

    router.post('/getWizardQuestionAnswerDetails', homeController.getWizardQuestionAnswerDetails.bind(homeController));

    //handle error in route
    router.use(homeController.handleServerError.bind(homeController));

    expressApp.use('/api/home', router);
};

module.exports = homeRoute;
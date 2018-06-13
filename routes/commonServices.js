var express = require('express');
var router = express.Router();
var CommonServicesController = require('../controllers/commonServicesController');

var commonServiceRoute = function (expressApp) {
    var commonServicesController = new CommonServicesController();

    router.get('/getTravellerProfileList', commonServicesController.getTravellerProfileList.bind(commonServicesController));

    router.get('/getCategoryList', commonServicesController.getCategoryList.bind(commonServicesController));

    router.get('/getCityStateCountryList', commonServicesController.getCityStateCountryList.bind(commonServicesController));

    router.get('/getCities/:stateId(\\d+)/', commonServicesController.getCities.bind(commonServicesController));

    router.get('/getStates/:countryId(\\d+)/', commonServicesController.getStates.bind(commonServicesController));

    router.get('/getCountries', commonServicesController.getCountries.bind(commonServicesController));

    router.get('/getCountryCities/:countryId(\\d+)/', commonServicesController.getCountryCities.bind(commonServicesController));

    router.get('/getTravellerThemeList', commonServicesController.getTravellerThemeList.bind(commonServicesController));

    router.get('/getPermissionList', commonServicesController.getPermissionList.bind(commonServicesController));

    router.get('/roleList', commonServicesController.getRoleList.bind(commonServicesController));

    router.get('/getDashboardCounts', commonServicesController.getDashboardCounts.bind(commonServicesController));
    
    router.get('/getDashboardCountsForBusinessUser', commonServicesController.getDashboardCountsForBusinessUser.bind(commonServicesController));

    router.get('/getBusinessUserList', commonServicesController.getBusinessUserList.bind(commonServicesController));

    //handle error in route
    router.use(commonServicesController.handleServerError.bind(commonServicesController));

    expressApp.use('/api/shared', router);
};

module.exports = commonServiceRoute;
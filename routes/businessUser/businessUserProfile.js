var express = require('express');
var router = express.Router();
var BusinessUsersController = require('../../controllers/businessUser/businessUsersController');

var businessUserRoute = function (expressApp) {
    var businessUsersController = new BusinessUsersController();

    router.post('/list', businessUsersController.list.bind(businessUsersController));

    router.post('/changeProfileStatus', businessUsersController.changeProfileStatus.bind(businessUsersController));

    router.post('/deleteBusinessUser', businessUsersController.deleteBusinessUser.bind(businessUsersController));

    router.post('/addOrUpdate', businessUsersController.addOrUpdate.bind(businessUsersController));

    router.get('/getBusinessUserDetails', businessUsersController.getBusinessUserDetails.bind(businessUsersController));

    router.post('/checkEmailAddressExist', businessUsersController.checkEmailAddressExist.bind(businessUsersController));

    router.post('/reSendVerificationLink', businessUsersController.resendVerificationLink.bind(businessUsersController));

    router.post('/changePassword', businessUsersController.changePassword.bind(businessUsersController));

    router.post('/updateProfile', businessUsersController.updateProfile.bind(businessUsersController));

    router.use(businessUsersController.handleServerError.bind(businessUsersController));

    expressApp.use('/api/business-user/', router);
};

module.exports = businessUserRoute;
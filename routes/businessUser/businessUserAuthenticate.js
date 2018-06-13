var express = require('express');
var router = express.Router();
var BusinessUserAuthenticateController = require('../../controllers/businessUser/businessUserAuthenticateController');

var businessUserAuthenticateRoute = function (expressApp) {
    var businessUserAuthenticateController = new BusinessUserAuthenticateController();

    router.post('/login', businessUserAuthenticateController.authenticate.bind(businessUserAuthenticateController));

    router.post('/verifyToken', businessUserAuthenticateController.verifyToken.bind(businessUserAuthenticateController));

    router.post('/verifyResetPassword', businessUserAuthenticateController.verifyResetPassword.bind(businessUserAuthenticateController));

    router.post('/resetNewPassword', businessUserAuthenticateController.resetNewPassword.bind(businessUserAuthenticateController));

    router.post('/setPassword', businessUserAuthenticateController.setPassword.bind(businessUserAuthenticateController));

    router.post('/logout', businessUserAuthenticateController.logout.bind(businessUserAuthenticateController));

    router.post('/forgotPassword', businessUserAuthenticateController.forgotPasswordEmailVerification.bind(businessUserAuthenticateController));

    router.post('/checkUserAvailable', businessUserAuthenticateController.checkUserAvailable.bind(businessUserAuthenticateController));

    router.use(businessUserAuthenticateController.handleServerError.bind(businessUserAuthenticateController));

    expressApp.use('/api/business-user/auth', router);
};

module.exports = businessUserAuthenticateRoute;
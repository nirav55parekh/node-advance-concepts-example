var express = require('express');
var router = express.Router();
var AdminAuthenticateController = require('../../controllers/admin/adminAuthenticateController');

var adminAuthenticateRoute = function (expressApp) {
    var adminAuthenticateController = new AdminAuthenticateController();

    router.post('/login', adminAuthenticateController.authenticate.bind(adminAuthenticateController));

    router.post('/verifyResetPassword', adminAuthenticateController.verifyResetPassword.bind(adminAuthenticateController));

    router.post('/resetNewPassword', adminAuthenticateController.resetNewPassword.bind(adminAuthenticateController));

    router.post('/setPassword', adminAuthenticateController.setPassword.bind(adminAuthenticateController));

    router.post('/logout', adminAuthenticateController.logout.bind(adminAuthenticateController));

    router.post('/forgotPassword', adminAuthenticateController.forgotPasswordEmailVerification.bind(adminAuthenticateController));

    router.post('/checkUserAvailable', adminAuthenticateController.checkUserAvailable.bind(adminAuthenticateController));

    router.use(adminAuthenticateController.handleServerError.bind(adminAuthenticateController));

    expressApp.use('/api/admin', router);
};

module.exports = adminAuthenticateRoute;
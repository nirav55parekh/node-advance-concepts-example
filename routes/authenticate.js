var express = require('express');
var router = express.Router();
var AuthenticateController = require('../controllers/authenticateController');

var authenticateRoute = function (expressApp) {
    var authenticateController = new AuthenticateController();

    router.post('/', authenticateController.authenticate.bind(authenticateController));

    router.post('/emailverify', authenticateController.verifyEmail.bind(authenticateController));

    router.post('/verifyResetPassword', authenticateController.verifyResetPassword.bind(authenticateController));

    router.post('/auth/token', authenticateController.verifySocialLoginToken.bind(authenticateController));

    router.post('/auth/checkUserAvailable', authenticateController.checkUserAvailable.bind(authenticateController));

    router.post('/auth/logout', authenticateController.logout.bind(authenticateController));

    router.use(authenticateController.handleServerError.bind(authenticateController));

    expressApp.use('/api/authenticate', router);
};

module.exports = authenticateRoute;
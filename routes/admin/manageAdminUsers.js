var express = require("express");
var router = express.Router();

var ManageAdminUsersController = require('../../controllers/admin/manageAdminUsersController');

var adminUsersRoute = function (expressApp) {
    var manageAdminUsersController = new ManageAdminUsersController();

    router.post('/list', manageAdminUsersController.list.bind(manageAdminUsersController));

    router.get('/getAdminUserDetails', manageAdminUsersController.getAdminUserDetails.bind(manageAdminUsersController));

    router.post('/addOrUpdate', manageAdminUsersController.addOrUpdate.bind(manageAdminUsersController));

    router.get('/deleteAdminUser', manageAdminUsersController.deleteAdminUser.bind(manageAdminUsersController));

    router.post('/changePassword', manageAdminUsersController.changePassword.bind(manageAdminUsersController));

    router.use(manageAdminUsersController.handleServerError.bind(manageAdminUsersController));

    expressApp.use('/api/admin-users', router);
}

module.exports = adminUsersRoute;
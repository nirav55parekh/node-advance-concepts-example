var express = require('express');
var router = express.Router();
var RolesController = require('../controllers/rolesController');

var rolesRoute = function (expressApp) {
    var rolesController = new RolesController();

    router.post('/list', rolesController.list.bind(rolesController));

    router.get('/getRoleDetails', rolesController.getRoleDetails.bind(rolesController));

    router.post('/addOrUpdate', rolesController.addOrUpdate.bind(rolesController));

    router.get('/deleteRole', rolesController.deleteRole.bind(rolesController));

    router.get('/getRolesAndPermissionsList', rolesController.getRolesAndPermissionsList.bind(rolesController));

    router.use(rolesController.handleServerError.bind(rolesController));

    expressApp.use('/api/roles', router);
};

module.exports = rolesRoute;
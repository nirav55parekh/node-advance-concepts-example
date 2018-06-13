var homeRoute = require('./home');
var authenticateRoute = require('./authenticate');
var travellersRoute = require('./travellers');
var bookingsRoute = require('./booking');
var rolesRoute = require('./roles');
var categoriesRoute = require('./categories');
var keywordsRoute = require('./keywords');

//businessUser routes
var businessUserAuthenticateRoute = require('./businessUser/businessUserAuthenticate');
var businessUserRoute = require('./businessUser/businessUserProfile');
var manageAttractionRoute = require('./businessUser/manageAttraction');
var campaignsRoute = require('./businessUser/manageCampaign');
var businessUserBookingRoute = require('./businessUser/manageBooking');

//admin routes
var adminAuthenticateRoute = require('./admin/adminAuthenticate');
var adminUsersRoute = require('./admin/manageAdminUsers');
var adminManageAttractionRoute = require('./adminManageAttraction');
var adminCampaignsRoute = require('./admin/manageCampaign');
var adminSettingsRoute = require('./admin/settings');
var adminManageTravelerRoute = require('./admin/adminManageTraveler');
var adminManageContentRoute = require('./admin/manageContent');
var adminBookingRoute = require('./admin/manageBooking');
var commonServiceRoute = require('./commonServices')
var fileNotFoundRoute = require('./FileNotFound404');

var routes = function(wootravelAPI) {
    //CORS Setting
    wootravelAPI.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    homeRoute(wootravelAPI);
    authenticateRoute(wootravelAPI);
    travellersRoute(wootravelAPI);
    rolesRoute(wootravelAPI);
    categoriesRoute(wootravelAPI);
    keywordsRoute(wootravelAPI);
    bookingsRoute(wootravelAPI);
    
    //businessUser rotue
    businessUserAuthenticateRoute(wootravelAPI);
    businessUserRoute(wootravelAPI);
    manageAttractionRoute(wootravelAPI);
    campaignsRoute(wootravelAPI);
    businessUserBookingRoute(wootravelAPI);

    //admin rotue
    adminAuthenticateRoute(wootravelAPI);
    adminUsersRoute(wootravelAPI);
    adminManageAttractionRoute(wootravelAPI);
    adminCampaignsRoute(wootravelAPI);
    adminManageTravelerRoute(wootravelAPI);
    adminManageContentRoute(wootravelAPI);
    adminSettingsRoute(wootravelAPI);
    adminBookingRoute(wootravelAPI);
    commonServiceRoute(wootravelAPI);
    fileNotFoundRoute(wootravelAPI);
};

module.exports = routes;
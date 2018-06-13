var express = require('express');
var router = express.Router();

var TravellersController = require('../controllers/travellersController');
var AuthenticateController = require('../controllers/authenticateController');

var travellersRoute = function (expressApp) {
    var travellersController = new TravellersController();
    var authenticateController = new AuthenticateController();

    //Token Authenticate middle-ware
    router.use(function (req, res, next) {
        if (req.method === 'POST' && (
            req.originalUrl.toLowerCase() === '/api/travellers' ||
            req.originalUrl.toLowerCase() === '/api/travellers/forgotpassword' ||
            req.originalUrl.toLowerCase() === '/api/travellers/checkemailaddressexist' ||
            req.originalUrl.toLowerCase() === '/api/travellers/checkemailforverificationexist' ||
            req.originalUrl.toLowerCase() === '/api/travellers/resendverificationlink' ||
            req.originalUrl.toLowerCase() === '/api/travellers/resetnewpassword' ||
            req.originalUrl.toLowerCase() === '/api/travellers/savetravelertrip' ||
            req.originalUrl.toLowerCase() === '/api/travellers/getmytrip' ||
            req.originalUrl.toLowerCase() === '/api/travellers/updatemytrip' ||
            req.originalUrl.toLowerCase() === '/api/travellers/getsimilerattraction' ||
            req.originalUrl.toLowerCase() === '/api/travellers/getnearbyattraction' ||
            req.originalUrl.toLowerCase() === '/api/travellers/whatsaroundme' ||
            req.originalUrl.toLowerCase() === '/api/travellers/deletetrip'
        )) {
            next();
        }
        else if (req.method === 'GET') {
            next();
        }
        else {
            authenticateController.authorize(req, res, next);
        }
    });

    router.post('/', travellersController.createTraveller.bind(travellersController));

    router.post('/checkEmailAddressExist', travellersController.checkEmailAddressExist.bind(travellersController));

    router.post('/checkEmailForVerificationExist', travellersController.checkEmailForVerificationExist.bind(travellersController));

    router.post('/reSendVerificationLink', travellersController.resendVerificationLink.bind(travellersController));

    router.post('/getProfile', travellersController.getTravellerProfile.bind(travellersController));

    router.post('/updateProfile', travellersController.updateTravellerProfile.bind(travellersController));

    router.post('/changePassword', travellersController.changePassword.bind(travellersController));

    router.post('/setPassword', travellersController.setPassword.bind(travellersController));

    router.post('/forgotPassword', travellersController.forgotPasswordEmailVerification.bind(travellersController));

    router.post('/resetNewPassword', travellersController.resetNewPassword.bind(travellersController));

    router.get('/getTravellerAttractionProfiles/:id', travellersController.getTravellerAttractionProfilesById.bind(travellersController));

    router.get('/getTravellerAttractionProfiles', travellersController.getTravellerAttractionProfiles.bind(travellersController));

    router.get('/getTravellerAttractionThemes', travellersController.getTravellerAttractionThemes.bind(travellersController));

    router.post('/saveTravelerTrip', travellersController.saveTravelerTrip.bind(travellersController));

    router.post('/getMyTrip', travellersController.getMyTrip.bind(travellersController));

    router.post('/deleteTrip', travellersController.deleteTrip.bind(travellersController));

    router.post('/updateMyTrip', travellersController.updateMyTrip.bind(travellersController));

    router.post('/getSimilerAttraction', travellersController.getSimilerAttraction.bind(travellersController));

    router.post('/getNearByAttraction', travellersController.getNearByAttraction.bind(travellersController));

    router.post('/whatsAroundMe', travellersController.whatsAroundMe.bind(travellersController));

    //handle error in route
    router.use(travellersController.handleServerError.bind(travellersController));

    expressApp.use('/api/travellers', router);
};

module.exports = travellersRoute;
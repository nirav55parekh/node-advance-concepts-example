var express = require("express");
var router = express.Router();


var BookingController = require('../../controllers/businessUser/manageBookingsController');
var businessUserBookingRoute = function(expressApp) {
    var bookingController = new BookingController();

    router.post('/list', bookingController.list.bind(bookingController));

    router.post('/changeStatus', bookingController.changeStatus.bind(bookingController));

    expressApp.use('/api/business-user/bookings', router);
};

module.exports = businessUserBookingRoute;
var express = require("express");
var router = express.Router();


var BookingController = require('../../controllers/admin/manageBookingsController');
var adminBookingRoute = function(expressApp) {
    var bookingController = new BookingController();

    router.post('/list', bookingController.list.bind(bookingController));

    router.post('/changeStatus', bookingController.changeStatus.bind(bookingController));

    expressApp.use('/api/admin/bookings', router);
};

module.exports = adminBookingRoute;
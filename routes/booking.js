var express = require("express");
var router = express.Router();


var BookingController = require('../controllers/bookingController');
var bookingRoute = function(expressApp) {
    var bookingController = new BookingController();
    router.post('/addBooking', bookingController.addBooking.bind(bookingController));

    router.get('/bookingList', bookingController.bookingList.bind(bookingController));

    router.post('/getBookingDetails', bookingController.getBookingDetails.bind(bookingController));

    expressApp.use('/api/bookings', router);
};

module.exports = bookingRoute;
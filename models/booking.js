let mongoose = require('mongoose');
/**
 * booking schema
 */
var bookings = new mongoose.Schema({
    bookingId: String,
    travellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'travellers' },
    firstName: String,
    lastName: String,
    emailId: String,
    contactNo: String,
    noofTravelers: {
        adult: Number,
        children: Number,
    },
    description: String,
    bookingSummary: {
        "tickets": {},
        "deals": {},
    },
    bookingRequestDate: { type: Date, default: Date.now },
    bookingMofifiedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('bookings', bookings, 'bookings');
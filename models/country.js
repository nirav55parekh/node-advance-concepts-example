var mongoose = require('mongoose');

var Countries = new mongoose.Schema({
    countryId: Number,
    countryCode: String,
    name: String,
    mobileCountryCode: String,
});

module.exports = mongoose.model('Countries', Countries,'countries');
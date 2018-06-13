var mongoose = require('mongoose');

var States = new mongoose.Schema({
    stateId: Number,
    name: String,
    countryId: Number,
});
module.exports = mongoose.model('States', States,'states');
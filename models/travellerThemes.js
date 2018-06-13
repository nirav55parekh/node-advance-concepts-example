var mongoose = require('mongoose');

var TravellerThemes = new mongoose.Schema({
    name: String,
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('travellerThemes', TravellerThemes, 'travellerThemes');
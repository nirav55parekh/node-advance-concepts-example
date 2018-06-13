var mongoose = require('mongoose');

var LoyaltyPrograms = new mongoose.Schema({
    id: Number,
    value: String,
});
module.exports = mongoose.model('loyaltyPrograms', LoyaltyPrograms,'loyaltyPrograms');
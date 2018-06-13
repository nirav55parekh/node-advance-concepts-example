var mongoose = require('mongoose');

var Cities = new mongoose.Schema({
    cityId: Number,
    name: String,
    stateId: Number,
});
module.exports = mongoose.model('Cities', Cities,'cities');
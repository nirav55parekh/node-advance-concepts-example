var mongoose = require('mongoose');

var attributeSetSchema = new mongoose.Schema({
    B: Number,
    R: Number,
    C: Number,
    I: Number,
    E: Number
});

let squenceSchema= new mongoose.Schema({
    key: String,
    val: Number,
    weight: Number,
    combinekey: String
});

var TravellerProfiles = new mongoose.Schema({
    profileName: String,
    order: Number,
    imagePath: String,
    profileId:Number,
    sequence:[squenceSchema],
    attractionAttributeSet: [attributeSetSchema],
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('travellerProfiles', TravellerProfiles, 'travellerProfiles');
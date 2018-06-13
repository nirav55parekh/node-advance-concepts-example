var mongoose = require('mongoose');

var WhatsAroundMeTempschema = new mongoose.Schema({
    attractionId: String,
    attractionName: String,
    attractioncontactNumber: String,
    attractioncategory: [String],
    attractionRating: String,
    coords: {
        lng: Number,
        lat: Number
    },
    location: {},
    // longitude: String,
    // latitude: String,
    visitTime: [{
        close: {
            day: Number,
            time: Number
        },
        open: {
            day: Number,
            time: Number
        }
    }],
    attractionCountryId: Number,
    attractionCountry: String,
    attractionStateId: Number,
    attractionState: String,
    attractionCityId: Number,
    attractionCityName: String,
    address: {
        city: String,
        state: String,
        country: String,
        formattedAddress: String
    },
    source: String,
    sourceID: String,
    date_created: { type: Date, default: Date.now },
    last_updated: { type: Date, default: Date.now }
});

WhatsAroundMeTempschema.index({ location: "2dsphere" });
var whatsAroundMeTempModel = mongoose.model("whatsAroundMeTemp", WhatsAroundMeTempschema, "whatsAroundMeTemp");

module.exports = whatsAroundMeTempModel;
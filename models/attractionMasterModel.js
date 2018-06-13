var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var AttractionMasterschema = new mongoose.Schema({
    attractionId: String,
    attractionName: String,
    attractioncontactNumber: String,
    attractioncategory: [String],
    attractionRating: String,
    coords: {
        lng: Number,
        lat: Number
    },
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
    attractionCountryId : Number,
    attractionCountry: String,
    attractionStateId : Number,
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

var CounterSchema = new mongoose.Schema({
    _id: { type: String, default: 'attractionId', required: true },
    seq: { type: Number, default: 0 }
});
var counter = mongoose.model('counter', CounterSchema);


AttractionMasterschema.pre('save', function (next) {
    var doc = this;
    counter.findByIdAndUpdate({ _id: 'attractionId' }, { $inc: { seq: 1 } }, function (error, counter) {
        if (error)
            return next(error);
        doc.attractionId = "WTA-" + counter.seq;
        next();
    });
});
AttractionMasterschema.plugin(mongoosePaginate);
AttractionMasterschema.plugin(mongooseAggregatePaginate);
var AttractionMasterModel = mongoose.model("AttractionMaster", AttractionMasterschema, "AttractionMaster");

module.exports = AttractionMasterModel;
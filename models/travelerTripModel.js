var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var saveTripDataSchema = new mongoose.Schema({
    // tripName: String,
    tripName: { type: String, required: [true, "Please provide Trip Name"] },
    destinationId: Number,
    travelerId: String,
    tripStartDate: Date,
    tripEndDate: Date,
    destinationName: String,
    isKidFriendly: String,
    profileId: String,
    destinationId: Number,
    destinationfullName: String,
    questionsAnswers: [
        // {
        // questionDescription: String,
        // questionIndex: Number,
        // options: [],
        // questions:[],
        // AnswerInfo:[]
        // options: [{
        //     B: Number,
        //     C: Number,
        //     E: Number,
        //     I: Number,
        //     R: Number,
        //     val: String
        // }]
        // }
    ],
    tripSummery: {
        tripMainEvents: [{
            dayTitle: String,
            attractionList: [{
                attractionId: String,
            }]
        }],
        tripOtherEvents: [{
            attractionId: String
        }]
    },
    date_created: { type: Date, default: Date.now },
    last_updated: { type: Date, default: Date.now }
})

// saveTripDataSchema.path('tripName').validate(function (value, done) {
//     this.model('saveTrip').count({ tripName: value }, function (err, count) {
//         if (err) {
//             return done(err);
//         }
//         // If `count` is greater than zero, "invalidate"
//         done(!count);
//     });
// }, 'Trip name is already exist. Please enter different trip name');

saveTripDataSchema.pre("save", function(next, done) {
    var self = this;
    mongoose.models["saveTrip"].findOne({ tripName: self._doc.tripName, travelerId: self._doc.travelerId, destinationId: self._doc.destinationId }, function(err, results) {
        if (err) {
            done(err);
        } else if (results) { //there was a result found, so the email address exists
            self.invalidate("tripName", "Trip name is already exist. Please enter different trip name");
            next(new Error("Trip name is already exist. Please enter different trip name"));
        } else {
            // done();
            next();
        }
    });
});

saveTripDataSchema.pre('findOneAndUpdate', function(next, done) {
    var self = this;
    //mongoose.models["saveTrip"].findOne({ tripName: self._update.tripName, travelerId: self._update.travelerId, _id: { $ne: self._update.tripId } }, function (err, results) {
    mongoose.models["saveTrip"].findOne({ $and: [{ destinationId: self._update.destinationId }, { tripName: self._update.tripName }, { travelerId: self._update.travelerId }, { _id: { $ne: self._update.tripId } }] }, function(err, results) {
        // mongoose.models["saveTrip"].findOne({ $and: [{ tripName: self._update.tripName }, { travelerId: self._update.travelerId }, { tripId: { $ne: self._update.tripId } }] }, function (err, results) {
        if (err) {
            done(err);
        } else if (results) { //there was a result found, so the email address exists
            self = results;
            self.invalidate("tripName", "Trip name is already exist. Please enter different trip name");
            next(new Error("Trip name is already exist. Please enter different trip name"));
        } else {
            // done();
            next();
        }
    });
});


saveTripDataSchema.plugin(mongoosePaginate);
saveTripDataSchema.plugin(mongooseAggregatePaginate);
var saveTripDataModel = mongoose.model("saveTrip", saveTripDataSchema, "saveTrip");

module.exports = saveTripDataModel;
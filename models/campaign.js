var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Campaigns = new mongoose.Schema({
    name: String,
    type: Number,
    description: String,
    campaignImage: String,
    attractionId: String,
    businessUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'businessUsers' },
    campaignDate: {
        startDate: Date,
        endDate: Date,
    },
    travellerLimits: Number,
    Click: { type: Number, default: 0 },
    Added: { type: Number, default: 0 },
    Impression: { type: Number, default: 0 },
    budgetPerTraveller: Number,
    budgetPerTravellerCurrency: String,
    targetingAudience: Number,
    travelThemes: [String],
    travelProfiles: [Number],
    headline: String,
    destinationUrl: String,
    isActive: { type: Boolean, default: true }
});

Campaigns.plugin(mongoosePaginate);
Campaigns.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('campaigns', Campaigns, 'campaigns');
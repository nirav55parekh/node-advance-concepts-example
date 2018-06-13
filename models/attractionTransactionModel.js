var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

attributeSetSchema = {
    "B": Number,
    "R": Number,
    "C": Number,
    "I": Number,
    "E": Number
};

var attractionTransactionDataSchema = new mongoose.Schema({
    attractionId: String,
    attractionDescription: String,
    attractionAnnualRevenueCurrency: String,
    businessUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'businessUsers' },
    attractionAnnualRevenue: Number,
    attractionContactTitle: Number,
    attractionContactName: String,
    attractionEmailAddress: String,
    attractionWebSite: String,
    attractionFacebookPage: String,
    attractionTripAdvisorPage: String,
    attractionInstagramPage: String,
    attractionVisitType: Number,
    attractionVisitFeeCurrency: String,
    attractionVisitFee: { type: Number, default: 0 },
    attractionVisitDuration: Number,
    attractionZipcode: String,
    isKidFriendly: Boolean,
    isAttractionActive: Boolean,
    attractionAttributeSet: attributeSetSchema,
    attractionTravelTheme: [String],
    attractionAverageDurationAtVenue: String,
    attractionCapacity: Number,
    attractionImage: String,
    attractionBannerImage: String,
    associationStatus: { type: Number, default: 4 },
    addedBy: Number,
    date_created: { type: Date, default: Date.now },
    last_updated: { type: Date, default: Date.now }
});
attractionTransactionDataSchema.plugin(mongoosePaginate);
attractionTransactionDataSchema.plugin(mongooseAggregatePaginate);

var AttractionTransctionDataModel = mongoose.model("attractionTransaction", attractionTransactionDataSchema, "attractionTransaction");

module.exports = AttractionTransctionDataModel;
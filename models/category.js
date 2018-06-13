var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Categories = new mongoose.Schema({
    categoryName: String,
    categoryDisplayName: String,
    discription : String,
    categoryType: String,
    isActive: Boolean,
    isDeleted : {type : Boolean , default : false}
});

Categories.plugin(mongoosePaginate);
Categories.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('attractionCategory', Categories,'attractionCategory');
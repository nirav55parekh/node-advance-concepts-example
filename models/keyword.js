var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Keywords = new mongoose.Schema({
    keyword: String
});

Keywords.plugin(mongoosePaginate);
Keywords.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('attractionKeyword', Keywords,'attractionKeyword');
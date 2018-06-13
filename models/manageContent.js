var mongoose = require('mongoose');

var ManageContent = new mongoose.Schema({
    type : Number,
    contents: [mongoose.Schema.Types.Mixed],
    date_created: { type: Date, default: Date.now },
    last_updated: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ManageContent', ManageContent, 'ManageContent');
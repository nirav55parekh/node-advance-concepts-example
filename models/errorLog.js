var mongoose = require('mongoose');

var ErrorLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    reqUrl: String,
    reqMethod: String,
    message: String,
    stack: String,
    date: Date
});

var ErrorLogModel = mongoose.model("ErrorLog", ErrorLogSchema, "ErrorLog");

module.exports = ErrorLogModel;
var mongoose = require('mongoose');

var Questions = new mongoose.Schema({
    questionIndex: Number,
    questionDescription: String,
    questionType: Number,
    extraInfo: {},
    options: {
        index: Number,
        description: String
    },
    answerInfo: {
        totalPerson: Number
    }
});

module.exports = mongoose.model('questions', Questions);
var mongoose = require('mongoose');

var validateEmail = function (email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

var Settings = new mongoose.Schema({
    dealsAndNotification: { type: String, required: [true, "Please provide email id"], validate: [validateEmail, "Please provide valid email id"], maxlength: [50, "Email : Max 50 character"] },
    associationRequestNotification: { type: String, required: [true, "Please provide email id"], validate: [validateEmail, "Please provide valid email id"], maxlength: [50, "Email : Max 50 character"] },
    // ticketNotification: { type: String, required: [true, "Please provide email id"], validate: [validateEmail, "Please provide valid email id"], maxlength: [50, "Email : Max 50 character"] },
});

module.exports = mongoose.model('settings', Settings, 'settings');
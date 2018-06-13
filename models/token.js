var mongoose = require('mongoose');

var TokenSchema = new mongoose.Schema({
    token: { type: String, index: true },
    type: String, //Token Type - Auth for authentication, EmailVerify for email verification
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'travellers' },
    adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'admins' },
    businessUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'businessUsers' },
    isExpired: Boolean
});

var TokenModel = mongoose.model("Token", TokenSchema, "Token");

module.exports = TokenModel;
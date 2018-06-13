var mongoose = require('mongoose');

var Permissions = new mongoose.Schema({
    permissionName: String,
    isActive: Boolean
});
module.exports = mongoose.model('permissions', Permissions, 'permissions');
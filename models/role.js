var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var Roles = new mongoose.Schema({
    roleName: String,
    description: String,
    isActive: Boolean,
    permissions: [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'permissions' },
        isActive: {type : Boolean,default: false}
    }]
});

Roles.plugin(mongoosePaginate);
Roles.plugin(mongooseAggregatePaginate);
module.exports = mongoose.model('roles', Roles, 'roles');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var Q = require('q');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var validateEmail = function (email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

var validatePassword = function (password) {
    var re = /^(?=.*[A-Za-z_@.\/#&+-])(?=.*\d)[A-Za-z_@.\/#&+\-\d]{8,}$/;
    return re.test(password);
};

var validateAdminName = function (adminName) {
    var re = /^[a-zA-Z0-9\-\s]+$/;
    return re.test(adminName);
};


var Admins = new mongoose.Schema({
    adminName: { type: String, required: [true, "Please provide your full name"], validate: [validateAdminName, "Please Enter Full Name"], maxlength: [200, "Full name : Max 200 character"] },
    emailId: { type: String, required: [true, "Please provide email id"], validate: [validateEmail, "Please provide valid email id"], maxlength: [200, "Email : Max 200 character"] },
    password: { type: String, minlength: [8, "Password should a 8-character length with at least 1 alphabet and 1 number"] },
    tempPassword : String,
    contactNo: String,
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'roles' },
    isActive: Boolean,
    created: { type: Date, default: Date.now },
    modified: { type: Date, default: Date.now },
});

Admins.pre('save', function (next) {
    var admin = this;
    if (!admin.isModified('password')) { return next() };
    getPasswordHash(admin.password)
        .then(function (hash) {
            admin.password = hash;
            next();
        })
        .catch(function (err) {
            next(err);
        });
});

Admins.pre('update', function (next) {
    var updateQuery = this;
    updateQuery.setOptions({
        new: true,
        runValidators: true
    });
    if (Object.keys(updateQuery._update.$set).indexOf('password') === -1) {
        return next();
    }
    let password = updateQuery._update.$set.password;
    let passwordMinLength = updateQuery.schema.obj.password.minlength[0];
    if (password && password.trim().length >= passwordMinLength) {
        getPasswordHash(updateQuery._update.$set.password)
            .then(function (hash) {
                updateQuery.update({}, { $set: { password: hash } });
                next();
            })
            .catch(function (err) {
                next(err);
            });
    }
    else {
        let err = new Error();
        err.name = "ValidationError"
        err.errors = { "password": { message: updateQuery.schema.obj.password.minlength[1].replace("{MINLENGTH}", passwordMinLength) } }
        next(err);
    }

});

Admins.methods.toJSON = function () {
    var admin = this.toObject();
    delete admin.password;
    return admin;
};

Admins.methods.comparePassword = function (password) {
    var deferred = Q.defer();
    bcrypt.compare(password, this.password, function (err, isMatch) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(isMatch);
        }
    });
    return deferred.promise;
};

var getPasswordHash = function (password) {
    var deferred = Q.defer();
    bcrypt.genSalt(10, function (err, salt) {
        if (err) { deferred.reject(err); } else {
            bcrypt.hash(password, salt, null, function (err, hash) {
                if (err) { deferred.reject(err); } else {
                    deferred.resolve(hash);
                }
            });
        }
    });
    return deferred.promise;
};

Admins.plugin(mongoosePaginate);
Admins.plugin(mongooseAggregatePaginate);

var AdminsModel = mongoose.model('admins', Admins, 'admins');

// Unique EmailId Validation
AdminsModel.schema.path('emailId').validate(function (value, respond) {
    //only validate when it is modified
    if (this.isModified('emailId')) {
        AdminsModel.findOne({ emailId: value, isActive: true }, function (err, admin) {
            if (admin) {
                respond(false);
            }
            else {
                ;
                respond(true);
            }
        });
    }
    else {
        respond(true);
    }
}, 'The email address with you are trying to register which is already associated with some another account');

module.exports = AdminsModel;
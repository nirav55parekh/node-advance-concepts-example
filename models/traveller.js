var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var bcrypt = require('bcrypt-nodejs');
var Q = require('q');

var validateEmail = function (email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

var validatePassword = function (password) {
    var re = /^(?=.*[A-Za-z_@.\/#&+-])(?=.*\d)[A-Za-z_@.\/#&+\-\d]{8,}$/;
    return re.test(password);
};

var validateFullName = function (fullName) {
    var re = /^[a-zA-Z0-9\-\s]+$/;
    return re.test(fullName);
};

var Travellers = new mongoose.Schema({
    emailId: { type: String, required: [true, "Please provide email id"], validate: [validateEmail, "Please provide valid email id"], maxlength: [50, "Email : Max 50 character"] },
    fullName: { type: String, required: [true, "Please provide your full name"], validate: [validateFullName, "Please Enter Correct Full Name"], maxlength: [50, "Full name : Max 50 character"] },
    fbUserId: String,
    gender: Number,
    cityId: Number,
    countryId: Number,
    stateId: Number,
    address: { type: String, maxlength: [300, "Address : Max 300 character"] },
    zipcode: { type: String, maxlength: [12, "Zipcode : Max 12 character"] },
    password: { type: String, minlength: [8, "Password should a 8-character length with at least 1 alphabet and 1 number"] },
    isEmailVerified: Boolean,
    isSocialLogin: Boolean,
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    created: { type: Date, default: Date.now },
    modified: { type: Date, default: Date.now },
});


Travellers.pre('save', function (next) {
    var traveller = this;
    if (!traveller.isModified('password')) { return next() };
    getPasswordHash(traveller.password)
        .then(function (hash) {
            traveller.password = hash;
            next();
        })
        .catch(function (err) {
            next(err);
        });
});

Travellers.pre('update', function (next) {
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

Travellers.methods.toJSON = function () {
    var traveller = this.toObject();
    delete traveller.password;
    return traveller;
};

Travellers.methods.comparePassword = function (password) {
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

Travellers.plugin(mongoosePaginate);
Travellers.plugin(mongooseAggregatePaginate);
var TravellersModel = mongoose.model('travellers', Travellers, 'travellers');

// Unique EmailId Validation
TravellersModel.schema.path('emailId').validate(function (value, respond) {
    //only validate when it is modified
    if (this.isModified('emailId')) {
        TravellersModel.findOne({ emailId: value, isEmailVerified: true, isActive: true , isDeleted : false }, function (err, traveller) {
            if (traveller) {
                respond(false);
            }
            else {
                respond(true);
            }
        });
    }
    else {
        respond(true);
    }
}, 'The email address with you are trying to register which is already associated with some another traveler account');

module.exports = TravellersModel;
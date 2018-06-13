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

var validateBusinessUserName = function (businessUserName) {
    var re = /^[a-zA-Z0-9\-\s]+$/;
    return re.test(businessUserName);
};


var BusinessUsers = new mongoose.Schema({
    emailId: { type: String, required: [true, "Please provide email id"], validate: [validateEmail, "Please provide valid email id"], maxlength: [50, "Email : Max 50 character"] },
    password: { type: String, minlength: [8, "Password should a 8-character length with at least 1 alphabet and 1 number"] },
    contactNo: String,
    address: String,
    cityId: { type: Number, ref: 'cities' },
    stateId: { type: Number, ref: 'states' },
    countryId: { type: Number, ref: 'countries' },
    companyAnnualRevenueCurrency: String,
    companyAnnualRevenue: Number,
    companyName: String,
    companySize: Number,
    contactTitle: Number,
    contactPersonName: { type: String, required: [true, "Please provide your name"], validate: [validateBusinessUserName, "Please Enter correct name"], maxlength: [50, "Full name : Max 50 character"] },
    zipcode: String,
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
    companyWebSite: String,
    companyFbPage: String,
    companyTripAdvisorPage: String,
    companyInstaPage: String,
    status: { type: Number, default: 1 },
    created: { type: Date, default: Date.now },
    modified: { type: Date, default: Date.now },
});

BusinessUsers.pre('save', function (next) {
    var businessUser = this;
    if (!businessUser.isModified('password')) { return next() };
    getPasswordHash(businessUser.password)
        .then(function (hash) {
            businessUser.password = hash;
            next();
        })
        .catch(function (err) {
            next(err);
        });
});

BusinessUsers.pre('findOneAndUpdate', function (next, done) {
    var self = this;
    var updateQuery = this;
    mongoose.models["businessUsers"].findOne({ emailId: self._update.emailId, _id: self._update._id, _id: { $ne: self._update._id } }, function (err, results) {
        // mongoose.models["saveTrip"].findOne({ $and: [{ tripName: self._update.tripName }, { travelerId: self._update.travelerId }, { tripId: { $ne: self._update.tripId } }] }, function (err, results) {
        if (err) {
            done(err);
        } else if (results) { //there was a result found, so the email address exists
            if (results.isDelete) {
                next();
            } else {
                self = results;
                self.invalidate("emailId", "The email address with you are trying to register which is already associated with some another account");
                next(new Error("The email address with you are trying to register which is already associated with some another account"));
            }
        } else {
            if (!("password" in updateQuery._update)) {
                return next();
            }
            let password = updateQuery._update.password;
            let passwordMinLength = updateQuery.schema.obj.password.minlength[0];
            if (password && password.trim().length >= passwordMinLength) {
                getPasswordHash(updateQuery._update.password)
                    .then(function (hash) {
                        updateQuery.update({}, { $set: { password: hash } });
                        delete self._update.password;
                        next();
                    })
                    .catch(function (err) {
                        next(err);
                    });
            }
        }
    });
});

BusinessUsers.pre('update', function (next) {
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

BusinessUsers.methods.toJSON = function () {
    var businessUser = this.toObject();
    delete businessUser.password;
    return businessUser;
};

BusinessUsers.methods.comparePassword = function (password) {
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

BusinessUsers.plugin(mongoosePaginate);
BusinessUsers.plugin(mongooseAggregatePaginate);

var BusinessUsersModel = mongoose.model('businessUsers', BusinessUsers, 'businessUsers');

// Unique EmailId Validation
BusinessUsersModel.schema.path('emailId').validate(function (value, respond) {
    //only validate when it is modified
    if (this.isModified('emailId')) {
        BusinessUsersModel.findOne({ emailId: value }, function (err, businessUser) {
            if (businessUser) {
                if (businessUser.isDelete) {
                    respond(true);
                } else {
                    respond(false);
                }
            }
            else {
                respond(true);
            }
        });
    }
    else {
        respond(true);
    }
}, 'The email address with you are trying to register which is already associated with some another account');

module.exports = BusinessUsersModel;
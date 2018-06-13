//include models
var AdminModel = require('../../models/admin');

//include controllers
var BaseController = require('../baseController');
var CommonController = require('../commonServicesController');
var EmailController = require('../emailController');
var Messages = require('../../enum/wootravelEnum');

var Q = require('q');

class manageAdminUsersController extends BaseController {
    constructor() {
        super();
        this.Admin = AdminModel;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    list(req, res) {

        var search = req.body;
        var conditions = this.commonController.getSearchConditions(search);

        var that = this;

        var aggregate = this.Admin.aggregate();
        aggregate
            .lookup({
                from: "roles",
                localField: "roleId",
                foreignField: "_id",
                as: "roles"
            })
            .match(conditions)
            .project({
                "id": "$_id",
                "adminName": "$adminName",
                "emailId": "$emailId",
                "contactNo": "$contactNo",
                "role": {
                    $arrayElemAt: [
                        "$roles.roleName",
                        0
                    ]
                },
                "isActive": "$isActive"
            });

        this.Admin.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
            function (err, results, pageCount, count) {
                that.listCallBack(res, results, search, pageCount, count);
            });
    }

    /**
     * attracion data callback 
     */
    listCallBack(res, results, search, pageCount, count) {
        var listData = {
            list: results,
            page: parseInt(search.page),
            records: count,
            total: Math.ceil(count / parseInt(search.pgsize))
        };
        this.send(res, 200, 'Found ' + results.length + ' admin users', listData);
    }

    getAdminUserDetails(req, res) {
        var adminUserId = req.query.adminUserId;

        this.Admin.findById(adminUserId)
            .then(this.getAdminUserDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res))
    }

    getAdminUserDetailsCallback(res, adminUserDetails) {
        if (adminUserDetails)
            this.send(res, 200, 'Admin details found', adminUserDetails);
        else
            this.send(res, 404, "No Admin details found", null);
    }

    addOrUpdate(req, res) {
        var that = this;
        var adminUserDetails = req.body.data;
        if (adminUserDetails._id) {
            that.Admin.findOne({ emailId: { $eq: adminUserDetails.emailId } })
                .then(function (response) {
                    if (response == null) {
                        that.Admin.findOneAndUpdate({ _id: adminUserDetails._id }, adminUserDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                            .then(that.addOrUpdateCallback.bind(that, res, "User details updated"))
                            .catch(that.handleError.bind(that, res));
                    }
                    else if (response != null && adminUserDetails._id === response._id.toString()) {
                        that.Admin.findOneAndUpdate({ _id: adminUserDetails._id }, adminUserDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                            .then(that.addOrUpdateCallback.bind(that, res, "User details updated"))
                            .catch(that.handleError.bind(that, res));
                    } else {
                        that.send(res, 400, ["The email address which you are trying to update is already associated with some another account"], []);
                    }
                })
                .catch(this.handleError.bind(this, res));
        } else {
            adminUserDetails.tempPassword = this.generateRandomPassword();
            var admin = new this.Admin(adminUserDetails);
            admin.save()
                .then(this.sendEmailVerificationCallback.bind(this, res))
                .then(this.addOrUpdateCallback.bind(this, res, "User details added"))
                .catch(this.handleError.bind(this, res));
        }
    }

    /**
     *sendEmailVerificationCallback function
     */
    sendEmailVerificationCallback(res, data) {
        try {
            var emailController = new EmailController(this.getFullUrl(res.req));
            return emailController.prepareAdminUserVerificationTemplate(data);
        } catch (error) {

        }
    }

    addOrUpdateCallback(res, message, adminUserDetails) {
        this.send(res, 200, message, adminUserDetails);
    }


    validateDuplicateEmailCallback(res, message, adminUserDetails) {
        this.send(res, 200, message, adminUserDetails);
    }

    deleteAdminUser(req, res) {
        var adminUserId = req.query.adminUserId;
        this.Admin.remove({ _id: adminUserId })
            .then(this.deleteAdminUserCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    deleteAdminUserCallback(res, data) {
        this.send(res, 200, "User deleted", data);
    }

    changePassword(req, res) {
        try {
            var adminUserDetails = req.body.data;
            this.Admin.findById(adminUserDetails._id)
                .then(this.compareWithOldPassword.bind(this, res, adminUserDetails.oldPassword, adminUserDetails.newPassword))
                .then(this.saveChangedPassword.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }
    }

    changePasswordCallback(res) {
        this.send(res, 200, 'Password changed.', null);
    }

    compareWithOldPassword(res, oldPassword, newPassword, adminUser) {
        try {
            var deferred = Q.defer();
            adminUser.comparePassword(oldPassword)
                .then(function (isMatch) {
                    if (!isMatch) {
                        deferred.reject(new Error(Messages.error.oldPasswordMatch));
                    } else {
                        if (oldPassword === newPassword) {
                            deferred.reject(new Error(Messages.error.oldNewPasswordMatch));
                        } else {
                            adminUser.password = newPassword;
                            deferred.resolve(adminUser);
                        }
                    }
                });

            return deferred.promise;
        } catch (error) {

        }

    }

    saveChangedPassword(res, adminUser) {
        try {
            adminUser.save()
                .then(this.changePasswordCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        } catch (error) {

        }

    }


    generateRandomPassword() {
        var length = 8,
            chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            result = '';
        for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
        return result;
    }

}

module.exports = manageAdminUsersController;
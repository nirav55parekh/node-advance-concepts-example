//include models
var RoleModel = require('../models/role');
var PermissionModel = require('../models/permission');

//include controllers
var BaseController = require('./baseController');
var CommonController = require('./commonServicesController');

var Q = require('q');
var _ = require('lodash');
var ObjectId = require('mongodb').ObjectId;

class RolesController extends BaseController {
    constructor() {
        super();
        this.Role = RoleModel;
        this.Permission = PermissionModel;
        this.commonController = new CommonController();
    }

    /**
     * get list of all atttractions
     */
    list(req, res) {

        var search = req.body;
        var conditions = this.commonController.getSearchConditions(search);

        var that = this;

        var aggregate = this.Role.aggregate();
        aggregate.
            match(conditions)
            .project({
                "id": "$_id",
                "roleName": "$roleName",
                "description": "$description",
                "isActive": "$isActive"
            });

        this.Role.aggregatePaginate(aggregate, { page: search.page, limit: search.pgsize },
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
        this.send(res, 200, 'Found ' + results.length + ' roles', listData);
    }

    getRoleDetails(req, res) {
        var roleId = req.query.roleId;

        this.Role.findById(roleId)
            .then(this.getRoleDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getRoleDetailsCallback(res, roleDetails) {
        if (roleDetails)
            this.send(res, 200, 'Role details found', roleDetails);
        else
            this.send(res, 404, "No role details found", null);
    }

    addOrUpdate(req, res) {
        var roleDetails = req.body.data;

        if (roleDetails._id) {
            this.Role.findOneAndUpdate({ _id: roleDetails._id }, roleDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                .then(this.addOrUpdateCallback.bind(this, res, "Role details updated"))
                .catch(this.handleError.bind(this, res));
        } else {
            var role = new this.Role(roleDetails);
            role.save()
                .then(this.addOrUpdateCallback.bind(this, res, "New Role details added"))
                .catch(this.handleError.bind(this, res));
        }

    }

    addOrUpdateCallback(res, message, roleDetails) {
        this.send(res, 200, message, roleDetails);
    }

    deleteRole(req, res) {
        var roleId = req.query.roleId;
        this.Role.remove({ _id: roleId })
            .then(this.deleteRoleCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    deleteRoleCallback(res, data) {
        this.send(res, 200, "Role deleted", data);
    }

    getRolesAndPermissionsList(req, res) {
        this.Role.aggregate([
            {
                $project: {
                    "id": "$_id",
                    "roleName": "$roleName",
                    "permissions": {
                        "$filter": {
                            "input": "$permissions",
                            "as": "permission",
                            "cond": { "$eq": ["$$permission.isActive", true] }
                        }
                    }
                }
            }
        ])
            .then(this.getPermissionsListCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getPermissionsListCallback(res, list) {
        this.Permission
            .find({})
            .select({ "permissionKey": 1 })
            .then(this.getRolesAndPermissionsListCallback.bind(this, res, list));
    }

    getRolesAndPermissionsListCallback(res, roles, permissions) {
        var permissionList = _.map(permissions, function (value, prop) {
            return { id: value._doc._id, value: value._doc.permissionKey };
        });

        var rolesAndPermissions = {};
        roles.forEach(function (role) {
            rolesAndPermissions[role.roleName] = [];
            role.permissions.forEach(function (rolePermission) {
                permissionList.forEach(function (permission) {
                    if (permission.id.toString() == rolePermission._id.toString()) {
                        rolesAndPermissions[role.roleName].push(permission.value);
                    }
                }, this);
            }, this);
        }, this);

        this.send(res, 200, "Roles and Permissions", rolesAndPermissions);
    }
}

module.exports = RolesController;
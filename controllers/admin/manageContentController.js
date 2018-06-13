var mongoose = require('mongoose');

//include models
var ManageContentModel = require('../../models/manageContent');
var QuestionModel = require('../../models/question');

//include controllers
var BaseController = require('../baseController');
var Q = require('q');
var path = require('path');
var mv = require('mv');
var fs = require('fs-extra');

class manageContentController extends BaseController {
    constructor() {
        super();
        this.ManageContent = ManageContentModel;
        this.Question = QuestionModel;
    }

    addOrUpdateContent(req, res) {
        var contentDetails = req.body.data;
        var that = this;
        if ("type" in req.body && req.body.type == 1.1) {
            contentDetails.forEach(function (element) {
                this.Question.findOneAndUpdate({ _id: mongoose.Types.ObjectId(element._id) }, element, { upsert: true, new: true, setDefaultsOnInsert: true })
                    .then(function (response) {
                        if (response.questionIndex == 7) {
                            that.send(res, 200, "Content Updated!", response);
                        }
                    })
                    .catch(this.handleError.bind(this, res));
            }, this);

        } else {
            if (contentDetails._id) {
                this.ManageContent.findOneAndUpdate({ _id: contentDetails._id }, contentDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
                    .then(this.addOrUpdateCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            } else {
                var contents = new this.ManageContent(contentDetails);
                contents.save()
                    .then(this.addOrUpdateCallback.bind(this, res))
                    .catch(this.handleError.bind(this, res));
            }
        }

    }

    addOrUpdateCallback(res, contentDetails) {
        this.send(res, 200, "Content Updated!", contentDetails);
    }

    addOrUpdateVideoCallback(res, contentDetails) {
        this.send(res, 200, "Video Uploaded!", contentDetails);
    }

    uploadPhoto(req, res) {

        if (!req.files.file) {
            this.send(res, 200, '', "");
        }
        var file = req.files.file;
        var contentDetails = req.body.contentDetails;
        var contentId = req.body.contentId;
        var oldImages = req.body.oldImages;
        var setImage = { "contents": { "backgroundImage": oldImages.backgroundImage } };
        if (file) {
            var tempPath = file.path;
            var imageName = this.generateRandomImageName("random");
            var targetPath = path.join(__dirname, "../../uploads/manage-content/" + imageName + path.extname(file.name));
            var saveName = imageName + path.extname(file.name);
            setImage.contents.backgroundImage = saveName;

            mv(tempPath, targetPath, function (err) {
                if (err) {
                    console.log(err);
                } else {

                }
            });

            if (oldImages.backgroundImage) {
                fs.remove(path.join(__dirname, "../../uploads/manage-content/" + oldImages.backgroundImage), (err) => {
                    if (err) throw err;
                });
            }
        }

        contentDetails.contents[0].backgroundImage = setImage.contents.backgroundImage;

        this.ManageContent.findOneAndUpdate({ _id: contentDetails._id }, contentDetails, { upsert: true, new: true, setDefaultsOnInsert: true })
            .then(this.addOrUpdateCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    uploadVideo(req, res) {

        if (!req.files.file) {
            this.send(res, 200, '', "");
        }
        var file = req.files.file;
        if (path.extname(file.name).toLowerCase() !== '.mp4') {
            this.send(res, 301, 'Only MP4 Video Allow', "");
        } else {
            var contentDetails = req.body.contentDetails;
            var contentId = req.body.contentId;
            // var oldImages = req.body.oldImages;
            // var setImage = { "contents": { "backgroundImage": oldImages.backgroundImage } };
            if (file) {
                var tempPath = file.path;
                var videoName = "homeVideo"
                var targetPath = path.join(__dirname, "../../uploads/manage-content/" + videoName + path.extname(file.name));
                var saveName = videoName + path.extname(file.name);
                // setImage.contents.backgroundImage = saveName;

                mv(tempPath, targetPath, function (err) {
                    if (err) {
                        console.log(err);
                    } else {

                    }
                });
            }

            contentDetails.contents[0].videoUrl = saveName;

            this.ManageContent.findOneAndUpdate({ _id: contentDetails._id }, contentDetails.contents[0], { upsert: true, new: true, setDefaultsOnInsert: true })
                .then(this.addOrUpdateCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        }
    }

    uploadVideoBusinessUser(req, res) {

        if (!req.files.file) {
            this.send(res, 200, '', "");
        }
        var file = req.files.file;
        if (path.extname(file.name).toLowerCase() !== '.mp4') {
            this.send(res, 301, 'Only MP4 Video Allow', "");
        } else {
            var contentDetails = req.body.contentDetails;
            var contentId = req.body.contentId;
            // var oldImages = req.body.oldImages;
            // var setImage = { "contents": { "backgroundImage": oldImages.backgroundImage } };
            if (file) {
                var tempPath = file.path;
                var videoName = "homeVideoBusinessUser"
                var targetPath = path.join(__dirname, "../../uploads/manage-content/" + videoName + path.extname(file.name));
                var saveName = videoName + path.extname(file.name);
                // setImage.contents.backgroundImage = saveName;

                mv(tempPath, targetPath, function (err) {
                    if (err) {
                        console.log(err);
                    } else {

                    }
                });
            }

            contentDetails.contents.videoUrl = saveName;

            this.ManageContent.findOneAndUpdate({ _id: contentDetails._id }, contentDetails.contents, { upsert: true, new: true, setDefaultsOnInsert: true })
                .then(this.addOrUpdateCallback.bind(this, res))
                .catch(this.handleError.bind(this, res));
        }
    }

    uploadPhotoCallback(res, data) {
        this.send(res, 200, "", data);
    }

    getContentDetails(req, res) {
        var typeId = req.query.type;

        this.ManageContent.findOne({ "type": Number(typeId) })
            .then(this.getContentDetailsCallback.bind(this, res))
            .catch(this.handleError.bind(this, res));
    }

    getContentDetailsCallback(res, contentDetails) {
        if (contentDetails)
            this.send(res, 200, 'Content details found', contentDetails);
        else
            this.send(res, 404, "No content details found", null);
    }

    generateRandomImageName(chars) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

        for (var i = 0; i < 16; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        var datetime = new Date()
        return text + datetime.getTime();
    }

}

module.exports = manageContentController;
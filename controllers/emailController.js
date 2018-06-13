var jwtService = require('../services/jwt');
var adminJwtService = require('../services/adminJwt');
var businessUserJwtService = require('../services/businessUserJwt');
var _ = require('lodash');
var nodemailer = require('nodemailer');
var fs = require('fs');
var path = require('path');
var Q = require('q');
var TokenTypes = require('../enum/tokenType');
var appConfig = require('../config/appconfig');


//Model
var settings = require('../models/settings');

class EmailController {
    constructor(siteUrl) {
        this.siteUrl = siteUrl;
        this.settings = settings;
    }

    getHtmlTemplate(templatePath, templateData) {
        try {
            var html = fs.readFileSync(templatePath, 'utf8');
            var compiled = _.template(html);
            return compiled(templateData);
        } catch (error) {

        }

    }

    sendVerification(traveller) {
        try {
            var deferred = Q.defer();
            //creating token
            var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
            jwtService.createToken(traveller, TokenTypes.EmailVerification, expiryCondition)
                .then(this.prepareVerificationTemplate.bind(this, traveller))
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(traveller);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
            return deferred.promise;
        } catch (error) {

        }
    }

    prepareVerificationTemplate(traveller, jwtToken) {
        try {
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/verification.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                userName: traveller.fullName,
                verifyUrl: appConfig.appKeys.travellerUrl + '/home?route=token&token=' + jwtToken
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: traveller.emailId,
                subject: 'Welcome to WooTravel: Email Verification'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    sendAttractionListToTravelers(responseData) {
        var deferred = Q.defer();
        var _this = this;
        var templatePath = path.join(__dirname, '../templates/Email/sendAttractionListToTravelersEmail.html');

        responseData.forEach(function (indData) {
            var t = '';
            t += '<ul>';
            indData.attractionName.forEach(function (indAttracton) {
                t += '<li style="font-family:Arial, Helvetica, sans-serif; color:#898888; font-size:14px; font-weight:normal; margin:0 0 15px 0; padding:0;">' + indAttracton + '</li>';
            });
            t += '</ul>';

            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": t,
                "travelerName": indData.fullName,
            };

            var template = _this.getHtmlTemplate(templatePath, templateData);
            deferred.resolve(_this.sendMail({
                html: template,
                to: indData.emailId,
                subject: 'Attraction Availability Status Update.'
            }));
        });

        return deferred.promise;
    }

    businessUserDeleteNotify(mailObj) {
        var deferred = Q.defer();
        var templatePath = path.join(__dirname, '../templates/Email/businessUserDeleteNotifyMail.html');
        var templateData = {
            'imageLogo': appConfig.appKeys.logoImageUrl,
            "businessUserEmail": mailObj.businessUserEmail,
            "userName": mailObj.businessUserName
        };

        var template = this.getHtmlTemplate(templatePath, templateData);
        deferred.resolve(this.sendMail({
            html: template,
            to: mailObj.businessUserEmail,
            subject: 'Your WooTravel Account Has Been Closed.'
        }));
        return deferred.promise;
    }

    sendAttractionDetailsUpdated(businessUser, attractionDetails) {
        var deferred = Q.defer();
        var templatePath = path.join(__dirname, '../templates/Email/updateAttractionEmailNotify.html');
        var templateData = {
            'imageLogo': appConfig.appKeys.logoImageUrl,
            "attractionName": attractionDetails._doc.attractionName
        };

        var template = this.getHtmlTemplate(templatePath, templateData);
        deferred.resolve(this.sendMail({
            html: template,
            to: businessUser._doc.emailId,
            subject: 'Attraction Details Updated'
        }));
        return deferred.promise;
    }

    sendEmailUpdatedVerification(traveller, oldEmailId) {
        try {
            var deferred = Q.defer();
            this.prepareEmailUpdatedVerificationTemplate(traveller, oldEmailId)
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(traveller);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            this.sendVerification(traveller);

            return deferred.promise;
        } catch (error) {

        }
    }

    prepareEmailUpdatedVerificationTemplate(traveller, oldEmailId) {
        try {
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/emailChangeRequest.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "oldEmailId": oldEmailId,
                "newEmailId": traveller.emailId,
                "user": traveller.fullName,
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: oldEmailId,
                subject: 'Email change Requested'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    sendResetPasswordLink(traveller) {
        try {
            var deferred = Q.defer();
            //creating token
            var expiryCondition = new Date(Date.now() + 1 * 60 * 60 * 1000);
            //var expiryCondition = new Date(Date.now() + 0.03 * 60 * 60 * 1000);
            jwtService.createToken(traveller, TokenTypes.resetPasswordVerification, expiryCondition)
                .then(this.prepareSendResetPasswordLinkTemplate.bind(this, traveller))
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(traveller);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
            return deferred.promise;
        } catch (error) {

        }
    }

    prepareSendResetPasswordLinkTemplate(traveller, jwtToken) {
        try {
            var deferred = Q.defer();
            var date = new Date();
            var templatePath = path.join(__dirname, '../templates/Email/resetPassword.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                //verifyUrl: appConfig.appKeys.travellerUrl + '/traveller/resetPassword?token=' + jwtToken,
                verifyUrl: appConfig.appKeys.travellerUrl + '/home?route=forgetpasswordtoken&token=' + jwtToken,
                user: "Traveller"
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: traveller.emailId,
                subject: 'Recover access to your WooTravel account'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    sendAdminResetPasswordLink(admin) {
        try {
            var deferred = Q.defer();
            //creating token
            var expiryCondition = new Date(Date.now() + 1 * 60 * 60 * 1000);
            adminJwtService.createToken(admin, TokenTypes.resetPasswordVerification, expiryCondition)
                .then(this.prepareAdminSendResetPasswordLinkTemplate.bind(this, admin))
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(admin);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
            return deferred.promise;
        } catch (error) {

        }
    }

    prepareAdminSendResetPasswordLinkTemplate(admin, jwtToken) {
        try {
            var deferred = Q.defer();
            var date = new Date();
            var templatePath = path.join(__dirname, '../templates/Email/resetPassword.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                verifyUrl: appConfig.appKeys.adminUrl + '/home?route=forgetpasswordtoken&token=' + jwtToken,
                user: "User"
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: admin.emailId,
                subject: 'Recover access to your WooTravel account'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    prepareAdminUserVerificationTemplate(adminUser) {
        try {
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/adminUserVerification.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                username: adminUser.emailId,
                password: adminUser.tempPassword,
                adminSiteUrl: appConfig.appKeys.adminUrl
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            this.sendMail({
                html: template,
                to: adminUser.emailId,
                subject: 'Welcome to WooTravel'
            });
        } catch (error) {

        }
    }

    sendBusinessUserVerification(businessUser) {
        try {
            var deferred = Q.defer();
            //creating token
            var expiryCondition = new Date(Date.now() + 24 * 60 * 60 * 1000);
            businessUserJwtService.createToken(businessUser, TokenTypes.EmailVerification, expiryCondition)
                .then(this.prepareBusinessUserVerificationTemplate.bind(this, businessUser))
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(businessUser);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
            return deferred.promise;
        } catch (error) {

        }
    }

    prepareBusinessUserVerificationTemplate(businessUser, jwtToken) {
        try {
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/businessUserVerification.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                verifyUrl: appConfig.appKeys.businessUserUrl + '/home?route=token&token=' + jwtToken,
                userName: "Business User"
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: businessUser.emailId,
                subject: 'WooTravel: Email Verification'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    sendBusinessUserResetPasswordLink(businessUser) {
        try {
            var deferred = Q.defer();
            //creating token
            var expiryCondition = new Date(Date.now() + 1 * 60 * 60 * 1000);
            businessUserJwtService.createToken(businessUser, TokenTypes.resetPasswordVerification, expiryCondition)
                .then(this.prepareBusinessUserSendResetPasswordLinkTemplate.bind(this, businessUser))
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(businessUser);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
            return deferred.promise;
        } catch (error) {

        }
    }

    prepareBusinessUserSendResetPasswordLinkTemplate(businessUser, jwtToken) {
        try {
            var deferred = Q.defer();
            var date = new Date();
            var templatePath = path.join(__dirname, '../templates/Email/resetPassword.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                verifyUrl: appConfig.appKeys.businessUserUrl + '/home?route=forgotpasswordtoken&token=' + jwtToken,
                user: "Business User"
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: businessUser.emailId,
                subject: 'Recover access to your WooTravel Business account'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    sendBusinessUserApproveReject(businessUser, reason) {
        try {
            var subject = "";
            if (businessUser.status == 1) {
                subject = 'Welcome to WooTravel';
                this.sendBusinessUserVerification(businessUser);
            } else if (businessUser.status == 2) {
                subject = 'Welcome to WooTravel'
                var templatePath = path.join(__dirname, '../templates/Email/businessUserApprove.html');
                var templateData = { 'imageLogo': appConfig.appKeys.logoImageUrl, };
            } else if (businessUser.status == 3) {
                subject = 'Registration Rejected by WooTravel';
                var templatePath = path.join(__dirname, '../templates/Email/businessUserReject.html');
                var templateData = {
                    'imageLogo': appConfig.appKeys.logoImageUrl,
                    "reason": reason,
                    //"url": appConfig.appKeys.businessUserUrl + '/signup/' + businessUser._id,
                    "url": appConfig.appKeys.businessUserUrl + '/home?route=signup&id=' + businessUser._id,
                };
            }

            var template = this.getHtmlTemplate(templatePath, templateData);

            this.sendMail({
                html: template,
                to: businessUser.emailId,
                subject: subject
            });
        } catch (error) {

        }
    }

    sendAttractionApproveReject(attractionDetails, reason) {
        try {
            if (attractionDetails.attrTransactionDetail.associationStatus == 2) {
                var templatePath = path.join(__dirname, '../templates/Email/attractionApprove.html');

            } else if (attractionDetails.attrTransactionDetail.associationStatus == 3) {
                var templatePath = path.join(__dirname, '../templates/Email/attractionReject.html');
            }


            var m_names = new Array("Jan", "Feb", "Mar",
                "Apr", "May", "Jun", "Jul", "Aug", "Sep",
                "Oct", "Nov", "Dec");

            var d = new Date(attractionDetails.last_updated);
            var curr_date = d.getDate();
            var curr_month = d.getMonth();
            var curr_year = d.getFullYear();
            // var hh = d.getHours();
            // var mm = d.getMinutes();

            var hours = d.getHours();
            var minutes = d.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            hours = hours < 10 ? '0' + hours : hours;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;

            // var s = d.getSeconds();
            // var date = curr_date + ", " + m_names[curr_month] + " " + curr_year + "-" + hh + ":" + mm;
            var date = curr_date + ", " + m_names[curr_month] + " " + curr_year + " - " + strTime;


            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "reason": reason,
                "user": attractionDetails.attrTransactionDetail.businessUser[0].contactPersonName,
                "attractionName": attractionDetails.attractionName,
                // "createdDate": new Date(attractionDetails.date_created)
                "createdDate": date
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            this.sendMail({
                html: template,
                to: attractionDetails.attrTransactionDetail.businessUser[0].emailId,
                subject: (reason === "") ? "Attraction Association Request-Approved" : "Attraction Association Request-Not Approved"
            });
        } catch (error) {

        }
    }

    sendUpdateAttractionEmail(attractionTransactionsDetails, businessUser, attractionDetails) {
        try {
            var templatePath = path.join(__dirname, '../templates/Email/updateAttractionEmailNotify.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": attractionDetails.attractionName,
            };

            var template = this.getHtmlTemplate(templatePath, templateData);

            this.sendMail({
                html: template,
                to: businessUser[0].emailId,
                subject: 'Attraction Details Updated'
            });
        } catch (error) {

        }
    }

    updateAttractionEmailToBusinessUser(object) {
        // var deferred = Q.defer();
        var templatePath = path.join(__dirname, '../templates/Email/updateAttractionEmailToBusinessUser.html');
        var templateData = {
            'imageLogo': appConfig.appKeys.logoImageUrl,
            "attractionName": object.attractionName,
            "userName": object.businessUserName,
        };

        var template = this.getHtmlTemplate(templatePath, templateData);

        this.sendMail({
            html: template,
            to: object.email,
            subject: 'Attraction Details Updated'
        });

        // return deferred.promise;
    }

    updateAttractionEmailToTraveller(attractionTransactionsDetails, tempArray, attractionDetails) {
        // try {
        var deferred = Q.defer();
        var templatePath = path.join(__dirname, '../templates/Email/updateAttractionEmailToTraveller.html');


        var that = this;
        tempArray.forEach(function (to, i, array) {

            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": attractionDetails.attractionName,
                "travelerName": to.travelerName
            };

            var template = that.getHtmlTemplate(templatePath, templateData);

            that.sendMail({
                html: template,
                to: to.email,
                // to: tempArray.toString(),
                subject: 'Attraction in your Itinerary has changed'
            });
            if (i === (tempArray.length - 1)) {
                deferred.resolve();
            }
        });

        return deferred.promise;
        // } catch (error) {

        // }
    }

    reportOnAttractionMailToAdmin(emails, data) {
        try {
            var templatePath = path.join(__dirname, '../templates/Email/reportAdmin.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": data.attractionName,
                "businessUser": data.businessUser,
                "reason": data.reason
            };

            var template = this.getHtmlTemplate(templatePath, templateData);
            var that = this;
            // this.sendMail({
            //     html: template,
            //     to: emails.toString(),
            //     subject: 'Issue reported for-' + data.attractionName
            // });

            emails.forEach(function (to, i, array) {
                that.sendMail({
                    html: template,
                    to: to,
                    subject: 'Issue reported for-' + data.attractionName
                });
                if (i === (emails.length - 1)) {
                    deferred.resolve();
                }
            });
        } catch (error) {

        }
    }

    reportOnAttractionMailToUser(emails, data) {
        try {
            var templatePath = path.join(__dirname, '../templates/Email/reportUser.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": data.attractionName,
                "businessUser": data.businessUser,
                "reason": data.reason
            };

            var template = this.getHtmlTemplate(templatePath, templateData);

            this.sendMail({
                html: template,
                to: data.businessUserEmailId,
                subject: 'Issue reported for-' + data.attractionName
            });
        } catch (error) {

        }
    }

    sendMailForAssociationReqEmail(emails, data) {
        try {
            var templatePath = path.join(__dirname, '../templates/Email/AssociateReqAdmin.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": data.attractionName,
                "businessUser": data.businessUser,
                "businessUserId": data.businessUserId
            };

            var template = this.getHtmlTemplate(templatePath, templateData);
            var that = this;

            this.settings.find({})
                .then(function (response) {
                    that.sendMail({
                        html: template,
                        to: response[0].associationRequestNotification,
                        subject: 'Attraction Association Request-' + data.businessUserId + '-' + data.businessUser
                    });
                })

            // emails.forEach(function(to, i, array) {
            //     that.sendMail({
            //         html: template,
            //         to: to,
            //         subject: 'Attraction Association Request-' + data.businessUserId + '-' + data.businessUser
            //     });
            //     if (i === (emails.length - 1)) {
            //         deferred.resolve();
            //     }
            // });
        } catch (error) {

        }
    }

    sendMailForBusinessUserForConfirmation(emails, data) {
        try {
            var templatePath = path.join(__dirname, '../templates/Email/businessUserForConfirmatio.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "attractionName": data.attractionName,
                "businessUser": data.businessUser
            };

            var template = this.getHtmlTemplate(templatePath, templateData);

            this.sendMail({
                html: template,
                to: data.businessUseremailId,
                subject: 'Attraction Association Request-Submitted'
            });
        } catch (error) {

        }
    }

    sendBusinessUserEmailUpdatedVerification(businessUser, oldEmailId) {
        try {
            var deferred = Q.defer();
            this.prepareBusinessUserEmailUpdatedVerificationTemplate(businessUser, oldEmailId)
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(businessUser);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            this.sendBusinessUserVerification(businessUser);

            return deferred.promise;
        } catch (error) {

        }
    }

    prepareBusinessUserEmailUpdatedVerificationTemplate(businessUser, oldEmailId) {
        try {
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/emailChangeRequest.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                "oldEmailId": oldEmailId,
                "newEmailId": businessUser.emailId,
                "user": businessUser.contactPersonName,
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: oldEmailId,
                subject: 'Email change Requested'
            });
            return deferred.promise;
        } catch (error) {

        }
    }


    sendBookingRequestEmailTotraveller(traveller) {
        try {
            var deferred = Q.defer();
            this.prepareBookingRequestEmailTotraveller(traveller)
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(traveller);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            //this.sendBusinessUserVerification(businessUser);

            return deferred.promise;
        } catch (error) {

        }
    }

    sendBookingRequestEmailTobusinesuser(businessUserData) {
        try {
            var deferred = Q.defer();
            this.prepareBookingRequestEmailTobusinessuser(businessUserData)
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(businessUserData);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            //this.sendBusinessUserVerification(businessUser);

            return deferred.promise;
        } catch (error) {

        }
    }
    sendBookingRequestEmailToAdminUser(adminData) {
        try {
            var deferred = Q.defer();
            this.prepareBookingRequestEmailToadminuser(adminData)
                .then(this.sendMail.bind(this))
                .then(function () {
                    deferred.resolve(adminData);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            //this.sendBusinessUserVerification(businessUser);

            return deferred.promise;
        } catch (error) {

        }
    }
    /**Send booking request email to traveller */
    prepareBookingRequestEmailTotraveller(traveller) {
        try {
            var travellerEmail = traveller.travelerEmail;
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/bookingRequestTraveller.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                'bookingDetail': traveller.bookingDetail
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: travellerEmail,
                subject: 'Booking Request Raised'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    /**Send booking request email to business user */
    prepareBookingRequestEmailTobusinessuser(businessUserData) {
        try {
            var businessUserEmail = businessUserData.businessUserEmail;
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/bookingRequestBusinesUser.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                'bookingDetail': businessUserData.bookingDetail,
                'businessUserName': businessUserData.businessUserName
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: businessUserEmail,
                subject: 'Booking Request Received'
            });
            return deferred.promise;
        } catch (error) {

        }
    }
    /**Send booking request email to admin user */
    prepareBookingRequestEmailToadminuser(adminData) {
        try {
            var adminEmailId = adminData.adminEmailId;
            var deferred = Q.defer();
            var templatePath = path.join(__dirname, '../templates/Email/bookingRequestAdminUser.html');
            var templateData = {
                'imageLogo': appConfig.appKeys.logoImageUrl,
                'bookingDetail': adminData.bookingDetail,
            };
            var template = this.getHtmlTemplate(templatePath, templateData);

            deferred.resolve({
                html: template,
                to: adminEmailId,
                subject: 'Booking Request Received'
            });
            return deferred.promise;
        } catch (error) {

        }
    }

    sendMail(mailOptions) {
        try {
            var deferred = Q.defer();
            var smtpConfig = {
                service: 'Gmail',
                auth: {
                    user: 'rspl.test10@gmail.com', // Your email id
                    pass: 'rspl123#' // Your password
                }
            };
            var transporter = nodemailer.createTransport(smtpConfig);
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(info);
                }
            });
            return deferred.promise;
        } catch (error) {

        }
    }
}

module.exports = EmailController;
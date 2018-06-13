var error = {
    'InvalidEmailId': 'Sorry, we don\'t recognize that email address',
    'InvalidUser': 'Invalid credentials are entered',
    "NewAccount": "Thank you for registering with WooTravel.  We have sent a verification link to your email address.",
    "NewSocialAccount": "Account created",
    'AuthSuccess': 'Authenticated successfully',
    'InvalidToken': 'Invalid token',
    'LogoutSuccess': 'Logout successfully',
    'NotAuthorized': 'Not authorized',
    'EmailAlreadyVerified': 'Email id already verified',
    'BusinessUserEmailVerificationTokenExpired': 'The Link you are trying to verify your account is already expired. please raise a request for a new verification link',
    'resetPasswrodLinkExpired': 'The reset password link you clicked has expired. Please request a new one.',
    'EmailVerified': 'Email id verified',
    'VerifyEmail': 'Email Address already registered but not verified',
    'forgotPasswordVerifyEmail': 'Email Address registered but not verified',
    'ValidationError': 'ValidationError',
    'ServerError': 'Server Error: Please try later',
    'ResourceNotFound': 'Requested Resource Not Found',
    'oldPasswordMatch': 'Current Password does not match',
    'oldNewPasswordMatch': 'Current Password and New Password cannot be same',
    'dateRangeForAttractionDetail': 'Bad Request reg. Start Date and End Date',
    'tokenExpired': 'This verification link has expired',
    'tokenAlreadyExpired': 'The Link you are trying to verify your account is already expired. please raise a request for a new verification link',
    'loginError': 'Invalid credentials are entered',
    'signupRejcted': "Kindly update the registration details and re-submit your registration request",
    'approvalWaiting': "Waiting for the approval",
    'resetPasswordMail': 'Reset Password request email sent.',
    'emailAlreadyExist': 'This email address is already registered',
    'travellerExist': 'The email address with you are trying to register which is already associated with some another traveler account'
};


var bookingStatus = {
    "Active": 1,
    "In Progress": 2,
    "Resolved": 3,
    "Invalid": 4,
    "Lost": 5
};
var type = {
    "userType1": "Wootraveller",
    "userType2": "Admin",
    "userType3": "Business"
};

module.exports = { error, type, bookingStatus };
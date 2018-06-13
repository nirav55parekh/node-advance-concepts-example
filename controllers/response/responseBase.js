	var Messages = require('../../enum/wootravelEnum');
	class Response {
	    constructor() {
	        this.succeeded = false;
	        this.message = '';
	        this.data = '';
	    }
	}
	class ResponseBase {

	    constructor() {
	        this.response = new Response();
	    }

	    /**
	     * Sends Express response with provided status,message and data
	     */
	    send(res, status, message, data) {
	            this.response.succeeded = (status >= 200 && status < 300);
	            this.response.message = message;
	            this.response.data = data;
	            res.set({
	                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
	                'Expires': '-1',
	                'Pragma': 'no-cache'
	            });
	            res.status(status).json(this.response);
	        }
	        /**
	         * Sends Express Response with 500 Server error and err detail as data.
	         */
	    sendServerError(res, err) {
	            this.send(res, 500, Messages.error.ServerError, err);
	        }
	        /**
	         * Sends exress response with 404(status) not found(msg).
	         */
	    sendNotFound(res) {
	            this.send(res, 404, Messages.error.ResourceNotFound, null);
	        }
	        /**
	         * Sends exress response with 401(status) not authorized(msg).
	         */
	    sendNotAuthorized(res) {
	            this.send(res, 401, Messages.error.NotAuthorized, null);
	        }
	        /**
	         * Sends exress response with 400(status) Bad Request(msg).
	         */
	    sendBadRequest(res, err) {
	        this.send(res, 400, err, null);
	    }
	}

	module.exports = ResponseBase;
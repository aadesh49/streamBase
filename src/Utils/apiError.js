//apiError is a function that helps us to return error to the user when required
class apiError extends Error{
    constructor(
        statusCode,
        message = 'Something went wrong',
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default apiError;
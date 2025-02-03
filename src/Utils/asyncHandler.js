//asyncHandler is returning another fn and acts as an wrapper fn
const asyncHandler = (requestHandler) => {         
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).    //when promise is resolved call next function
        catch((e) => next(e))                               //pass the error if any
    }   
}

export default asyncHandler
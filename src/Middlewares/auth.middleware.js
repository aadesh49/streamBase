import asyncHandler from '../Utils/asyncHandler.js'
import apiError from '../Utils/apiError.js'
import { User } from '../Models/user.model.js'
import jwt from 'jsonwebtoken'

//verify user is loggedIn or not, using tokens
export const verifyJWT = asyncHandler(async (req, res, next) => {
    //check if cookie has accessToken, else check header and in Authorization replace bearer to empty string to get only token
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new apiError(401, 'Unauthorized request')
        }

        const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(verified?._id).select(              //we have provided _id in schema where we generated access token
            "-password -refreshToken"
        )

        if (!user) {
            throw new apiError(401, 'Invalid Access Token')
        }

        req.user = user;
        next();                                         //go to next method

    } catch (error) {
        throw new apiError(401, "Invalid Access Token")
    }
}) 
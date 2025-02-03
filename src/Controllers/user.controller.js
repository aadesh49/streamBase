import asyncHandler from '../Utils/asyncHandler.js'
import apiError from '../Utils/apiError.js'
import { User } from '../Models/user.model.js'
import uploadOnCloudinary from '../Utils/cloudinary.js'
import apiResponse from '../Utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

//Method to generate access and refresh token by just giving id of user
const generateAccessAndRefreshToken = async (userId) => {           //only async because we are just implementing this internally (no web req) 
    try {
        const user = await User.findById(userId);                   //await because we are working with DB
        const accessToken = user.generateAccessToken()              //generate tokens
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;                           //save new token in the user object
        await user.save({ validateBeforeSave: false })               //now save in the DB without validating anything, as we are just sending refresh token not password

        return { accessToken, refreshToken };
    } catch (error) {
        throw new apiError(500, 'Something went wrong')             //if we were not able to generate things properly
    }
}

//Controller to register user in the DB
const registerUser = asyncHandler(async (req, res) => {        //this is an async fn inside a fn
    /*Example of basic controller
       res.status(200).json({                                   it will send status code as 200 in response 
        message: "OK",                                          some json formatted data to be sent
        name: "Lodu",
    }) */

    //First get details of user from frontend
    //Validation of data(data should be as userSchema)
    //check if user already exists and still create an account(using username, email)
    //check for images and avatar(required)
    //upload images to cloudinary
    //create user Object and then create entry in DB 
    //remove password and refresh token field from response
    //check for user creation(T/F)

    const { username, email, fullName, password } = req.body          //take data from frontend 

    if ([fullName, username, email, password].some((field) =>        //.some() will give us a callback, where we will trim each field and check if they are empty or not
        (field?.trim() === ""))
    ) {
        throw new apiError(400, 'All fields are required');         //if anything is empty throw error because they all are required fields
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]              //array of objects that will be checked if user is present or not using logical OR operator
    })

    if (existedUser) {                                        //if object is there it means findOne method got an user return error
        throw new apiError(409, 'User already exists')
    }

    // console.log(req.files);                          This will give us all files that are uploaded by the user and each file will have their own object which will contain some basic info about the file
    const avatarLocalPath = req.files?.avatar[0]?.path;             //getting path of avatar using optinal channing


    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {      //to check if coverimage is present or not as it is not required field
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new apiError(400, 'avatar file is required');         //as avatar is required field throw error if not present
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)            //await is used to wait until image is uploaded 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)    //here we are not checking if coverimage is present or not becuase cloudinary does this internally(empty string)

    if (!avatar) {
        throw new apiError(400, 'avatar file is required');             //again check if file is uploaded properly on cloudinary or not 
    }

    const user = await User.create({                                    //creating user object in MongoDB
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password: password,
        username: username.toLowerCase()
    })

    const userCreated = await User.findById(user._id).select(           //this will take details of user but 
        "-password -refreshToken"                                       //the key with (-) symbol will not be selected
    )

    if (!userCreated) {                                                     //if user is not created 
        throw new apiError(501, 'Something went wrong while registration')
    }

    return res.status(201)
        .json(                                        //if user is created return it with a json data
            new apiResponse(200, userCreated, 'User registered successfully')       //apiResponse takes statusCode, data and a message
        )
})

//Controller to login user on the app
const loginUser = asyncHandler(async (req, res) => {

    //take username, password from the user
    //if user with that username or email exists, else return no user found 
    //check the password and allow him to login, else return wrong password
    //generate refresh and access tokens
    //send tokens to user through cookies
    //match refresh token, if same, provide them with new access token to login

    const { email, username, password } = req.body                    //destructure email, username, password (if any one field is not present that means user hasn't send that data)

    if (!email && !username) {                              //this will throw error when both fields are empty, we need atleast one to check user
        throw new apiError(400, 'username or email is required')
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]          //based on both fields find an user
    })

    if (!user) {                                                  //if user is not present throw error
        throw new apiError(404, 'User is not defined');
    }

    let isValid = await user.isPasswordCorrect(password);           //check if password is correct or not

    if (!isValid) {
        throw new apiError(401, 'Password incorrect');              //throw err if incorrect
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);      //generate tokens

    const loggedUser = await User.findById(user._id)
        .select(                                                    //to get updated user object from DB as we added tokens
            "-password -refreshToken"                                   //also to exclude them 
        )

    const options = {           //this are options that will protect our cookies from being altered
        httpOnly: true,
        secure: true
    }

    return res.status(200)                              //returning status code
        .cookie('accessToken', accessToken, options)        //and cookies
        .cookie('refreshToken', refreshToken, options)
        .json(                                              //at last a json response
            new apiResponse(200,                            //method which takes statusCode, data and message
                {
                    accessToken, refreshToken, loggedUser         //send user data
                },
                "User Logged In Successfully"
            )
        )
})

//Controller to logout user from the app
const logoutUser = asyncHandler(async (req, res) => {

    //Before this method a middleware was called, it verified the user and took user data from cookies
    await User.findOneAndUpdate(req.user._id,               //this method do a DB call and check for given ID, and then update some fields
        {
            $unset: { refreshToken: 1 }                //unset is DB operator to remove values from document (delete refreshToken)
        },
        {
            new: true                                      //pass updated user data 
        }
    )
    const options = {           //this are options that will protect our cookies from being altered
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)                        //clear both the cookies 
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User Logged Out"));         //and give the response to the user
})

//Controller to refresh access token
const refrehAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;            //refresh token sent by user

    if (!incomingRefreshToken) {                              //if token is not present
        throw new apiError(401, "Unauthorized Request")
    }

    const verified = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);        //it is an decoded token which is verified by jwt

    const user = await User.findById(verified?._id)             //get the user object

    if (!user) {
        throw new apiError(401, 'Invalid Refresh Token')        //if user is not present throw error
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new apiError(401, "Refresh Token is expired or used");        //when token doesn't match
    }

    const options = {           //this are options that will protect our cookies from being altered
        httpOnly: true,
        secure: true
    }

    const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);        //get new tokens

    return res.status(200)
        .cookie('accessToken', options)             //send cookies directly as name of old and new token is same
        .cookie('refreshToken', options)
        .json(
            new apiResponse(200, { newAccessToken, newRefreshToken }, "Access Token refreshed successfully")
        )
})

//Controller to change the old password to new one
const changePassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body                     //data from frontend

    const user = await User.findById(req.user._id)                   //user is logged in so we can get the user object

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);     //if password provided from frontend is same as the password present in DB

    if (!isPasswordCorrect) {
        throw new apiError(400, "Invalid Password")                 //when passsword is incorrect
    }

    user.password = newPassword;                                    //change the password
    user.save({ validateBeforeSave: false });                         //save it so the password field can be updated

    return res.status(200)
        .json(new apiResponse(200, {}, "Password Changed"))         //return success msg
})

//Controller to get the active user object
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(200, req.user, "Current User fetched ")
})

//Controller to update data fields other than password and files
const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body

    if (!fullName && !email) {
        throw new apiError(400, "All fields are required")          //if details are not sent
    }

    const user = await User.findByIdAndUpdate(req.user?._id,                 //find by id and update
        {
            $set: { fullName: fullName , email: email }                 //change with new credentials
        },
        { new: true }                                //return new user after changes
    ).select("-password")                           //don't return password field

    return res.status(200)
        .json(new apiResponse(200, user, "Details Updated successfully"))       //return success msg
})

//Controller to update user avatar file
const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;                 //take file from user 

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar not found")         //throw err if no avatar found
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)    //upload on cloudinary 

    if (!avatar.url) {
        throw new apiError(400, "Error while uploading avatar")     //throw err if url not present
    }
    const user = await User.findByIdAndUpdate(req.user._id,
        {                                                           //find the user by id and then upadate avatar url value
            $set: { avatar: avatar.url }
        },
        { new: true }                                            //pass updated value of user
    ).select("-password")                                       //remove password field from the user obj

    return res.status(200)
        .json(new apiResponse(200), user, "Avatar updated successfully")        //return success response with user obj
})

//Controller to update cover image file (same as updateUserAvatar())
const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;                 //file bacause we are taking only one file

    if (!coverImageLocalPath) {
        throw new apiError(400, "cover image not found")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new apiError(400, "Error while uploading the cover image")
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: { coverImage: coverImage.url }
    },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new apiResponse(200), user, "Cover Image updated successfully")
})

//Controller to fetch user information 
const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {                          //if username is not present throw err, else trim it down
        throw apiError(401, "Username missing");
    }

    //Aggregation pileline to count user's subscribers and subscription
    const channel = await User.aggregate([
        {
            $match: {                                       //first match the user using username field
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {                                      //get all the documents from subscription where channel matches(count subscriber)
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"                           //we can use subscibers as an operator in next pipelines
            }
        },
        {
            $lookup: {                                      //get all the documents from subscription where subscriber matches(count subscription or subscribed to)
                from: "subscriptions",
                localField: "_id",
                foreignField: "subsciber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {                                   //adding some fields in user object
                subscribersCount: {
                    $size: "$subscribers"                   //count of subscriber
                },
                subscribedToCount: {
                    $size: "$subscribedTo"                  //count of subscription
                },
                isSubscribed: {                             //(T/F) to check current channel is subscibed or not
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },      //$in is used to check if first parameter is present in second parameter or not 
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])
    if (!channel?.length) {                                       //if channel is null or empty
        throw new apiError(400, "Channel does not exists")
    }
    console.log(channel);

    return res.status(200)
        .json(new apiResponse(200, channel[0], "User's channel information fetched successfully"))
})

//Controller to fetch watch history of the user
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)          //create mongooseId so that id can be matched
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHisory",
                foreignField: "_id",
                as: "watchHisory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
    ])
    return res.status(200)
        .json(new apiResponse(200, user[0].watchHisory, "Watch history fetched successfully"))
})

//export controllers that are used in different files
export { registerUser, loginUser, logoutUser, refrehAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserProfile, getWatchHistory }
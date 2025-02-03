import { Router } from "express";
import {logoutUser, registerUser, loginUser, refrehAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserProfile, getWatchHistory} from '../Controllers/user.controller.js'
import {upload} from '../Middlewares/multer.middleware.js'
import { verifyJWT } from "../Middlewares/auth.middleware.js";

const router = Router()                                 //create router variable form router object to create routes 

router.route("/register").post(                         //this url localhost:8000/api/v1/users/register will run the middleware first and then call registerUser function on post request
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT, logoutUser);            //verifyJwt is a middleware 

router.route("/refresh-token").post(refrehAccessToken);          //no need for verifyJwt because refreshAccessToken is taking care of encoded and decoded tokens

router.route("/change-password").post(verifyJWT, changePassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJWT, getUserProfile);

router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
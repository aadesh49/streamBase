import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUDNAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//this function helps us to upload files on cloudinary 
const uploadOnCloudinary = async (localFilePath) => {

    // Upload an image
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload
            (localFilePath, {
                resource_type: "auto"
            })
        // console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)                                    //remove after uploading successfully
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);           //remove the locally saved temp file as the upload operation failed
        return null;
    };
}
    
export default uploadOnCloudinary;
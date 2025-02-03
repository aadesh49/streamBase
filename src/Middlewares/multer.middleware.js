import multer from 'multer'

//we will use multer to keep the file in our disk storage untill we add the file on cloudinary
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/temp')                      //destination where the file will stay temporarily         
    },
    filename: (req, file, cb) =>  {
        cb(null, file.originalname)                   //name of that file
    }
})

export const upload = multer({ storage })
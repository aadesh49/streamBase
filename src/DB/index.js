import mongoose from "mongoose";
import { DB_NAME } from '../constants.js';

const connectDB = async() => {              
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);         // to wait for connection before moving furthur
        console.log(`MongoDB Connected !! DB : HOST: ${connectionInstance.connection.host}`);
    }catch(e){
        console.log("MongoDB Connection Failed",e);             //we write some statement so that whenever error occurs we can see our statement with the error.
        process.exit(1);
    }
}

export default connectDB;
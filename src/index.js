import 'dotenv/config'                              
import connectDB from "./DB/index.js";
import app from './app.js'

connectDB()                                             //calling function to connect DB
.then(() => {                                           //it will return us a promise as connectDB is a async function
    app.listen(process.env.PORT || 8000, () => {        //if port variable is not found use 8000
        console.log(`Server running on Port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("Connection Failed", err);
})
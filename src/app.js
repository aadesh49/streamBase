import express, { urlencoded } from 'express'
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express()

app.use(cors({                              //we can/cannot initialize the object after defining cors
    origin: process.env.CORS_URL,
    credentials: true,
}))

app.use(express.json({limit: '20kb'}))      //data taken should be in limit of 16kb
app.use(urlencoded())                       //url that will run the server
app.use(express.static("public"))           //some files that need to be included furthur
app.use(cookieParser())                     //this will help us to send cookies to the user(login) and also to take cookies to the user(logout)


//import routes
import userRouter from './Routes/user.route.js'

//declare route
app.use("/api/v1/users", userRouter)               //this will make our url as localhost:8000/api/v1/users (now userRouter will have furthur powers )


export default app
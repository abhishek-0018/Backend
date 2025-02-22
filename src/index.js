// require('dotenv).config({path:'./env'})
import dotenv from "dotenv"
import connectDb from "./db/index.js";
import {app} from './App.js';
dotenv.config({
    path:'./env'
})

connectDb()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Server is running at port: ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed !!!",err);
})








// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

// import  express  from "express";
// const app=express()
// ;(async()=>{
//     try{
//         await
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERRR: ",error);
//             throw error
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })
//     }catch(error){
//         console.error("Error: ",error)
//         throw err
//     }
// })()
import mongoose from "mongoose";
import { DB_CONFIG } from "../constants.js";

const connectDB = async ()=>{
    try{
    const conn = await mongoose.connect(`${process.env.MONGO_DB}/${DB_CONFIG.DB_Name}?authSource=admin`);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    } 
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB

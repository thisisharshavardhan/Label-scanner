import express from 'express';
import foodRouter from './routes/food.router.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();



app.use(cors({
    origin:process.env.CORS_ORIGIN
}))
app.use(express.json({limit:'160kb'}))
app.use(express.urlencoded({extended:true,limit:'16kb'}))
app.use(express.static('public'))
app.use(cookieParser())

app.use('/api/v1/food',foodRouter)

export default app;

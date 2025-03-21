import { Router } from "express";
import {  processImageLabel } from "../controllers/food.controller.js";


const foodRouter = Router();

foodRouter.route('/upload-label').post(processImageLabel)

export default foodRouter;

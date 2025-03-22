import { Router } from "express";
import {  processImageLabel,uploadIngredientData } from "../controllers/food.controller.js";


const foodRouter = Router();

foodRouter.route('/upload-label').post(processImageLabel)
foodRouter.route('/upload-ingredient').post(uploadIngredientData)

export default foodRouter;

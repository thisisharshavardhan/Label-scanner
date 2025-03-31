import multer from 'multer';
import { computerVisionClient } from '../configs/azure.config.js';
import { Ingredients } from '../models/Ingredients.model.js';
import sharp from 'sharp';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('image');



const processImageLabel = async (req, res) => {
    console.log('image called');
    
    const extractIngredients = (rawText)=> {
        const commonIngredientIndicators = [
            'ingredients:', 
            'contains:', 
            'made with',
            'composed of',
            'ingredients list',
        ];
        const endIndicators = [
            'nutrition facts',
            'allergen information',
            'may contain',
            'manufactured by',
            'best before',
            'packed by',
            'storage instructions',
            'net weight',
            'artificial flavouring',
            'natural flavouring',
            'nature identical'
        ];
        
        const lowerText = rawText.toLowerCase();
        let startIndex = -1;
        let endIndex = rawText.length;
    
        for (const indicator of commonIngredientIndicators) {
            const index = lowerText.indexOf(indicator);
            if (index !== -1) {
                startIndex = index + indicator.length;
                break;
            }
        }1
    
        if (startIndex === -1) return []; 
    
        for (const endIndicator of endIndicators) {
            const index = lowerText.indexOf(endIndicator, startIndex);
            if (index !== -1 && index < endIndex) {
                endIndex = index;
                break;
            }
        }
    
        const ingredientChunk = rawText.substring(startIndex, endIndex).trim();
    
        const cleanedIngredients = ingredientChunk
            .replace(/[\n\r]/g, ' ')         
            .replace(/[*%]/g, '')             
            .replace(/\s+/g, ' ')             
            .split(/,|;/)                     
            .map(item => item.trim())
            .filter(item => item.length > 0);
    
        return cleanedIngredients;
    }


const extractIngredientsInfo = async (ingredients) => {
    try {
        if (!ingredients || ingredients.length === 0) {
            return {
                detailedIngredients: [],
                summary: {
                    totalIngredients: 0,
                    foundIngredients: 0,
                    allergens: [],
                    veganStatus: true,
                    pregnancySafe: true,
                    minAgeRestriction: 0,
                    harmfulIngredients: [],
                    addictiveIngredients: [],
                    notFoundIngredients: []
                }
            };
        }

        // Enhanced cleaning and validation
        const validIngredients = ingredients
            .filter(ing => ing && typeof ing === 'string')
            .map(ing => {
                return ing
                    .trim()
                    .toLowerCase()
                    // Remove E-numbers in parentheses
                    .replace(/\([e\d]+\)/gi, '')
                    // Remove percentages
                    .replace(/\d+(\.\d+)?%/g, '')
                    // Remove parentheses and their contents
                    .replace(/\([^)]*\)/g, '')
                    // Remove special characters except hyphens
                    .replace(/[^a-z\s-]/g, ' ')
                    // Normalize spaces
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .filter(ing => ing.length >= 2);

        // Use more flexible matching with $regex
        const ingredientsInfo = await Ingredients.find({
            $or: validIngredients.map(ing => ({
                name: {
                    $regex: ing,
                    $options: 'i'
                }
            }))
        });

            const summary = {
            totalIngredients: validIngredients.length,
            foundIngredients: ingredientsInfo.length,
            allergens: [],
            veganStatus: true,
            pregnancySafe: true,
            minAgeRestriction: 0,
            harmfulIngredients: [],
            addictiveIngredients: [],
            notFoundIngredients: []
        };

        const foundNames = ingredientsInfo.map(ing => ing.name.toLowerCase());
        

        ingredientsInfo.forEach(ing => {
            if (ing.isAllergen) {
                summary.allergens.push({
                    name: ing.name,
                    allergies: ing.allergies
                });
            }

            if (!ing.isVegan) {
                summary.veganStatus = false;
            }

            if (!ing.isPregnantSafe) {
                summary.pregnancySafe = false;
            }


            summary.minAgeRestriction = Math.max(summary.minAgeRestriction, ing.ageRestriction);

            if (ing.harmLevel >= 2) {
                summary.harmfulIngredients.push({
                    name: ing.name,
                    harmLevel: ing.harmLevel
                });
            }

            if (ing.isAddictive) {
                summary.addictiveIngredients.push(ing.name);
            }
        });

        summary.notFoundIngredients = ingredients.filter(ing => 
            !foundNames.includes(ing.toLowerCase())
        );

        return {
            detailedIngredients: ingredientsInfo,
            summary: summary
        };
    } catch (error) {
        throw new Error(`Error extracting ingredient information: ${error.message}`);
    }
};



    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: 'Error uploading file' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            if (req.file.size > 4 * 1024 * 1024) {
                const compressedBuffer = await sharp(req.file.buffer)
                .resize({ width: 1200 }) // Resize if needed
                .jpeg({ quality: 70 })   // Compress
                .toBuffer();
            
                if (compressedBuffer.length > 4 * 1024 * 1024) {
                return res.status(400).json({ error: 'Compressed image still exceeds 4MB.' });
                }
                else{
                    req.file.buffer = compressedBuffer;
                }
            }


            try {
                const result = await computerVisionClient.readInStream(req.file.buffer);
                const operationId = result.operationLocation.split('/').pop();

                let readResult;
                while (true) {
                    readResult = await computerVisionClient.getReadResult(operationId);
                    if (readResult.status === 'succeeded' || readResult.status === 'failed') break;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                if (readResult.status === 'succeeded') {
                    const extractedText = readResult.analyzeResult.readResults
                        .map(page => page.lines.map(line => line.text).join('\n'))
                        .join('\n');

                        const ingredients = extractIngredients(extractedText);
                        if(ingredients.length === 0){
                            return res.status(400).json({
                                success: false,
                                error: 'No ingredients found in the image'
                            });
                        }
                        const ingredientsAnalysis = await extractIngredientsInfo(ingredients);

                        return res.status(200).json({
                            success: true,
                            ingredients: ingredients || [],
                            analysis: ingredientsAnalysis
                        });
                } else {
                    console.log("fucked up "+error);
                    
                    return res.status(500).json({
                        success: false,
                        error: 'Text extraction failed'
                    });
                }
            } catch (error) {
                console.log("fucked up "+error);
                return res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    } catch (error) {
        console.log("fucked up "+error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
        
    }
};


const uploadIngredientData = async (req, res) => {
    try {
        const ingredientData = {
            name: req.body.name,
            source: req.body.source,
            function: req.body.function,
            description: req.body.description || '',
            isAllergen: req.body.isAllergen || false,
            allergies: req.body.allergies || [],
            isVegan: req.body.isVegan || false,
            isPregnantSafe: req.body.isPregnantSafe || false,
            ageRestriction: req.body.ageRestriction || 0,
            isAddictive: req.body.isAddictive || false,
            harmLevel: req.body.harmLevel || 0,
        };

        const ingredient = new Ingredients(ingredientData);
        await ingredient.save();

        res.status(201).json({
            success: true,
            message: 'Ingredient data uploaded successfully',
            data: ingredient
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to upload ingredient data',
            error: error.message
        });
    }
};

export { uploadIngredientData,processImageLabel };
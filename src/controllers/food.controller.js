import multer from 'multer';
import { computerVisionClient } from '../configs/azure.config.js';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('image');

const extractIngredients = (rawText)=> {
    const commonIngredientIndicators = [
        'ingredients:', 
        'contains:', 
        'made with',
        'composed of',
        'ingredients list',
        '%*-',
        '%* -',
        '% -'
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
    }

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




const processImageLabel = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: 'Error uploading file' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
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

                        return res.status(200).json({
                            success: true,
                            ingredients: ingredients || [],
                        });
                } else {
                    return res.status(500).json({
                        success: false,
                        error: 'Text extraction failed'
                    });
                }
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export { processImageLabel };
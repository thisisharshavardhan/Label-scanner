import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('image');



const processImageLabel = async (req,res)=>{
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded!' });
    }

    
}

export { processImageLabel };
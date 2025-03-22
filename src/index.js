import {} from 'dotenv/config';
import app from './app.js';
import connectDB from './db/index.connectdb.js';

connectDB().then(()=>{
    app.listen(process.env.PORT, () => {
        console.log(`Server is running on http://localhost:${process.env.PORT}`);
    });
})

import {} from 'dotenv/config';
import app from './app.js';

const server = app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

server.on('unhandledRejection', (error, promise) => {
    console.error(`Error: ${error.message}`);
    console.log("Shutting down the server due to Unhandled Promise Rejection");
    
    server.close(() => process.exit(1));
}
);
import mongoose from "mongoose"

let isConnecting = false;
let connectionPromise = null;

const connectionDB = async () => {
    // Return existing connection if already connected
    if (mongoose.connection.readyState === 1) {
        console.log('Database already connected');
        return mongoose.connection;
    }

    // Return pending promise if connection attempt is in progress
    if (isConnecting && connectionPromise) {
        console.log('Connection attempt already in progress, waiting...');
        return connectionPromise;
    }

    isConnecting = true;

    // Create the connection promise
    connectionPromise = (async () => {
        try {

        const conn = await mongoose.connect(process.env.DB_URL, {
            connectTimeoutMS: 60000,        // Increase to 60 seconds
            socketTimeoutMS: 60000,         // Increase socket timeout to 60 seconds
            serverSelectionTimeoutMS: 60000, // Increase server selection timeout
            retryWrites: true,
            maxPoolSize: 10,
            minPoolSize: 5,
            waitQueueTimeoutMS: 10000,
          
        });

            console.log('✅ Database connected successfully');
            console.log(`Connected to MongoDB at: ${conn.connection.host}`);
            isConnecting = false;
            return conn;
        } catch (error) {
            console.error("❌ Mongo connection error:", error.message);
            isConnecting = false;
            connectionPromise = null;

            // Only retry if it's a network error, not an auth error
            if (error.message.includes('authentication failed') || error.message.includes('invalid password')) {
                console.error("Authentication error - check your MongoDB credentials in .env");
                throw error;
            }

            // Retry connection after 5 seconds
            setTimeout(() => {
                connectionDB();
            }, 5000);
            throw error;
        }
    })();

    return connectionPromise;
}

export default connectionDB;
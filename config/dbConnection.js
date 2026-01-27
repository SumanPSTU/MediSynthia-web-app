import mongoose from "mongoose"

let isConnecting = false;

const connectionDB = async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
        console.log('Connection attempt already in progress...');
        return;
    }

    isConnecting = true;

    try {
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log('Database already connected');
            isConnecting = false;
            return;
        }

        const conn = await mongoose.connect(process.env.DB_URL, {
            connectTimeoutMS: 60000,        // Increase to 60 seconds
            socketTimeoutMS: 60000,         // Increase socket timeout to 60 seconds
            serverSelectionTimeoutMS: 60000, // Increase server selection timeout
            retryWrites: true,
            maxPoolSize: 10,
            minPoolSize: 5,
            waitQueueTimeoutMS: 10000,
            family: 4, // Use IPv4 (helps with some connection issues)
        });

        console.log('✅ Database connected successfully');
        console.log(`Connected to MongoDB at: ${conn.connection.host}`);
        isConnecting = false;
        return conn;

    } catch (error) {
        console.error("❌ Mongo connection error:", error.message);
        isConnecting = false;

        // Only retry if it's a network error, not an auth error
        if (error.message.includes('authentication failed') || error.message.includes('invalid password')) {
            console.error("Authentication error - check your MongoDB credentials in .env");
            throw error;
        }

        // Retry connection after 5 seconds
        console.log("Retrying database connection in 5 seconds...");
        setTimeout(() => {
            connectionDB();
        }, 5000);
    }
}

export default connectionDB;
import mongoose from "mongoose";

const connectionDB = async()=>{
    try {
        const conn = await mongoose.connect(process.env.DB_URL, {    
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        throw error;
    } 
}

export default connectionDB;
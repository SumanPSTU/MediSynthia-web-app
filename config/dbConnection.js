import mongoose from "mongoose"
const connectionDB = async ()=>{
    try{
        await mongoose.connect(process.env.DB_URL);
        console.log('database connected');
    }catch(error){
        console.log("Mongo connection",error)
    }
}

export default  connectionDB;
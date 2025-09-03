import express from "express"
import dotenv from "dotenv"
import connectionDB  from "./config/dbConnection.js";
import userRoute from './routes/userRoute.js'
import productRoute from './routes/productRoute.js'
import adminRoute from './routes/adminRoute.js'
import addRoute from './routes/addRoute.js'
import cartRoute from './routes/cartRoute.js'

dotenv.config()
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));
app.use('/user',userRoute);
app.use('/product',productRoute);
app.use('/admin',adminRoute);
app.use('/banneradd',addRoute)
app.use('/order',cartRoute);



app.listen(PORT , ()=>{
    connectionDB();
    console.log(`server is running on port ${PORT}`);
})
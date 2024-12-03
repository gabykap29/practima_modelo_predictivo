import cors from 'cors';
import express from "express";
import morgan from "morgan";
import connectToDatabase from './database/db.js';
import router from "./routes/router.js";

const app = express();

app.use(express.json());
app.use(cors('*'))
app.use(morgan('combined'));

app.use(router);

app.listen(4000, async()=> {
    await connectToDatabase();
    console.log('servidor on');
})

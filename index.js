import express from "express";
import morgan, { format } from "morgan";
import cors from 'cors';
import router from "./routes/router.js";

const app = express();

app.use(express.json());
app.use(cors('*'))
app.use(morgan('combined'));

app.use(router);

app.listen(4000, ()=> {
    console.log('servodidor on');
})

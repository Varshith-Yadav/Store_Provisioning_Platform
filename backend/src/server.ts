import express from "express";
import bodyParser from "body-parser";
import { storesRouter } from "./api/stores";

export const app = express();

app.use(bodyParser.json());
app.use("/stores", storesRouter);

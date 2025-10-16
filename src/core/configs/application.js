import cors from "cors";
import express, { json } from "express";
import corsOptions from "./cors.js";
import router from "./router.js";

const app = express();
app.use(cors(corsOptions));
app.use(json());
app.use("/", router);

export default app;

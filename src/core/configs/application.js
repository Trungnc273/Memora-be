import cors from "cors";
import express, { json } from "express";
import corsOptions from "./cors.js";
import environment from "./environment.js";
import router from "./router.js";

// Create application
const app = express();

// Application configs
app.use(cors(corsOptions));
app.use(json());
app.use("/", router);

// Run application function
const application = () => {
  app.listen(environment.serverPort, () => {
    console.log("Application start successful" + environment.serverPort);
  });
};

export default application;

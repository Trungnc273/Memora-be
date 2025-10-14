import mongoose from "mongoose";
import environment from "./environment.js";

const database = async () => {
  try {
    await mongoose.connect(environment.databaseUrl);
    console.log("Database connect successful");
  } catch (err) {
    console.error("Database connect failed:", err.message);
    process.exit(1);
  }
};

export default database;

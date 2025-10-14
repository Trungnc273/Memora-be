import application from "./core/configs/application.js";
import database from "./core/configs/database.js";

export const server = async () => {
  try {
    await database();
    application();
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
};

export default server;

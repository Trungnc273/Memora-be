import dotenv from "dotenv";

dotenv.config();

function getEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`ENV: missing variable ${key}`);
  return value;
}

const environment = {
  serverPort: getEnv("SERVER_PORT"),
  clientUrl: getEnv("CLIENT_URL"),
  databaseUrl: getEnv("DATABASE_URL"),
  jwtSecret: getEnv("JWT_SECRET"),
};

export default environment;

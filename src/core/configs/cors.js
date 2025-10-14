import environment from "./environment.js";

const corsOptions = {
  origin: environment.clientUrl,
  credentials: true,
};

export default corsOptions;

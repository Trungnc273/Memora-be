import environment from "./environment.js";

const whitelist = [
  environment.clientUrl, // Web App (localhost or deployed)
  null, // Cho phép Expo Mobile app gọi API
];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      console.log("❌ Blocked CORS:", origin);
      callback(new Error("CORS Not allowed"));
    }
  },
  credentials: true,
};

export default corsOptions;

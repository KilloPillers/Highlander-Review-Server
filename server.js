const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { getGoogleOAuthTokens, getGoogleUser } = require('./services/googleservices.js');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const PORT = process.env.PORT || 5050;
const app = express();

app.set('trust proxy', 1) // trust first proxy
// Define the list of allowed origins
const allowedOrigins = [
  'https://highlander.reviews', // Production
  'http://localhost:3000', // Local
];

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // true by default
    sameSite: 'none',
    maxAge: 86400000, // 1 day
    secure: process.env.DOMAIN === 'localhost' ? false : true,
    domain: process.env.DOMAIN,
    path: '/',
  },
  store: MongoStore.create({ mongoUrl: process.env.ATLAS_URI }),
}))
// Configure CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // <-- REQUIRED backend setting
};

app.use(cors(corsOptions));
app.use(express.json());
mongoose.connect(process.env.ATLAS_URI).catch((err)=>{
  console.error(err)
});

app.use("/", require("./routes/reviewRoute.js"));
app.use("/", require("./routes/courseRoute.js"))

app.get("/oauth2callback", async(req, res) => {
  const redirect = req.query.state;
  const code = req.query.code;
  const {id_token, access_token} = await getGoogleOAuthTokens(code);
  const googleUser = await getGoogleUser(id_token, access_token);
  //jwt.decode(id_token);
  //if (googleUser.email.split("@")[1] !== "ucr.edu") {
  //  res.redirect("#/unauthorized");
  //  return;
  //}
  console.log("google user: ", googleUser.email, "logged in");
  req.session.userID = googleUser.email;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 1); // 1 day
  res.cookie("googleUser", googleUser, { 
    expires: expirationDate,
    domain: process.env.DOMAIN,
    path: '/',
  });
  setTimeout(() => {
    res.redirect(redirect);
  }, 1000);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("googleUser", { 
    domain: process.env.DOMAIN, 
    path: '/' 
  });
  res.send("logged out");
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose');
const { getGoogleOAuthTokens, getGoogleUser } = require('./services/googleservices.js');
require('dotenv').config();

const PORT = process.env.PORT || 5050;
const app = express();

// Define the list of allowed origins
const allowedOrigins = [
  'https://highlander.reviews', // Production
  'http://localhost:3000', // Local
  'http://192.168.0.141:3000', // Local
];

// Configure CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: 'include' // <-- REQUIRED backend setting
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1) // trust first proxy
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
  console.log("google user: ", googleUser, "logged in");
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  res.cookie("googleUser", googleUser, { 
    expires: expirationDate,
    domain: 'highlander.reviews',
    path: '/',
    sameSite: 'none',
    secure: true
  });
  setTimeout(() => {
    res.redirect(redirect);
  }, 1000);
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

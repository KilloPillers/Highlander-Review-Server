const express = require('express');
const cors = require('cors');
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
  res.cookie("googleUser", googleUser, { maxAge: 30 * 60 * 1000 })
  res.redirect(redirect);
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

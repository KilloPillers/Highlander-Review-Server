const cron = require('node-cron');
const Review = require("../models/reviewModel");
const ps = require("../services/puppeteer_service.js");
const { exec } = require("child_process");

// 1) SCHEDULED TASKS
// 1.1) FILL FORM FOR ALL REVIEW NOT SUBMITTED EVERY DAY AT 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('\x1b[33m%s\x1b[0m', "**Cron Job Started**")
  console.log('\x1b[33m%s\x1b[0m', "**Querying for reviews to fill form...**")
  Review.find({ submitted: false }).select("class_name additional_comments difficulty").then((reviews) => {
    reviews.forEach((review) => {
      console.log("Found review to fill form: ", review)
      console.log("Starting Puppeteer Service...")
      if (ps.fill_form(review)) {
        review.submitted = true;
        review.save();
        console.log('\x1b[32m%s\x1b[0m', "Successfully filled form!")
      } else  {
        console.log('\x1b[1m\x1b[41m%s\x1b[0m', "SOMETHING WENT WRONG!!!")
        console.log('\x1b[33m%s\x1b[0m', "Will try again next time...")
      }
    });  
    console.log('\x1b[33m%s\x1b[0m', "**Done filling forms**")
  });
});

// 1.2) RUN PYTHON SCRIPT TO UPDATE DATABASE ONCE A WEEK AT 00:00 ON SUNDAY
cron.schedule('0 0 * * 0', async () => {
  console.log('\x1b[33m%s\x1b[0m', "**Cron Job Started**")
  console.log('\x1b[33m%s\x1b[0m', "**Running python script to update database...**")
  exec("python3 ../server_scripts/GSDiffing.py", (error, stdout, stderr) => {
    if (error) {
      console.log('\x1b[1m\x1b[41m%s\x1b[0m', "SOMETHING WENT WRONG!!!")
      console.log('\x1b[33m%s\x1b[0m', "Will try again next time...")
      console.log(error)
      return;
    }
    console.log(stdout);
    console.log(stderr);
  });
  console.log('\x1b[33m%s\x1b[0m', "**Done updating database**")
});

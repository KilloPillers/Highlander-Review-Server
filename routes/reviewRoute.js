const express = require("express");
const router = express.Router();
const Review = require("../models/reviewModel");
const Course = require("../models/courseModel");

//Returns all reviews for a course
router.route("/course-reviews/:name").get((req, res) => {
  try {
    Review.find({ class_name: req.params.name })
      .sort(req.query.sort)
      .skip(req.query.skip).limit(req.query.limit > 10 ? 10 : req.query.limit)
      .select('-user_email')
      .then((foundReviews) => {
      res.json(foundReviews);
    });
  } catch (err) {
    console.log(err);
  }
});

//Returns data for graph for a course
router.route("/course-reviews-graph-data/:name").get((req, res) => {
  try {
    Review.find({ class_name: req.params.name })
      .select('difficulty')
      .then((foundReviews) => {
        res.json(foundReviews);
      });
  } catch (err) {
    console.log(err);
  }
});

//Handles like/dislike
router.route("/liked").post((req, res) => {
  if (req.body.type === "liked")
    Review.findOneAndUpdate(
      { _id: req.body.comment_id },
      { $inc: { like: 1 } }
    ).then((foundReviews) => {
      console.log(`comment ${req.body.comment_id} liked`);
    });
  else if (req.body.type === "disliked")
    Review.findOneAndUpdate(
      { _id: req.body.comment_id },
      { $inc: { dislike: 1 } }
    ).then((foundReviews) => {
      console.log(`comment ${req.body.comment_id} disliked`);
    });
  else if (req.body.type === "remove-liked")
    Review.findOneAndUpdate(
      { _id: req.body.comment_id },
      { $inc: { like: -1 } }
    ).then((foundReviews) => {
      console.log(`comment ${req.body.comment_id} undid liked`);
    });
  else if (req.body.type === "remove-disliked")
    Review.findOneAndUpdate(
      { _id: req.body.comment_id },
      { $inc: { dislike: -1 } }
    ).then((foundReviews) => {
      console.log(`comment ${req.body.comment_id} undid disliked`);
    });
});

//Submits a review
router.route("/submit-review").post(async(req, res) => {
  //if (req.body["user_email"].split('@')[1] !== "ucr.edu") {
  //  return res.json("You must be logged in to submit a review"));
  //}
  if ( req.session.userID ) {
    req.body.user_email = req.session.userID;
  }
  else {
    return res.json("You must be logged in to submit a review");
    //Ideally, we would redirect to the login page
    //We should perform a query to check if the user is logged in
    //when they click the create a review button\
  }
  if (req.body.difficulty < 1 || req.body.difficulty > 10) {
    return res.json("Difficulty must be between 1 and 10");
  }
  if (req.body.additional_comments.length > 1500) {
    return res.json("Additional comments must be less than 1500 characters");
  }
  try {
    const foundReviews = await Review.find({ user_email: req.body["user_email"], class_name: req.body["class_name"] });
    if (foundReviews.length !== 0) {
      console.log(`user ${req.body["user_email"]} already reviewed ${req.body["class_name"]}`)
      return res.json(`You already reviewed ${req.body["class_name"]}`);
    }
  } catch (err) {
    console.log(err);
    return res.json("Something went wrong");
  }

  await Course.findOne(
    { class_name: req.body["class_name"] })
    .then((course) => {
      var new_avg = (course.average_diff * course.number_of_reviews +
        req.body["difficulty"]) /
      (course.number_of_reviews + 1);
      new_avg = parseFloat(new_avg.toFixed(2));
      course.number_of_reviews += 1;
      course.average_diff = new_avg;
      course.save();
    })
    .catch((err) => {
      console.log(err);
      return res.json("Something went wrong");
    });
 
  //create a review object from the model instead of req.body
  //people can send whatever they want in the body
  //this way we can ensure that the data is valid
  //and that the user_email is the same as the one in the session
  //and that the submitted field is false
  //and that the like and dislike fields are 0
  //and that the _id field is not set
  //and that the __v field is not set
  //and that the date field is set to the current date
  //and other fields are set to valid values
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so add 1
  const day = String(currentDate.getDate()).padStart(2, '0');
  const YYYYMMDD = `${year}/${month}/${day}`

  const newReview = new Review({
    user_email: req.body.user_email,
    class_name: req.body.class_name,
    difficulty: req.body.difficulty,
    additional_comments: req.body.additional_comments,
    submitted: false,
    like: 0,
    dislike: 0,
    date: YYYYMMDD,
  });

  await Review.create(newReview)
    .then((createdReview) => {
      console.log(`new review created: ${createdReview}`)
      res.json("New review created");
    })
    .catch((err) => {
      console.log("Failed to create new review");
      console.log(err);
    });
});

//Query for courses
router.route("/query-course/:course").get(async (req, res) => {
  const class_name_regex = new RegExp("^"+req.params.course, "i");
  const course_title_regex = new RegExp(req.params.course, "i");
  if (req.params.course.length <= 5) {
    try {
      const subject_code_results = await Course.find({"class_name": {$regex: class_name_regex}}).select("-_id -__v").limit(10).then((foundCourses) => {
        return foundCourses
      });
      if (subject_code_results.length < 10) {
        const course_title_results = await Course.find({"course_title": {$regex: course_title_regex}}).select("-_id -__v").limit(subject_code_results.length-10).then((foundCourses) => {
          return foundCourses
        });
        const set = new Set([...subject_code_results, ...course_title_results])
        const response = Array.from(set)
        res.json(response)
      }
    else {
      res.json(subject_code_results)
    }
    } catch (err) {
      console.log(err);
    }
  }
  else {
    try {
      Course.find({ $or: [ {"class_name": {$regex: class_name_regex}}, {"course_title": {$regex: class_name_regex}}] })
        .select("-_id -__v")
        .limit(10)
        .then((foundCourses) => {
          res.json(foundCourses);
        });
      } catch (err) {
        console.log(err);
      }
    }
});

//Query for courses
router.route("/get-course/:course").get((req, res) => {
  Course.find({ class_name: req.params.course }).then((foundCourses) => {
    res.json(foundCourses);
  });
});

router.route("/get-courses-from-subject-code/:subjectCode").get((req, res) => {
  try {
    Course.find({ subject_code: req.params.subjectCode }).then((foundCourses) => {
      res.json(foundCourses);
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Review = require("../models/reviewModel");
const Course = require("../models/courseModel");

//Returns all reviews for a course
router.route("/course-reviews/:name").get((req, res) => {
  try {
    Review.find({ class_name: req.params.name })
      .sort(req.query.sort)
      .skip(req.query.skip).limit(req.query.limit)
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
      .select('-user_email -additional_comments -submitted -like -dislike -_id -__v')
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
      console.log("number of reviws", course.number_of_reviews)
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

  req.body.submitted = false;
  await Review.create(req.body)
    .then((createdReview) => {
    })
    .catch((err) => {
      console.log(err);
    });
  
  res.json(`new review created`);
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

router
  .route("/get-review-count-from-course/:subjectCode/:courseNumber")
  .get((req, res) => {
    try {
      Review.countDocuments({ 
        class_name: req.params.subjectCode + req.params.courseNumber}).then(
        (reviewCount) => {
          res.json(reviewCount);
          console.log(req);
        }
      );
    } catch (err) {
      console.log(err);
    }
  });

module.exports = router;

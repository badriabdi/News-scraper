var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

//===========================================================================
//HERE ARE OUR SCRAPING TOOLS

// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

//===========================================================================
//NOW WE REQUIRE ALL MODELS

var db = require("./models");

var PORT = process.env.PORT || 3000;

//===========================================================================
//AND NOW WE INITIALIZE EXPRESS
var app = express();

//merge this


//===========================================================================================
// CONFIGURING MIDDLEWARE

//MORGAN LOGGER - FOR LOGGIN REQUESTS
app.use(logger("dev"));

//USING BODY-PARSER FOR HANDLING FORM SUBMISSIONS
app.use(express.urlencoded({ extended: true }));

//NOW USING EXPRESS.STATIC TO SERVE THE PUBLIC FOLDER AS A STATIC DIRECTORY
app.use(express.static("public"));


// NOW WE CONNECT TO MONGO DB
var MONGODB_URI= process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);



//===========================================================================================..
//NOW WE HAVE THE ROUTES


//THE FIRST ROUTE IS FOR SCRAPING THE DAILY MAIL SPORT WEBSITE
app.get("/scrape", function(req, res) {

//WE GRAB THE BODY OF THE HTML WITH REQUEST
  axios.get("https://www.dailymail.co.uk/sport/football/index.html").then(function(result) {

//THEN, WE LOAD THAT INTO CHEERIO AND SAVE IT TO $ FOR A SHORTHAND SELECTOR

var $ = cheerio.load(result.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".article h2").each(function(i, element) {
      // Save an empty result object
      var result = {};

      
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          return res.json(err);
        });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

//===========================================================================================




// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//===========================================================================================

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//===========================================================================================

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.post("/deletenote/:id", function(req, res) {
  db.Article.findOne({ _id: req.params.id })
  .then(function (dbArticle) {
    return db.Comment.findOneAndRemove({ _id: dbArticle.comment })
  })
  .then(function (dbArticle) {
    return db.Article.findOneAndUpdate({ _id: req.params.id }, { $unset: { comment: "" }})   
  })
  .then(function (dbArticle) {
    res.json(dbArticle);      
  })
  .catch(function (err) {
    res.json(err);
  })
});




//===========================================================================================

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});

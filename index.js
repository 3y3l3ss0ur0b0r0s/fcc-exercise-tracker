const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

// add mongoose
const mongoose = require('mongoose');

// connect to mongo database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// add body-parser
const bodyParser = require('body-parser');

// configure body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// ==================================================

// -- creating schemas ------------------------------

console.log("Creating schemas...");

const Schema = mongoose.Schema; // just for easier coding/typing

// exercise schema
const exerciseSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

// user schema
const userSchema = new Schema({
  username: String
});

const User = mongoose.model("User", userSchema);

// log schema
const logSchema = new Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});

const Log = mongoose.model("Log", logSchema);

// -- POST to /api/users ----------------------------
// with form data "username" to create a new user

console.log("Going to app.post(\"/api/users\"...)...");

app.post("/api/users", (req, res) => {
  // create new user using schema and req.body property (username)
  console.log("In app.post(\"/api/users\"...)!");

  var someUser = new User({ username: req.body.username });
  console.log(req.body.username);
  console.log(someUser);

  // save someUser--this will generate the _id
  someUser.save();
  console.log("someUser: " + someUser);

  res.send({
    username: someUser.username,
    _id: someUser._id
  });
}); // end app.post()

// -- GET /api/users --------------------------------
// to get a list of all users (should return an array of users)

// - - -removing everyone & all exercises  - - - - - -
// for testing


User.deleteMany({})
  .then(() => {
    console.log("User data deleted!");
  })
  .catch((err) => {
    console.log(err);
  });

Exercise.deleteMany({})
  .then(() => {
    console.log("Exercise data deleted!");
  })
  .catch((err) => {
    console.log(err);
  });


// - - - - - - - - - - - - - - - - - - - - - - - - - -

console.log("Going to app.get(\"/api/users\"...)...");

app.get("/api/users", (req, res) => {

  console.log("In app.get(\"/api/users\"...)!");

  var allUsers = new Array();

  User.find({}).exec()
    .then((users) => {
      users.map(u => allUsers.push(u));
      res.send(allUsers);
    });
}); // end app.get()

// -- POST to /api/users/:_id/exercises -------------
// post to /api/users/:_id/exercises with form data:
// description, duration, and date (optionally)
// date will be current date if used
// response is user object with exercise fields added

console.log("Going to app.post(\"/api/users/:_id/exercises\"...)...");

app.post("/api/users/:_id/exercises", (req, res) => {

  console.log("In app.post(\"/api/users/:_id/exercises\"...)!");

  console.log("req.params._id: " + req.params._id);

  User.findById(req.params._id)
    .then((thisUser) => {
      console.log("thisUser: " + thisUser);

      if (thisUser != null) {
        console.log("thisUser is not null.");

        var date = new Date(Date.now());

        if (new Date(req.body.date) != 'Invalid Date') {

          // make sure you cut the date string--this is the format FCC wants
          console.log("\treq.body.date: " + req.body.date);
          date = (new Date(req.body.date)).toDateString().substr(0, 15);
          console.log("\tdate: " + (req.body.date));

          console.log("Since date provided is a valid date, it was changed to " + date + ".");

        } else {

          console.log("Date provided (" + req.body.date + ") is not a valid date. Using today's date instead.");

          // make sure you cut the date string--this is the format FCC wants
          date = date.toDateString().substr(0, 15);

        }

        var someExercise = new Exercise({
          username: thisUser.username,
          description: req.body.description,
          duration: req.body.duration,
          date: date
        });

        // save someExercise--this will generate the _id
        someExercise.save();
        console.log("someExercise: " + someExercise);

        // get the log for the user and push the new exercise onto it
        Log.findById(thisUser._id)
          .then((thisLog) => {
            // if a log doesn't exist for the user, create one
            // otherwise, push the new exercise onto the already-existing log array
            if (thisLog == null) {
              console.log("Log doesn't exist for " + thisUser.username + " (" + thisUser._id + ")");
              var someLog = new Log({
                username: thisUser.username,
                count: 1,
                _id: thisUser._id,
                log: [{
                  description: someExercise.description,
                  duration: someExercise.duration,
                  date: someExercise.date
                }]
              });

              console.log("Log count is now " + someLog.count + ".");

              someLog.save();
              console.log(someLog);

            } else {
              console.log("Log already exists for " + thisUser.username + " (" + thisUser._id + ")");
              thisLog.log.push({
                description: someExercise.description,
                duration: someExercise.duration,
                date: someExercise.date
              });
              thisLog.count = thisLog.count + 1;

              thisLog.save();
              console.log(thisLog);

            } // end if-else
          })
          .catch((err) => {
            console.log(err);
          });

        res.send({
          _id: thisUser._id,
          username: thisUser.username,
          description: someExercise.description,
          duration: someExercise.duration,
          date: someExercise.date
        });

      } else {
        console.log("thisUser is null.");
        res.send({
          error: "No user found with the specified user ID."
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
}); // end app.post()

// -- GET log from /api/users/:_id/logs -------------
// return a user object with 
// a count property representing the nuber of exercises
// a log with an array of all the exercises added
//
// remember to access query string values with "req.query.VARIABLE_NAME"
// "from" and "to" dates in yyyy-mm-dd format
// "limit" is the number of logs (exercises?) to send back
// path with query string: /api/users/:_id/logs?from=fromValue?&to=toValue?&limit=limitValue

console.log("Going to app.get(\"/api/users/:_id/logs\"...).");

app.get("/api/users/:_id/logs", (req, res) => {

  console.log("In app.get(\"/api/users/:_id/logs\"...)!");

  Log.findById(req.params._id)
    .then((thisLog) => {
      if (thisLog != null) {

        //console.log("Log found for the specified user " + thisLog.username + " (" + req.params._id + ")!");

        // query parameters
        let fromValue = req.query.from ? req.query.from : new Date(-8640000000000000);
        let toValue = req.query.to ? req.query.to : new Date(8640000000000000);
        let limitValue = req.query.limit ? req.query.limit : null;

        /*console.log(
          "\nreq.query.from: " + req.query.from + ", fromValue: " + fromValue +
          "\nreq.query.to: " + req.query.to + ", toValue: " + toValue +
          "\nreq.query.limit: " + req.query.limit + ", limitValue: " + limitValue +
          "\n"
        );*/

        // go through each element in Log's log array and compare to the "from" and "to" values
        //console.log("thisLog.log: " + thisLog.log);

        var filteredLog = thisLog.log.filter(entry => {
          let entryDate = new Date(entry.date.slice(4));
          
          /*console.log(
            "\nDate value: " + entryDate +
            "\nDate fromValue: " + new Date(fromValue) +
            "\nDate toValue: " + new Date(toValue)
          );*/
          
          return (new Date(entryDate) >= new Date(fromValue)) && (new Date(entryDate) < new Date(toValue));
        });

        //console.log("Number of log entries matching date constraints: " + filteredLog.length)

        if(limitValue) {
          filteredLog = filteredLog.slice(0, limitValue);
          //console.log("Number of log entries after limit filter: " + filteredLog.length);
        } 

        //console.log("username: " + thisLog.username);
  
        res.send({
          _id: thisLog.id,
          username: thisLog.username,
          count: filteredLog.length,
          log: filteredLog
        });
      } else {
        
        //console.log("No log found for the specified user ID (" + req.params._id + "). :(");

        res.send({
          error: "No log found for the specified user ID."
        })
      } // end if-else
    })
    .catch((err) => {
      console.log(err);
    });
}); // end app.get

// ==================================================

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
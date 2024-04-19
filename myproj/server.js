var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
//connection stuff
var connection = mysql.createConnection({
    host: '35.238.150.143',
    user: 'root',
    password: 'team117',
    database: 'netflix_wrapped'
});

connection.connect(function(err) {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

//////////////////////////// Edit after this. Everything above stays the same //////////////////////////
var app = express();

// Set up ejs view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.render('index'); // Assuming you have an index.ejs file in the 'views' directory
});

app.get('/api/attendance', function(req, res) {
    var sql = 'SELECT * FROM user_info'; // Assuming 'user_info' is your table name

    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching attendance data:', err);
            res.status(500).send({ message: 'Error fetching attendance data', error: err });
            return;
        }
        res.json(results);
    });
});

app.get('/api/search', function(req, res) {
    var title = req.query.title; // Extract the title from the query parameters
    if (!title) {
        res.status(400).send({ message: 'Title parameter is missing' });
        return;
    }

    var sql = 'SELECT * FROM title WHERE primaryTitle = ?'; // Assuming 'Title' is the column name

    connection.query(sql, [title], function(err, results) {
        if (err) {
            console.error('Error searching for title:', err);
            res.status(500).send({ message: 'Error searching for title', error: err });
            return;
        }
        res.json(results);
    });
});

app.post('/api/netflix-wrapped/modify/:id', function(req, res) {
  var id = req.params.id;
  var title = req.body.title;
  var date = req.body.date;
  var season = req.body.season;
  var episode = req.body.episode;
  var titleType = req.body.titleType;

  var sql = 'UPDATE user_info SET title = ?, date = ?, season = ?, episode = ?, titleType = ? WHERE id = ?';

  connection.query(sql, [title, date, season, episode, titleType, id], function(err, result) {
    if (err) {
      console.error('Error modifying user info:', err);
      res.status(500).send({ message: 'Error modifying user info', error: err });
      return;
    }
    if(result.affectedRows === 0) {
      // No rows were affected, meaning no record was found with that ID
      res.status(404).send({ message: 'Record not found' });
    } else {
      res.send({ message: 'User info modified successfully' });
    }
  });
});

//////////////////////////// Edit before this. Everything bellow stays the same //////////////////////////
//porting stuff

app.listen(80, function () {
  console.log('Node app is running on port 80');
});

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Multer configuration for handling file uploads
const upload = multer({ dest: 'uploads/' });

// MySQL connection
const connection = mysql.createConnection({
  host: '35.238.150.143',
  user: 'root',
  password: 'team117',
  database: 'netflix_wrapped'
});

connection.connect();

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Welcome to the CSV upload application!');
});

// Route for uploading CSV file
app.post('/upload', upload.single('csvfile'), (req, res) => {
  const filePath = req.file.path;
  // Process the CSV file and insert data into the database
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading CSV file');
    }
    // Parse CSV data and insert into user_info table
    const rows = data.split('\n').slice(1); // Skip header row
    const values = rows.map(row => {
      const [Title, Date, Season, Episode] = row.split(',');
      return [Title, Date, Season, Episode];
    });
    const sql = 'INSERT INTO user_info (Title, Date, Season, Episode) VALUES ?';
    connection.query(sql, [values], (err, result) => {
      if (err) {
        return res.status(500).send('Error inserting data into database');
      }
      res.redirect('/success');
    });
  });
});

// Route to handle success page
app.get('/success', (req, res) => {
  res.send('Data uploaded successfully!');
});

// Start server
app.listen(80, function () {
    console.log('Node app is running on port 80');
});

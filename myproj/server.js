const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const { exec } = require('child_process');
const fileUpload = require('express-fileupload');

// Connection setup
const connection = mysql.createConnection({
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

const app = express();

// Set up ejs view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

// Routes
app.get('/', function(req, res) {
    res.render('index'); // Assuming you have an index.ejs file in the 'views' directory
});

app.get('/api/attendance', function(req, res) {
    const sql = 'SELECT * FROM user_info';

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
    const title = req.query.title;
    if (!title) {
        res.status(400).send({ message: 'Title parameter is missing' });
        return;
    }

    const sql = 'SELECT * FROM title WHERE primaryTitle = ?';

    connection.query(sql, [title], function(err, results) {
        if (err) {
            console.error('Error searching for title:', err);
            res.status(500).send({ message: 'Error searching for title', error: err });
            return;
        }
        res.json(results);
    });
});

app.get('/api/total-runtime', function(req, res) {
    const sql = `
        SELECT SUM(t.runtimeMinutes) as totaltime, SUBSTRING(u.Date, -2) as year, t.titleType
        FROM user_info u
        JOIN title t ON u.Title = t.primaryTitle AND u.titleType = t.titleType
        WHERE t.titleType = 'movie'
        GROUP BY year, t.titleType
        UNION
        SELECT SUM(t.runtimeMinutes) as totaltime, SUBSTRING(u.Date, -2) as year, t.titleType
        FROM user_info u
        JOIN title t ON u.Title = t.primaryTitle
        WHERE t.runtimeMinutes < 70 AND t.runtimeMinutes > 19 AND t.titleType != 'movie'
        GROUP BY year, t.titleType
        ORDER BY year DESC;
    `;

    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching total runtime data:', err);
            res.status(500).send({ message: 'Error fetching total runtime data', error: err });
            return;
        }
        res.json(results);
    });
});

app.post('/api/upload-csv', function(req, res) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const csvFile = req.files.csvFile;

    // Move the uploaded file to the temporary directory
    const uploadDir = path.join(__dirname, 'tmp');
    const filePath = path.join(uploadDir, csvFile.name);

    csvFile.mv(filePath, function(err) {
        if (err) {
            return res.status(500).send(err);
        }

        // Execute the Python script passing the file path as an argument
        const pythonScript = `python3 your_python_script.py ${filePath}`;

        exec(pythonScript, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing Python script: ${error.message}`);
                return res.status(500).send({ message: 'Error executing Python script', error: error });
            }
            if (stderr) {
                console.error(`Python script stderr: ${stderr}`);
            }
            console.log(`Python script stdout: ${stdout}`);
            res.send('CSV file uploaded and processed successfully.');
        });
    });
});

// Port setup
const PORT = process.env.PORT || 80;
app.listen(PORT, function () {
  console.log(`Node app is running on port ${PORT}`);
});


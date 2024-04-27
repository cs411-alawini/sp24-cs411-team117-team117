var express = require('express');
var path = require('path');
var mysql = require('mysql2');
const { exec } = require('child_process');
const fileUpload = require('express-fileupload');

// MySQL connection setup
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

var app = express();

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

// Route to display the initial upload form
app.get('/', function(req, res) {
    res.render('index');
});

// Route to handle file upload and processing
app.post('/api/upload-csv', function(req, res) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const csvFile = req.files.csvFile;
    const uploadDir = path.join(__dirname, 'tmp');
    const filePath = path.join(uploadDir, csvFile.name);

    csvFile.mv(filePath, function(err) {
        if (err) {
            return res.status(500).send(err);
        }

        const pythonScript = `python3 your_python_script.py ${filePath}`;

        exec(pythonScript, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing Python script: ${error.message}`);
                return res.status(500).send({ message: 'Error executing Python script', error: error });
            }
            if (stderr) {
                console.error(`Python script stderr: ${stderr}`);
            }
            // Redirect to a new page after processing
            res.redirect('/results');
        });
    });
});

// Route to render the results page
app.get('/results', function(req, res) {
    res.render('results');
});

// Route to fetch user information
app.get('/api/user-info', function(req, res) {
    var sql = 'SELECT * FROM user_info';
    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching user info:', err);
            res.status(500).send({ message: 'Error fetching user info', error: err });
            return;
        }
        res.json(results);
    });
});

// Route to calculate and return runtime data
app.get('/api/runtime', function(req, res) {
    calculateRuntime(res);
});

function calculateRuntime(response) {
    var sql = `
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
            response.status(500).send({ message: 'Error fetching total runtime data', error: err });
            return;
        }
        response.json(results);
    });
}

// Start the server
app.listen(80, function () {
    console.log('Node app is running on port 80');
});

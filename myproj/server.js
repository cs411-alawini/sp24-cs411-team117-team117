const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const { exec } = require('child_process');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

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

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'views')));
app.use('/css', express.static(path.join(__dirname, 'views/css')));

app.use(fileUpload());

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/results', function(req, res) {
    res.render('results');
});

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
            res.redirect('/results');
        });
    });
});

app.get('/api/user-info', function(req, res) {
    var sql = 'SELECT * FROM user_info';
    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching user info:', err);
            return res.status(500).send({ message: 'Error fetching user info', error: err });
        }
        res.json(results);
    });
});

app.post('/api/user-info/update/:id', function(req, res) {
    const userId = req.params.id;
    const { Title, Date, Season, Episode, titleType } = req.body;

    const sql = 'UPDATE user_info SET Title = ?, Date = ?, Season = ?, Episode = ?, titleType = ? WHERE id = ?';
    connection.query(sql, [Title, Date, Season, Episode, titleType, userId], function(err, result) {
        if (err) {
            console.error('Error updating user info:', err);
            return res.status(500).send({ message: 'Error updating user info', error: err });
        }
        res.send({ message: 'User info updated successfully' });
    });
});

app.post('/api/user-info/delete/:id', function(req, res) {
    const userId = req.params.id;
    const sql = 'DELETE FROM user_info WHERE id = ?';
    connection.query(sql, [userId], function(err, result) {
        if (err) {
            console.error('Error deleting user info:', err);
            return res.status(500).send({ message: 'Error deleting user info', error: err });
        }
        res.send({ message: 'User info deleted successfully' });
    });
});

app.get('/api/runtime/:year', function(req, res) {
    const selectedYear = req.params.year;
    calculateRuntime(res, selectedYear);
});

function calculateRuntime(response, year) {
    var sql = `
        SELECT SUM(t.runtimeMinutes) as totaltime, '${year}' as year, t.titleType
        FROM user_info u
        JOIN title t ON u.Title = t.primaryTitle AND u.titleType = t.titleType
        WHERE t.titleType = 'movie' AND SUBSTRING(u.Date, -2) = '${year}'
        GROUP BY year, t.titleType
        UNION
        SELECT SUM(t.runtimeMinutes) as totaltime, '${year}' as year, t.titleType
        FROM user_info u
        JOIN title t ON u.Title = t.primaryTitle
        WHERE t.runtimeMinutes < 70 AND t.runtimeMinutes > 19 AND t.titleType != 'movie' AND SUBSTRING(u.Date, -2) = '${year}'
        GROUP BY year, t.titleType
        ORDER BY year DESC;
    `;

    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching total runtime data:', err);
            response.status(500).send({ message: 'Error fetching total runtime data', error: err });
        } else {
            response.json(results);
        }
    });
}

app.listen(80, function () {
    console.log('Node app is running on port 80');
});

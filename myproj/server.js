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

app.get('/api/display', function(req, res) {
    var sql = 'SELECT * FROM display';
    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching display info:', err);
            return res.status(500).send({ message: 'Error fetching display info', error: err });
        }
        res.json(results);
    });
});

app.post('/api/display/add', function(req, res) {
    const { tconst, primaryTitle, runtimeMinutes, Season, Episode, Date, titleType, id } = req.body;

    const sql = 'INSERT INTO display (id, tconst, primaryTitle, runtimeMinutes, Season, Episode, Date, titleType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [tconst, primaryTitle, runtimeMinutes, Season, Episode, Date, titleType, id], function(err, result) {
        if (err) {
            console.error('Error adding to display:', err);
            return res.status(500).send({ message: 'Error adding to display', error: err });
        }
        res.send({ message: 'Data added to display successfully' });
    });
});


app.post('/api/display/update/:id', function(req, res) {
    const displayId = req.params.id;
    const { primaryTitle, runtimeMinutes, Season, Date, titleType } = req.body;

    const sql = 'UPDATE display SET primaryTitle = ?, runtimeMinutes = ?, Season = ?, Date = ?, titleType = ? WHERE id = ?';
    connection.query(sql, [primaryTitle, runtimeMinutes, Season, Date, titleType, displayId], function(err, result) {
        if (err) {
            console.error('Error updating display:', err);
            return res.status(500).send({ message: 'Error updating display', error: err });
        }
        res.send({ message: 'Display info updated successfully' });
    });
});

app.post('/api/display/delete/:id', function(req, res) {
    const displayId = req.params.id;
    const sql = 'DELETE FROM display WHERE id = ?';
    connection.query(sql, [displayId], function(err, result) {
        if (err) {
            console.error('Error deleting display info:', err);
            return res.status(500).send({ message: 'Error deleting display info', error: err });
        }
        res.send({ message: 'Display info deleted successfully' });
    });
});


app.get('/api/runtime', function(req, res) {
    calculateRuntime(res);
});

function calculateRuntime(response) {
    var sql = `
    SELECT CONCAT('20', SUBSTRING(d.Date, -2)) as year, SUM(d.runtimeMinutes) as totaltime, d.titleType
    FROM display d
    WHERE d.titleType = 'movie'
    GROUP BY year, d.titleType
    UNION
    SELECT CONCAT('20', SUBSTRING(d.Date, -2)) as year, SUM(d.runtimeMinutes) as totaltime, d.titleType
    FROM display d
    WHERE d.titleType != 'movie'
    GROUP BY year, d.titleType
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


// New API endpoint
app.get('/api/create/:year', function(req, res) {
    const selectedYear = req.params.year;

    // Sample SQL query
    const query = `CALL analysis_create('${selectedYear}')`;

    // Execute the query
    connection.query(query, function(err, results) {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).send({ message: 'Error executing query', error: err });
        }
        res.json(results);
    });
});

// Route to handle search and filter display items
app.post('/api/display/search', function(req, res) {
    const searchText = req.body.searchText;
    const sql = `SELECT * FROM display WHERE primaryTitle LIKE '%${searchText}%'`;
    connection.query(sql, function(err, results) {
        if (err) {
            console.error('Error fetching filtered display info:', err);
            return res.status(500).send({ message: 'Error fetching filtered display info', error: err });
        }
        res.json(results);
    });
});

app.listen(80, function () {
    console.log('Node app is running on port 80');
});

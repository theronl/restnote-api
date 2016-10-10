// server.js

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var Note = require('./app/models/note.js');


// add POST processing to the app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = parseInt(process.env.npm_package_config_port) || 8080;
var hostname = process.env.npm_package_config_hostname || '127.0.0.1';

// Set up routes

var router = express.Router();

router.use(function(req,res,next) {
	console.log('Request made.');
	next();
});

router.get('/', function(req, res) {
	res.json({ message: 'Success!'});
});

router.route('/notes/:noteId')
	.get(function(req, res) {
		var id = req.params.noteId;
		Note.findById(id, function(err, note) {
			if (err) {
				return res.status(500).send({error: err.message});
			}
			if (note === undefined) {
				return res.status(404).send({error: "Note with id=" + id + " does not exist."});
			}
			res.json(note.data);
		});
	})
	.put(function(req, res) {
		var id = req.params.noteId;
		Note.findById(id, function(err, note) {
			if (err) {
				return res.status(500).send({error: err.message});
			}
			if (note === undefined) {
				return res.status(404).send({error: "Note with id=" + id + " does not exist."});
			}
			note.changeBody(req.body.body);
			note.save(function(err, note) {
				if (err) {
					return res.status(500).send({error: err.message});
				}
				if (note === undefined) {
					return res.status(404).send({error: "Note with id=" + id + " does not exist."});
				}
				return res.json(note.data);
			});
		});
	})
	.delete(function(req, res) {
		var id = req.params.noteId;
		Note.deleteById(id, function(err, changes) {
			if (err) {
				return res.status(500).send({error: err.message});
			}
			if (changes < 1) {
				return res.status(404).send({error: "Note with id=" + id + " does not exist."});
			}
			res.json({ message: 'DELETE book id ' + id + ' successful.' });
		});
	});

router.route('/notes')
	.get(function(req, res) {
		var query = req.query.query;
		Note.all(query, function (err, rows) {
			if (err) {
				return res.status(500).send({error: err.message});
			}
			res.json(rows);
		});
	})
	.post(function(req, res) {
		note = new Note({ body: req.body.body });
		note.save(function(err, note) {
			if (err) {
				return res.status(500).send({error: err.message});
			}
			res.json(note.data);
		});
	});


app.use('/api', router);

if (hostname) {
	app.listen(port, hostname);
	console.log('API listening on interface ' + hostname + ' port ' + port);
}
else {
	app.listen(port);
	console.log('API listening on all interfaces, port ' + port);
}



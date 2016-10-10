// note.js

var db = require("./db.js");
var fts_enabled = true
db.serialize(function() {
	db.get("SELECT sqlite_compileoption_used('ENABLE_FTS3') as fts_enabled", [ ], function(err, row) {
		if (err) {
			fts_enabled = false;
		}
		else {
			if (!row.fts_enabled) fts_enabled = false;
		}
	});
	
	// Create a full text search table.
	if (fts_enabled) {
		db.run("CREATE VIRTUAL TABLE IF NOT EXISTS notes USING fts4(body TEXT)");
	}
	else {
		// Fall back to standard table
		db.run("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT)");
	}
});



var Note = function (data) {
	this.data = this.sanitize(data);
}

Note.schema = {
	id: function (id) {
		if (typeof id === 'number') return id;
		if (typeof id === 'string') return parseInt(id);
		return null;
	}
	, body: null
}

Note.prototype.data =  { }

Note.prototype.queryData = function () {
	var rval = { }
	for (prop in Note.schema) {
		if (prop in this.data) {
			rval['$'+prop] = this.data[prop];
		}
	}
	return rval;
}

Note.prototype.changeBody = function(body) {
	this.data.body = body
}

Note.findById = function (id, callback) {
	var sql = fts_enabled ?
		"SELECT rowid as id, body FROM notes WHERE rowid=?" :
		"SELECT id, body FROM notes WHERE id=?";
	db.get(sql, [ Note.schema.id(id) ], function (err, row) {
		if (err) return callback(err);
		if (row === undefined) return callback(null);
		callback(null, new Note(row));
	});
}

Note.all = function (query, callback) {
	var sql = fts_enabled ?
		( query ?
		  "SELECT rowid as id, body FROM notes WHERE body MATCH ?" :
		  "SELECT rowid as id, body FROM notes" ) :
		( query ?
		  "SELECT id, body FROM notes where body LIKE ?" :
		  "SELECT id, body FROM notes" );
	var querystr = fts_enabled || !query ?
		query :
		'%' + query + '%';
	db.all(sql, [ query ], function (err, rows) {
		if (err) return callback(err);
		callback(null, rows);
	});
}

Note.deleteById = function (id, callback) {
	var sql = fts_enabled ?
		"DELETE FROM notes WHERE rowid=?" :
		"DELETE FROM notes WHERE id=?";
	db.run(sql, [ Note.schema.id(id) ], function (err) {
		if (err) return callback(err);
		callback(null, this.changes);
	});
}

Note.prototype.save = function (callback) {
	var self = this;
	var runcb = function (err) {
		if (err) return callback(err);
		if (!self.data.id) self.data.id = this.lastID;
		callback(null, self);
	}
	
	if (!self.data.id) {
		db.run("INSERT INTO notes (body) VALUES ($body)", self.queryData(), runcb);
	}
	else {
		var sql = fts_enabled ?
			"UPDATE notes SET body=$body WHERE rowid=$id" :
			"UPDATE notes SET body=$body WHERE id=$id";
		db.run(sql, self.queryData(), runcb);
	}
}

Note.prototype.get = function (name) {
	return this.data[name];
}

Note.prototype.set = function (name, value) {
	this.data[name] = value;
}

Note.prototype.sanitize = function (data) {
	var rval = { }
	for (prop in Note.schema) {
		if (prop in data) {
			rval[prop] = Note.schema[prop] ? Note.schema[prop](data[prop]) : data[prop];
		}
	}
	return rval;
}

module.exports = Note;

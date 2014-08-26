// Dependencies
var express         = require( 'express' ),
    logger          = require( 'morgan' ),
    bodyParser      = require( 'body-parser' ),
    cookieParser    = require( 'cookie-parser' ),
    cookieSession   = require( 'cookie-session' ),
    fs              = require( 'fs' ),
    crypto          = require( 'crypto' ),
    slug            = require( 'slug' ),
    server          = express(),
    port            = process.env.PORT || 3030;

// Secret tokens
var cookieParserSecret = crypto.randomBytes( 64 ).toString( 'base64' ),
    cookieSessionSecret = crypto.randomBytes( 64 ).toString( 'base64' );

var studentsFile = __dirname + '/students.json';

// Middleware configuration
server.set( 'view engine', 'jade' );
// server.use( logger( 'combined' ) );
server.use( '/assets', express.static( __dirname + '/assets' ) );
server.use( bodyParser.urlencoded({ extended: false }) );
server.use( cookieParser( cookieParserSecret ) );
server.use( cookieSession({ secret: cookieSessionSecret }) );

fs.exists( studentsFile, function( e ) {
    if ( ! e ) {
        var db = { students: [] };
        fs.writeFile( studentsFile, JSON.stringify( db ), function( err ) {
            if ( err ) {
                console.log( '[ERROR]: Unable to create new students.json', err );
            } else {
                console.log( '[SERVER]: Created new students.json' );
            }
        });
    }
});

function trimSSN( ssn ) {
    ssn = ssn.trim();

    if ( ssn.indexOf( '-' ) < 0 ) {
        ssn = ssn.slice( 0, 6 ) + '-' + ssn.slice( 6, 10 );
    }

    return ssn;
}

// Routes
server.get( '/', function( req, res ) {
    res.render( 'index', {
        error: req.query.error,
        success: req.query.success
    });
});

server.post( '/', function( req, res ) {
    var db = {},
        exists = false;

    if ( req.body.program == '0' || req.body.firstname == '' ||
         req.body.lastname == '' || req.body.ssn == '' ||
         req.body.phone == '' || req.body.email == '' ) {
        res.redirect( '/?error=1' );
        return;
    }

    req.body.ssn = trimSSN( req.body.ssn )
    
    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        if ( err ) {
            console.log( '[ERROR]: Unable to open students.json.', err );
            res.redirect( '/?error=1' );
            return;
        }

        db = JSON.parse( data );
        db.students = db.students || [];

        var i;

        db.students.forEach( function( student, index ) {
            if ( student.ssn == req.body.ssn ) {
                exists = true;
                i = index;
            }
        });

        if ( exists ) {
            console.log( '[SERVER]: Student already exists - updating.' );
            db.students[i] = req.body;
        } else {
            console.log( '[SERVER]: Creating new student.' );
            req.body.image = slug( req.body.lastname + ' ' + req.body.firstname, '_' ).toLowerCase() + '_thumb.jpg';
            db.students.push( req.body );
        }

        fs.writeFile( studentsFile, JSON.stringify( db ), function( err ) {
            if ( err ) {
                console.log( '[ERROR]: Unable to write to students file.', err );
                res.redirect( '/?error=1' );
                return;
            }

            res.redirect( '/?success=' + ( exists ? '2' : '1' ) );
        });
    });
});

server.get( '/student', function( req, res ) {
    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        var db = JSON.parse( data );

        db.students.forEach( function( student ) {
            if ( student.ssn == req.query.ssn ) {
                res.status( 200 ).end();
            }
        });

        res.status( 418 ).end();
    });
});

server.get( '/clear', function( req, res ) {
    var db = { students: [] },
        date = new Date();

    fs.rename( studentsFile, 'students_backup_' + date.toString() + '.json', function( err ) {
        if ( err ) {
            console.log( '[ERROR]: Unable to rename students.json', err );
            res.redirect( '/list' );
        } else {
            console.log( '[SYSTEM]: Backup created!' );

            fs.writeFile( studentsFile, JSON.stringify( db ), function( err ) {
                if ( err ) {
                    console.log( '[ERROR]: Unable to create new students.json', err );
                } else {
                    console.log( '[SERVER]: Created new students.json' );
                }

                res.redirect( '/list' );
            });
        }
    });
});

server.get( '/list', function( req, res ) {
    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        if ( err ) {
            console.log( '[ERROR]:', err );
            return;
        }

        var db = JSON.parse( data );

        db.students.sort( function( a, b ) {
            if ( a.lastname < b.lastname ) {
                return -1;
            }
            if ( a.lastname > b.lastname ) {
                return 1;
            }
            return 0;
        });

        res.render( 'list', { students: db.students } );
    });
});

server.get( '/edit', function( req, res ) {
    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        if ( err ) {
            console.log( '[ERROR]:', err );
            return;
        }

        var db = JSON.parse( data ),
            student = {};

        db.students.forEach( function( s ) {
            if ( req.query.ssn = s.ssn ) {
                student = s;
            }
        });

        res.render( 'edit', {
            student: student,
            error: req.query.error,
            success: req.query.success
        });
    });
});

server.post( '/edit', function( req, res ) {
    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        if ( err ) {
            console.log( '[ERROR]:', err );
            return;
        }

        var db = JSON.parse( data ),
            i = false;

        db.students.forEach( function( student, index ) {
            if ( req.body.ssn = student.ssn ) {
                i = index;
            }
        });

        if ( i !== false ) {
            db.students[i] = req.body;

            fs.writeFile( studentsFile, JSON.stringify( db ), function( err ) {
                if ( err ) {
                    console.log( '[ERROR]: Unable to write to students file.', err );
                    return;
                }

                res.redirect( '/edit?success=1&ssn=' + db.students[i].ssn );
            });
        } else {
            res.redirect( '/edit?error=1&ssn=' + db.students[i].ssn );
        }
    });
});

server.get( '/export', function( req, res ) {
    res.render( 'export' );
});

server.get( '/download', function( req, res ) {
    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        if ( err ) {
            console.log( '[ERROR]:', err );
            return;
        }

        var db = JSON.parse( data ),
            csv = 'firstname,lastname,phone,email,ssn,image\n';

        db.students.sort( function( a, b ) {
            if ( a.lastname < b.lastname ) {
                return -1;
            }
            if ( a.lastname > b.lastname ) {
                return 1;
            }
            return 0;
        });

        db.students.forEach( function( student ) {
            if ( req.query.program == 'any' ) {
                csv += [
                    student.firstname,
                    student.lastname,
                    student.phone,
                    student.email,
                    student.ssn,
                    student.image
                ].join( ',' ) + '\n';
            } else if ( student.program == req.query.program ) {
                csv += [
                    student.firstname,
                    student.lastname,
                    student.phone,
                    student.email,
                    student.ssn,
                    student.image
                ].join( ',' ) + '\n';
            }
        });

        res.attachment( 'students.csv' );
        res.type( 'text/csv' );
        res.charset = 'UTF-8';
        res.send( csv );
    });
});

// Error handlers
server.use( function( req, res, next ) {
    var err = new Error( 'Page Not Found [' + req.path + ']' );
    err.status = 404;
    next( err );
});
server.use( function( err, req, res, next ) {
    err.status = err.status || 500;
    console.log( '[ERROR]:', err );
    res.status( err.status );
    res.render( 'error', { status: err.status } );
});

// Start listening for HTTP requests
server.listen( port, function() {
    console.log( '[SERVER]: Started listening on port ' + port );
});

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
server.use( logger( 'combined' ) );
server.use( '/assets', express.static( __dirname + '/assets' ) );
server.use( bodyParser.urlencoded({ extended: false }) );
server.use( cookieParser( cookieParserSecret ) );
server.use( cookieSession({ secret: cookieSessionSecret }) );

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

    if ( req.body.program == '' || req.body.firstname == '' ||
         req.body.lastname == '' || req.body.ssn == '' ||
         req.body.phone == '' || req.body.email == '' ) {
        res.redirect( '/?error=1' );
     }

    fs.readFile( studentsFile, 'utf8', function( err, data ) {
        if ( err ) {
            console.log( '[ERROR]:', err );
            res.redirect( '/?error=1' );
        }

        db = JSON.parse( data );
        db.students = db.students || [];
        db.students.forEach( function( student ) {
            if ( student.ssn == req.body.ssn ) {
                exists = true;
            }
        });

        if ( exists ) {
            console.log( '[SERVER]: Student already exists' );
            res.redirect( '/?error=1' );
        } else {
            req.body.image = slug( req.body.lastname + ' ' + req.body.firstname, '_' ).toLowerCase() + '_thumb.jpg';
            db.students.push( req.body );

            fs.writeFile( studentsFile, JSON.stringify( db ), function( err ) {
                if ( err ) {
                    console.log( '[ERROR]: Unable to write to students file.', err );
                    res.redirect( '/?error=1' );
                }

                res.redirect( '/?success=1' );
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

server.get( '/export', function( req, res ) {
    res.render( 'export' );
});

server.post( '/export', function( req, res ) {
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
            csv += [
                student.firstname,
                student.lastname,
                student.phone,
                student.email,
                student.ssn,
                student.image
            ].join( ',' ) + '\n';
        });

        res.attachment( 'students.csv' );
        res.type( 'text/csv' );
        res.send( csv );
    });
});

// Error handlers
server.use( function( req, res, next ) {
    var err = new Error( 'Page Not Found' );
    err.status = 404;
    next( err );
});
server.use( function( err, req, res, next ) {
    err.status = err.status || 500;
    res.status( err.status );
    res.render( 'error', { status: err.status } );
});

// Start listening for HTTP requests
server.listen( port, function() {
    console.log( '[SERVER]: Started listening on port ' + port );
});

// Dependencies
var gulp    = require( 'gulp' ),
    sass    = require( 'gulp-ruby-sass' ),
    minify  = require( 'gulp-minify-css' );

// Sass task
gulp.task( 'sass', function() {
    return gulp.src( 'assets/sass/main.scss' )
        .pipe( sass({ style: 'compressed' }) )
        .pipe( gulp.dest( 'assets/css' ) )
        .pipe( minify() );
});

// Watch for changes
gulp.task( 'watch', function() {
    gulp.watch( 'assets/sass/**/*.scss', ['sass'] );
});
                                 
// Default task
gulp.task( 'default', ['sass'] );

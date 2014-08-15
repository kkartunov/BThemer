var pkg = require('./package.json'),
    gulp = require('gulp'),
    jade = require('gulp-jade'),
    less = require('gulp-less'),
    prefix = require('gulp-autoprefixer'),
    minCSS = require('gulp-minify-css'),
    concat = require('gulp-concat'),
    frep = require('gulp-frep'),
    uglify = require('gulp-uglify'),
    webserver = require('gulp-webserver');


// Compile the index page.
gulp.task('jade', function(){
    gulp.src('./templates/index.jade')
    .pipe(jade({
        pretty: true,
        locals: {
            pkg: pkg
        }
    }))
    .pipe(gulp.dest('./'));
});
// Dev jade layout.
gulp.task('jade-dev', ['jade'], function(){
    var watcher = gulp.watch('./templates/**/*.jade', ['jade']);
    watcher.on('change', function(event){
        console.log('Changed:'+event.path);
    });
});


// Styles.
gulp.task('css', function(){
    gulp.src('./Less/style.less')
    .pipe(less())
    .pipe(prefix('last 2 versions'))
    .pipe(minCSS())
    .pipe(gulp.dest('./dist'));
});
// Dev Styles.
gulp.task('css-dev', ['css'], function(){
    var watcher = gulp.watch('./Less/style.less', ['css']);
    watcher.on('change', function(event){
        console.log('Changed:'+event.path);
    });
});

// Pack Bootstrap to a single file to save on HTTP requests when compiling.
gulp.task('BSpack', function(){
    gulp.src([
        './bower_components/bootstrap/less/**/*.less',
        '!./bower_components/bootstrap/less/bootstrap.less',
        '!./bower_components/bootstrap/less/theme.less',
        '!./bower_components/bootstrap/less/mixins.less',
    ])
    .pipe(concat('bs_pack.less'))
    .pipe(frep([
        {
        pattern: /(\r\n|\n){2,}/g,
        replacement: '\n'
        }
    ]))
    .pipe(gulp.dest('./dist'));
});

//
gulp.task('js', function(){
    var deps = [
        'Js/less/less.cnf.js',
        'bower_components/less/dist/less-1.7.3.js',
        'bower_components/angular/angular.js',
        'bower_components/angular-sanitize/angular-sanitize.js',
        'bower_components/angular-bootstrap/ui-bootstrap.js',
        'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
        'bower_components/angular-notify/dist/angular-notify.js',
        'bower_components/FileSaver/FileSaver.js',
        'Js/modules/**/*.js',
        'Js/app.js'
    ];
    gulp.src(deps)
    .pipe(concat('app.js'))
    .pipe(uglify({mangle: false}))
    .pipe(gulp.dest('./dist'));
});
// Dev JS.
gulp.task('js-dev', ['js'], function(){
    var watcher = gulp.watch('./Js/**/*.js', ['js']);
    watcher.on('change', function(event){
        console.log('Changed:'+event.path);
    });
});
// JS for preview area.
gulp.task('js-preview', function(){
    var addons = [
        'bower_components/jquery/dist/jquery.js',
        'bower_components/bootstrap/dist/js/bootstrap.js'
    ];
    gulp.src(addons)
    .pipe(concat('preview_area.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});


// Make it in one shot.
gulp.task('make', ['css', 'BSpack', 'jade', 'js', 'js-preview']);
// Development mode.
gulp.task('dev', ['css-dev', 'jade-dev', 'js-dev']);
gulp.task('dev+web', ['dev'], function(){
    gulp.src('./')
    .pipe(webserver());
});
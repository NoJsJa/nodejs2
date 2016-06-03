var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
//flash是在session中存储信息的特定区域，信息写入Flash，下一次使用后即删除
var flash = require('connect-flash');
//multer上传文件
var multer = require('multer');

var routes = require('./routes/index');
var settings = require('./setting');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({
    /*上传文件所在的目录*/
    dest:'./public/images',
    /*修改用户名*/
    rename: function (fieldname,filename) {
        return filename;
    }
}));
app.use(session({
    secret: settings.cookieSecret,
    key: settings.db, //cookie name
    cookie:{maxAge:1000 * 60 * 60 * 24 * 30}, //30days
    store: new MongoStore({
        db:settings.db,
        host:settings.host,
        port:settings.port
    })
}));

routes(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.listen(3000, function(){
    console.log('Express server listening on port 3000');
});

module.exports = app;

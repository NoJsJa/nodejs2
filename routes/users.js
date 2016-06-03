
/* GET users listing. */


module.exports = function (app) {
    app.get('/users', function(req, res, next) {
        res.send('respond with a resource');
    });



};

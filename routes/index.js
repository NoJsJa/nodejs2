/*crypto用来生成散列值加密密码*/
var crypto = require('crypto');
var User = require('../models/user.js');
var Post = require('../models/post.js');
var Comment = require('../models/comments.js');
/* GET home page. */
module.exports = function (app) {

    /*Get方法是获取页面
    * Post方法是执行相应的页面请求*/

    /*获取首页*/
    app.get('/', function(req, res) {
        //获取所有文章
        Post.getAll(null,function(err,posts){
            if(err){
                posts = [];
            }
            /*Express的模板引擎常用的是ejs和jade。它预留了变量
            res.render()就是将我们的数据填充到模板后展示出完整的页面。*/
            res.render('index', {
                title: '主页',
                user:req.session.user,
                posts:posts,
                success:req.flash('success').toString(),
                error:req.flash('error').toString()
            });
        });
    });

    /*获取注册页面*/
    app.get('/reg', checkNotLogin);
    app.get('/reg', function(req, res){
        res.render('reg',{
            title:'注册',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    });

    /*执行注册逻辑*/
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        var name = req.body.name,
            password = req.body.password,
            password_re = req.body['password-repeat'];
        if(password != password_re){
            req.flash('error','两次输入的密码不一致！');
            return res.redirect('/reg');//返回注册页
        }
        //生成密码的MD5值
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name:req.body.name,
            password: password,
            email:req.body.email
        });
        //检测用户名是否已经存在
        User.get(newUser.name, function(err, user){
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }
            if(user){
                req.flash('error','用户已经存在！');
                res.redirect('/reg');
            }
            //如果不存在则更新用户
            newUser.save(function (err, user) {
               if(err){
                   req.flash('error', err);
                   res.redirect('/reg');
               }
               //session中存储用户名
               req.session.user = user;
               req.flash('success', '注册成功！');
                //注册成功返回主页
               res.redirect('/');
            });
        });
    });

    /*获取登录页面*/
    app.get('/login',checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    });

    /*执行登录逻辑*/
    app.post('/login',checkNotLogin);
    app.post('/login', function (req, res) {
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        User.get(req.body.name, function(err, user){
           if(!user) {
               req.flash('error', '用户不存在！');
               res.redirect('/login');
           }
           if(user.password != password){
               req.flash('error', '密码错误！');
               req.redirect('/login');
           }
            //登录成功
           req.session.user = user;
           req.flash('success','登陆成功！');
           res.redirect('/');
        });
    });

    //进入发表页面
    app.get('/post',checkLogin);
    app.get('/post',function(req, res){
        res.render('post', {
            title: '发表',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    });

    //发表文章
    app.post('/post',checkLogin);
    app.post('/post', function (req, res) {
        var currentUser = req.session.user,
            post = new Post(currentUser.name,req.body.title,req.body.post);
        post.save(function (err) {
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }
            //发表成功跳转到主页
            req.flash('success','发布成功！');
            res.redirect('/');
        });
    });

    //上传文件
    app.get('/upload',checkLogin);  //中间件
    app.get('/upload', function (req,res) {
        res.render('upload',{
            title:'文件上传',
            user:req.session.user,
            success:req.flash('success').toString(),
            error:req.flash('error').toString()
        });
    });

    app.post('/upload',checkLogin);
    app.post('/upload', function (req,res) {
        req.flash('success','文件上传成功！');
        res.redirect('/');
    });

    /*获取一个人的文章*/
    app.get('/u/:name', function (req,res) {
        //检查用户是否存在
        User.get(req.params.name,function(err,user){
            if(!user){
               req.flash('error',err);
               return res.redirect('/');
            }
            //查询并返回该用户的所有文章
            Post.getAll(user.name,function(err,posts){
                if(err){
                    req.flash('error',err);
                    res.redirect('/');
                }
                res.render('user',{
                    title:user.name,
                    posts:posts,
                    user:req.session.user,
                    error:req.flash('error').toString(),
                    success:req.flash('success').toString()
                });
            });

        });
    });

    /*获取文章*/
    app.get('/u/:name/:day/:title', function (req,res) {
        Post.getOne(req.params.name,req.params.day,req.params.title, function (err,post) {
            if(err){
                req.flash('error',err);
                return res.redirect('/');
            }
            res.render('article',{
                title:req.params.title,
                post:post,
                user:req.session.user,
                success:req.flash('success').toString(),
                error:req.flash('error').toString()
            });
        });
    });

    /*发表留言*/
    app.post('/u/:name/:day/:title', function (req,res) {
       var date = new Date(),
           time = date.getFullYear() + "-" + (date.getMonth() + 1) + date.getDay() +
                   " " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0"+date.getMinutes() :date.getMinutes());
       /*留言信息*/
        var comment = {
            /*区别于params(请求参数)*/
          name:req.body.name,
            email:req.body.email,
            website:req.body.website,
            time:time,
            content:req.body.content
        };
        //创建留言对象
        var newComment = new Comment(req.params.name,req.params.day,req.params.title,comment);
        //留言并返回
        newComment.save(function (err) {
            if(err){
                req.flash('error',err);
                res.redirect('back');
            }
            req.flash('success',"留言成功！");
            res.redirect('back');
        });
    });

    /*编辑文章*/
    app.get('/edit/:name/:day/:title',checkLogin);
    app.get('/edit/:name/:day/:title', function (req,res) {
        var currentUser = req.session.user;
        Post.edit(currentUser.name,req.params.day,req.params.title, function (err,post){
           if(err){
               req.flash('error',err);
               return res.redirect('back');
           }
            res.render('edit',{
               title:'编辑',
                post:post,
                user:req.session.user,
                success:req.flash('success').toString(),
                error:req.flash('error').toString()
            });
        });
    });

    //修改文章
    app.post('/edit/:name/:day/:title');
    app.post('/edit/:name/:day/:title', function (req,res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name,req.params.day,req.params.title,req.body.post ,function(err){
           var url = encodeURI('/u/'+req.params.name + '/' + req.params.day + '/'+req.params.title);
            if(err){
                req.flash('error',err);
                /*出错返回文章页面*/
                return res.redirect(url);
            }
            req.flash('success','修改成功！');
            res.redirect(url);
        });
    });

    /*删除文章*/
    app.get('/remove/:name/:day/:title',checkLogin);
    app.get('/remove/:name/:day/:title', function (req,res) {
       var currentUser = req.session.user;
        Post.remove(currentUser.name,req.params.day,req.params.title, function (err) {
           if(err){
               req.flash('error',err);
               return req.redirect('/back');
           }
            req.flash('success','删除成功！');
            res.redirect('/');
        });
    });

    /*注销账号*/
    app.get('/logout',checkLogin);
    app.get('/logout', function(req, res){
        req.session.user = null;
        req.flash('success','登出成功！');
        res.redirect('/');
    });

    //以下两个函数用来检测是否登录，并通过next()转移控制权
    function checkLogin(req,res,next){
        if(!req.session.user){
            req.flash('error','未登录！');
            res.redirect('/login');
        }
        next();
    }

    function checkNotLogin(req,res,next){
        if(req.session.user){
            req.flash('error','已登录！');
            //返回之前登录的界面
            res.redirect('back');
        }
        next();
    }
};


var mongodb = require('./db');
var markdown = require('markdown').markdown;

/*相当于一个构造器*/
function Post(name, title, post){
    this.name = name;
    this.title = title;
    this.post = post;
}

module.exports = Post;

//存储一篇文章以及相关信息
Post.prototype.save = function(callback){
    var date = new Date();
    //存储各种时间格式，方便以后扩展
    var time = {
        date:date,
        year:date.getFullYear(),
        month:date.getFullYear() + "-" + (date.getMonth() + 1),
        day:date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate()),
        minute:date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate()) + " " + date.getHours()
        + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };
    //要存入数据库的文档
    var post = {
        name:this.name,
        time:time,
        title:this.title,
        post:this.post,
        comments:[]
    };
    //打开数据库
    mongodb.open(function (err,db) {
        if(err){
           return callback(err);
        }
        //读取posts集合
        db.collection('posts', function (err,collection) {

            if(err){
               mongodb.close();
               return callback(err);
            }
            //将文档插入posts集合
            collection.insert(post,{safe:true}, function (err) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null);
            });

        });

    });

};

//读取文章以及相关信息
Post.getAll = function (name,callback) {

    //打开数据库
    mongodb.open(function(err,db){

        if(err){
           return callback(err);
        }
        //读取posts集合
        db.collection('posts',function(err,collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            //查询限制对象
            var query = {};
            if(name){
                //如果name = null,则不限制
                query.name = name;
            }
            //根据query对象查询文章
            collection.find(query).sort({
                time:-1
                /*多个对象读取成数组对象*/
            }).toArray(function(err, docs){
                mongodb.close();
                if(err){
                    return callback(err);
                }
                docs.forEach(function (doc) {
                    doc.post = markdown.toHTML(doc.post);
                });
                //以数组形式返回查询的结果
                callback(null,docs);
            });
        });
    });
};

//筛选文章
Post.getOne = function (name,day,title,callback) {
    mongodb.open(function (err,db) {
        if(err){
           return callback(err);
        }
        //读取posts
        db.collection('posts', function (err,collection) {
            if(err){
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "name":name,
                "time.day":day,
                "title":title
            }, function (err,doc) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                doc.post = markdown.toHTML(doc.post);
                //doc是一个查询后生成的对象
                if(doc.comments){

                    doc.comments.forEach(function (comment) {
                       comment.content = markdown.toHTML(comment.content);
                    });
                }

                /*返回查询的文章*/
                callback(null,doc);
            });
        });

    });
}

//返回原始发表的内容
Post.edit = function (name,day,title,callback) {
    mongodb.open(function (err,db) {
        if(err){
            return callback(err);
        }
        //读取posts集合
        db.collection('posts',function(err,collection){
            if(err){
               mongodb.close();
               return callback(err);
            }
            //根据用户名、发表日期和文章名进行查询
            collection.findOne({
                "name":name,
                "time.day":day,
                "title":title
            }, function (err,doc) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                return callback(null,doc);
            });

        });
    })
}

//更新文章和相关信息
Post.update = function (name,day,title,post,callback) {
    mongodb.open(function (err,db) {
       if(err){
           return callback(err);
       }
        //读取posts集合
        db.collection('posts',function(err,collection){
            if(err){
                mongodb.close();
                return callback(err);
            }
            //更新文章内容
            collection.update({
                "name":name,
                "time.day":day,
                "title":title
            },{
                $set:{post:post}
            }, function (err) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                /*更新成功返回空*/
                return callback(null);
            });
        });
    });
}

/*
删除一篇文章*/
Post.remove = function (name,day,title,callback) {
    mongodb.open(function(err,db){
       if(err){
           return callback(err);
       }
        db.collection('posts', function (err,collection) {
           if(err){
               mongodb.close();
               return callback(err);
           }
            //根据条件查找文章并删除
            collection.remove({
                "name":name,
                "time.day":day,
                "title":title
            },{
                w:1
            }, function (err) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                return callback(null);
            });
        });
    });
}

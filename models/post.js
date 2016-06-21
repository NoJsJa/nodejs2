var mongodb = require('./db');
/*var markdown = require('markdown').markdown;*/

/*相当于一个构造器*/
function Post(name,head,title, post,tags){
    this.name = name;
    this.head = head;
    this.title = title;
    this.post = post;
    this.tags = tags;
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
        head:this.head,
        time:time,
        tags:this.tags,
        title:this.title,
        post:this.post,
        comments:[],
        reprint_info:{},
        pv:0
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
Post.getTen = function (name,page,callback) {

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
            //使用count返回特定查询的文档数目total
            collection.count(query, function (err,total) {
               //根据query对象进行查询，并跳过前面(page - 1) * 10条结果，返回之后的10个结果
                collection.find(query,{
                    skip:(page - 1) * 10,
                    limit:10
                }).sort({
                    time:-1
                }).toArray(function (err,docs) {
                    mongodb.close();
                    if(err){
                        return callback(err);
                    }
                   /* //解析markdown为html
                    docs.forEach(function (doc) {
                       doc.post = markdown.toHTML(doc.post);
                    });*/

                     callback(null,docs,total);
                });
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
                if(err){
                    return callback(err);
                }
                //增加文章的访问统计
                if(doc){
                    collection.update({
                        "name":name,
                        "title":title,
                        "time.day":day
                    },{
                        $inc:{'pv':1}
                    }, function (err) {
                       mongodb.close();
                        if(err){
                            return callback(err);
                       }
                    });
                }
               /* doc.post = markdown.toHTML(doc.post);
                //doc是一个查询后生成的对象
                if(doc.comments){

                    doc.comments.forEach(function (comment) {
                       comment.content = markdown.toHTML(comment.content);
                    });
                }*/

                /*返回查询的文章*/
                callback(null,doc);
            });
        });

    });
};

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
};

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
};

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
            //查询要删除的文档
            collection.findOne({
               "name":name,
                "time.day":day,
                "title":title
            }, function (err,doc) {
                if(err){
                    mongodb.close();
                    return callback(err);
                }
                //如果有reprint_from 信息，即该文章是转载来得，先保存下来reprint_from
                var reprint_from = "";
                if(doc.reprint_info.reprint_from){
                    reprint_from = doc.reprint_info.reprint_from;
                }
                if(reprint_from != ""){
                    //更新原文章所在的文档的reprint_to
                    collection.update({
                        "name":reprint_from.name,
                        "time.day":reprint_from.day,
                        "title":reprint_from.title
                    },{
                        $pull:{
                            "reprint_info.reprint_to":{
                                "name":name,
                                "day":day,
                                "title":title
                            }
                        }
                    }, function (err) {
                       if(err){
                           mongodb.close();
                           return callback(err);
                       }
                    });
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
    });
};

//返回所有文章的存档信息
Post.getArchive = function (callback) {
    mongodb.open(function (err,db) {
       if(err){
           return callback(err);
       }
        db.collection('post', function (err,collection) {
            if(err){
                mongodb.close();
                return callback(err);
            }
            //返回只包含name,time,title属性的文档组成的文档数组
            collection.find(
                {}, {
                    "name":1,
                    "time":1,
                    "title":1
                }).sort({
                tiem:-1
            }).toArray(function (err,docs) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null,docs);
            });
        });
    });
};

//获得所有标签信息
Post.getTags = function(callback){
    mongodb.open(function (err,db) {
       if(err){
           return callback(err);
       }
        db.collection('posts', function (err,collection) {
           if(err){
               mongodb.close();
               return callback(err);
           }
            //distinct用来找出给定键的所有不同值
            //有时候我们发行表文章的tags是一样的，这样避免获取了重复的标签
            collection.distinct('tags', function (err,docs) {
               mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null,docs);
            });
        });
    });
}

//返回含有标签的所有文章信息
Post.getTag = function(tag,callback){
    mongodb.open(function (err,db) {
       if(err){
           return callback(err);
       } 
        db.collection('posts', function (err,collection) {
           if(err){
               mongodb.close();
               return callback(err);
           } 
            //查询所有tags数组内包含的tag的文档
            //并返回只含有name\time\title组成的数组
            collection.find({
                "tags":tag
            },{
                "name":1,
                "time":1,
                "title":1
            }).sort({
                time:-1
            }).toArray(function (err,docs) {
                mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null,docs);
            });
        });
    });
};

//文章搜索:返回所有通过标题搜索的文章的信息
Post.search = function (keyword,callback) {
    mongodb.open(function (err,db) {
       if(err){
           return callback(err);
       }
        db.collection('posts', function (err,collection) {
           if(err){
               mongodb.close();
               return callback(err);
           }
            //不区分大小写
            var pattern = new RegExp(keyword,"i");
            collection.find({
                "title":pattern
            },{
                "name":1,
                "title":1,
                "time":1
            }).sort({
                time:-1
            }).toArray(function (err,docs) {
               mongodb.close();
                if(err){
                    return callback(err);
                }
                callback(null,docs);
            });
        });
    });
};

//文章转载
Post.reprint = function (reprint_from,reprint_to,callback) {
    mongodb.open(function (err,db) {
       if(err){
           return callback(err);
       }
        db.collection('posts', function (err,collection) {
           if(err){
               mongodb.close();
               return callback(err);
           }
            collection.findOne({
                "name":reprint_from.name,
                "time.day":reprint_from.day,
                "title":reprint_from.title
            }, function (err,doc) {
                if(err){
                    mongodb.close();
                    return callback(err);
                }
                var date = new Date();
                var time = {
                  date:date,
                    year:date.getFullYear(),
                    month:date.getFullYear() + "-" + (date.getMonth() + 1),
                    day:date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate()),
                    minute:date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() +
                        date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
                };

                //注意要删掉原来的id
                delete doc._id;

                doc.name = reprint_to.name;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title: "[转载]"+ doc.title;
                doc.comments = [];
                doc.reprint_info = {"reprint_from": reprint_from};
                doc.pv = 0;
                //更新被转载的源文档的信息
                collection.update({
                   "name":reprint_from.name,
                    "title":reprint_from.title,
                    "time.day":reprint_from.day
                },{
                    $push:{
                        "reprint_info.reprint_to":{
                            "name":doc.name,
                            "day":time.day,
                            "title":doc.title
                        }
                    }
                }, function (err) {
                    if(err){
                        mongodb.close();
                        return callback(err);
                    }
                    //将转载生成的副本修改后存入数据库，并返回存储后的文档
                    collection.insert(doc,{
                        safe:true
                    }, function (err,post) {
                        mongodb.close();
                        if(err){
                            return callback(err);
                        }
                        callback(null,post[0]);
                    });
                });
            });
        });
    });
};















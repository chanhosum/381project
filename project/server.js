var express = require('express');
var session = require('cookie-session');
var app = express();
app.set('view engine', 'ejs');
var fileUpload = require('express-fileupload');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var bodyParser = require('body-parser');


var mongourl = "mongodb://anson:anson@ds243325.mlab.com:43325/anson";

var SECRETKEY1 = 'vvvv1';
var SECRETKEY2 = 'vvvv2';

app.use(session({
    name: 'session',
    keys: [SECRETKEY1, SECRETKEY2]
}));
app.use(express.static(__dirname + '/public'));
app.use(fileUpload());
app.use(bodyParser.json());

app.listen(process.env.PORT || 8099);

app.get('/', function(req, res) {
    res.redirect('/login');
});

app.get('/login', function(req, res) {
    console.log("/login");
    console.log(req.session);
    if (req.session.userName) {
        res.redirect('/read');
    } else {
        res.status(200);
        res.render("login");
    }
});

app.get('/doCreate', function(req, res) {
    console.log("/doCreate");
    console.log(req.query.userName);
    console.log(req.query.pw);
    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err, null);
        console.log('Connected to MongoDB');
        createAccount(db, req.query.userName, req.query.pw, function(tf) {
            db.close();
            console.log('Disconnected MongoDB');
            res.status(200);
            res.render("doCreate", { okOrNot: tf });
        });
    });
});

app.get('/doLogin', function(req, res) {
    console.log("/doLogin");
    console.log(req.query.userName);
    console.log(req.query.pw);
    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err, null);
        console.log('Connected to MongoDB');
        login(db, req.query.userName, req.query.pw, function(tf) {
            db.close();
            console.log(tf);
            if (tf != "ok") {
                res.status(200);
                res.render("login", { fail: tf });
            } else {
                res.status(200);
                req.session.userName = req.query.userName;
                req.session.pw = req.query.pw;
                console.log('session created successfully');
                res.redirect('/read');
            }
        });
    });
});

app.get('/read', function(req, res) {
    console.log("/read");
    var sessionn = req.session.userName;
    if (!sessionn) {
        res.redirect('/login');
    } else {
          MongoClient.connect(mongourl, function(err,db) {
        assert.equal(err,null);
        console.log('Connected to MongoDB');
        findPhoto(db,{},{_id:1,name:1},function(result) {
        db.close();
        console.log('Disconnected MongoDB');
        console.log("session");
        console.log(req.session);
        res.status(200);
        res.render("read", { 
            userName: req.session.userName,
            p:result

        });

        })
        });
    }
});

app.get('/logout', function(req, res) {
    console.log("/logout");
    req.session.userName = null;
    req.session.pw = null;
    console.log("clear session");
    console.log(req.session);
    res.redirect('/login');
});

app.post('/api/restaurant/create', function(req, res) {
    console.log("/api/restaurant/create");
    console.log(req.body.username);
});

//-----------------------------------
app.get('/insert', function(req,res) {
  console.log("/insert");
  res.status(200);
  res.render("uploadtest");
});


app.post('/create', function(req, res) {
    console.log("/create");
    var borough = req.body.borough;
    var cuisine = req.body.cuisine;
    var building = req.body.building;
    var street = req.body.street;
    var zipcode = req.body.zipcode;
    var lat = req.body.lat;
    var lon = req.body.lon;
    console.log(lat + "," + lon);
    if (!req.files.photoToUpload) {
        req.files.photoToUpload = {};
        req.files.photoToUpload.name = "no.jpg";
        console.log("No picture");
    }

    var name = (req.body.name.length > 0) ? req.body.name : "";
    var mimetype = (req.files.photoToUpload.mimetype > 0) ? req.files.photoToUpload.mimetype : "";
    var filename = req.files.photoToUpload.name;
    var new_r = {};
    if (building || street || zipcode || lat || lon) {
        var address = {};
        if (req.body.building) address['building'] = req.body.building;
        if (req.body.street) address['street'] = req.body.street;
        if (req.body.zipcode) address['zipcode'] = req.body.zipcode;
        if (req.body.lon) address['lon'] = req.body.lon;
        if (req.body.lan) address['lat'] = req.body.lat;
        new_r['address'] = address;
    }
    console.log("username =" + req.session.userName);

    var grades = [];
    new_r['grades'] = grades;

    var image = {};
    new_r['name'] = name;
    new_r['borough'] = borough;
    new_r['cuisine'] = cuisine;
    new_r['mimetype'] = req.files.photoToUpload.mimetype;
    console.log("mimetype =" + mimetype);
    if (req.files.photoToUpload.mimetype) {
        new_r['image'] = new Buffer(req.files.photoToUpload.data).toString('base64');
    }
    new_r['lat'] = lat;
    new_r['lon'] = lon;
    new_r['owner'] = req.session.userName;


    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err, null);
        console.log('Connected to MongoDB');
        console.log('About to insert: ' + JSON.stringify(new_r));
        insertdata(db, new_r, function(result) {
            db.close();
            console.log('Disconnected MongoDB');
            res.status(200);
            res.render("doInsert", {
                okOrNot: result
            });
            if (result != "ok") {
                res.status(200);
                console.log("fail");
                //res.redirect('/login');
            } else {
                res.status(200);
                console.log("success");
                //res.redirect('/insert');
            }
        });
    });
});

app.get('/rate', function(req,res) {
  console.log('/rate');
      res.status(200);
      res.render("rating",{
          _id : req.query._id
                 
      });
  });

app.post('/rating', function(req,res) {
  console.log("/rating");
        var criteria = {};
      criteria['_id'] = ObjectID(req.query._id);
      console.log(criteria);

      console.log("score="+req.body.score);

      var re = /^([1-9]|10)$/;

      console.log(req.body.score.match(re));

      //Check the user rated or not

      MongoClient.connect(mongourl, function(err, db){
      assert.equal(err, null);
      console.log('Connected to MongoDB');


      var ranked_before = 0;

      findPhoto(db,criteria,{_id:1,grades:1},function(result) {
      console.log("grades ="+JSON.stringify(result[0].grades));

      for(i in result[0].grades){
          console.log("The user made comment already "+result[0].grades[i].user);
          console.log("==================="+req.session.userName);
          if(result[0].grades[i].user==req.session.userName){
              ranked_before = 1;
          }
      }  
    
     console.log("ranked_before= "+ranked_before);




      if(!req.body.score.match(re)){
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.write("<html><head>");
          res.write("<title>Error</title>");
          res.write("</head>");
          res.write("<body>");
          res.write("<H1>score > 0 and score <= 10</H1>");
          res.write("<a href='/read'><button>Home</button></a>");
          res.write("</body>")
          res.end("</html>");
          db.close();
          console.log('Disconnected MongoDB');


      }
        else if(ranked_before){
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.write("<html><head>");
          res.write("<title>Error</title>");
          res.write("</head>");
          res.write("<body>");
          res.write("<H1>You have already rated</H1>");
          res.write("<a href='/read'><button>Home</button></a>");
          res.write("</body>")
          res.end("</html>");
          db.close();
          console.log('Disconnected MongoDB');
        }


            else{




      rating(db,criteria,req.session.userName,req.body.score, function(result){
          db.close();
          console.log('Disconnected MongoDB');

                    res.writeHead(200, {'Content-Type': 'text/html'});
          res.write("<html><head>");
          res.write("<title>Success</title>");
          res.write("</head>");
          res.write("<body>");
          res.write("<H1>Success</H1>");
          res.write("<a href='/read'><button>Home</button></a>");
          res.write("</body>")
          res.end("</html>");


      });
        }

        })
    });//end mongo


  
});







//////////////////////
app.get('/show', function(req,res) {
  console.log('/show');
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findPhoto(db,{},{_id:1,name:1},function(result) {
      db.close();
      console.log('Disconnected MongoDB');
      res.status(200);
      res.render("listtest",{p:result});
    })
  });
});

app.get('/display', function(req,res) {
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    console.log(criteria)
    findPhoto(db,criteria,{},function(photo) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + photo.length);
      if (req.body.lat==""||req.body.lon==""){
        var lat = -1;
        var lon = -1;
      }
      console.log(lat,lon);      
      res.status(200);
      res.render("phototest",{p:photo[0],lat:lat,lon:lon});
    });
  });
});

app.get('/delete', function(req, res) {
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    console.log(criteria)
   MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    db.collection('restaurants').findOne(criteria, function(err,result){
      console.log(result);
       if(result.owner==req.session.userName){
    db.collection('restaurants').remove(criteria, function(err){
        if (err) {
            console.log(err)
        }
        else {
           return res.send("Removed");
        }
    });
       }
else{return res.send("You are not the creater");}
     });
      });
});


////change
app.get('/edit', function(req,res) {
        console.log('/edit');
        MongoClient.connect(mongourl, function(err,db) {
        assert.equal(err,null);
        console.log('Connected to MongoDB');
        var criteria = {};
        criteria['_id'] = ObjectID(req.query._id);
        //console.log(criteria);

        finddata(db,criteria,{},function(photo) {
        db.close();
        console.log('Disconnected MongoDB');
      
        res.status(200);
        
         //console.log(photo.image);
        res.render("change",{
            _id : req.query._id, p: photo

        });
      });
      });
      });

  
app.post('/change', function(req,res) {
  console.log('/change');
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    //console.log(criteria);
    var mimetype = (req.files.image.mimetype > 0) ? req.files.image.mimetype : "";
    var v = {};
    v['name']=req.body.name;
    v['borough']=req.body.borough;
    v['cuisine']=req.body.cuisine;
    v['street']=req.body.street;
    v['building']=req.body.building;
    v['zipcode']=req.body.zipcode;
    v['lon']=req.body.lon;
    v['lat']=req.body.lat;
    v['mimetype'] = req.files.image.mimetype;
    if (req.files.image.mimetype){
    v['image']=new Buffer(req.files.image.data).toString('base64');
    }
    console.log(JSON.stringify(v));
    //console.log(req.body.image);
    change(db, criteria, v, function(result) {
      db.close();
      console.log('Disconnected MongoDB');
      res.status(200);
      res.redirect('/read');
    });


  });
});

function change(db, criteria, edit_data, callback) {
    db.collection('restaurants').updateOne(
        criteria, {
            $set: {
                name: edit_data.name,
                borough: edit_data.borough, 
                cuisine: edit_data.cuisine,
                "address.street": edit_data.street,
                "address.building": edit_data.building,
                "address.zipcode": edit_data.zipcode,
                "address.lat": edit_data.lat, 
                "address.lon": edit_data.lon,
                image: edit_data.image
            }
        },
        function(err, results) {
            //console.log(JSON.stringify(results));
            console.log(results);
            callback();

        });
}

function finddata(db,criteria,fields,callback) {
  var cursor = db.collection("restaurants").findOne(criteria, function(err, result){
    //console.log(result);
    callback(result);
  });
}

function findPhoto(db,criteria,fields,callback) {
  var cursor = db.collection("restaurants").find(criteria);
  var photos = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      photos.push(doc);
    } else {
      callback(photos);
    }
  });
}


////////////////////
function insertdata(db,r,callback) {
 
  if (r.owner != "" && r.name != "" ){
    db.collection('restaurants').findOne({name:r.name}, function(err, result){
      assert.equal(err, null);
      console.log(result);
      if (!result){
        console.log("no repeat");
        db.collection('restaurants').insertOne(r,function(err2,result) {
          assert.equal(err2,null);
          console.log(JSON.stringify(result));
          console.log("insert was successful!");
          callback("ok");
        })

      } else {
        console.log("repeated");
        callback("repeat");
      }
    });
  }else{
    console.log("null exist");
    callback("null");
  }

}


//--------------------------------------------
function createAccount(db, userName, pw, callback) {
    console.log(userName)
    console.log(pw)
    if (userName != "" && pw != "") {
        db.collection('account').findOne({ userName: userName }, function(err, doc) {
            assert.equal(err, null);
            console.log(doc);
            if (!doc) {
                console.log("no repeat");
                var createAccObj = {
                    userName: userName,
                    pw: pw
                }
                db.collection('account').insertOne(createAccObj, function(err2, doc2) {
                    assert.equal(err2, null);
                    console.log("insert ok");
                    callback("ok");
                })
            } else {
                console.log("repeated");
                callback("repeat");
            }
        });
    } else {
        console.log("null exist");
        callback("null");
    }
}

function login(db, userName, pw, callback) {
    db.collection('account').findOne({ userName: userName }, function(err, doc) {
        assert.equal(err, null);
        console.log(doc);
        if (doc) {
            if (pw == doc.pw) {
                callback("ok");
            } else {
                callback("wrong");
            }
        } else {
            callback("notExist");
        }
    });
}

function rating(db, criteria, user_given, score_given, callback) {
    db.collection('restaurants').updateOne(
        criteria, {
            $push: {
                grades: {
                    user: user_given,
                    score: score_given
                }
            }
        },
        function(err, results) {
            console.log(results);
            callback();

        });
}


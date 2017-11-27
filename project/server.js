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
var ExifImage = require('exif').ExifImage;

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
        console.log("session");
        console.log(req.session);
        res.status(200);
        res.render("read", { userName: req.session.userName });
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


app.post('/create', function(req,res) {
  console.log("/create");
  var restid = req.body.restid;
  var borough = req.body.borough;
  var cuisine = req.body.cuisine;

  var building = req.body.building;
  var street = req.body.street;
  var zipcode = req.body.zipcode;
  var coord = req.body.coord;
  var user = req.body.user;
  var score = req.body.score;
  if (!req.files.photoToUpload){
    req.files.photoToUpload ={};
    req.files.photoToUpload.name="no.jpg";
    console.log("No picture");
  }
  
  var owner = (req.body.owner.length > 0) ? req.body.owner : "";
  var name = (req.body.name.length > 0) ? req.body.name : "";
  var mimetype = (req.files.photoToUpload.mimetype > 0)? req.files.photoToUpload.mimetype:"";
  var filename = req.files.photoToUpload.name;
  //var image = new Buffer(req.files.photoToUpload).toString('base64');
  
  var new_r ={};
  if (building||street||zipcode||coord){
        var address = {};
        if (req.body.building)address['building'] = req.body.building;
        if (req.body.street)address['street'] = req.body.street;
        if (req.body.zipcode)address['zipcode'] = req.body.zipcode;
        if (req.body.coord)address['coord'] = req.body.coord;
        new_r['address'] = address;
  }
  if (user||score){
        var grades = {};
        if (req.body.user)grades['user'] = req.body.user;
        if (req.body.score)grades['score'] = req.body.score;
        new_r['grades'] = grades;
  }
  //console.log(uuid1);
  var exif={};
  var image={};
  image['image']=filename;

  try {
    new ExifImage(image, function(error, exifData) {
      if (error) {
        console.log('ExifImage: ' + error.message);
      }
      else {
        exif['image'] = exifData.image;
        exif['exif'] = exifData.exif;
        exif['gps'] = exifData.gps;
        //console.log('Exif: ' + JSON.stringify(exif));
      }
    })
  } catch (error) {}
  

  

    MongoClient.connect(mongourl, function(err, db){
      assert.equal(err, null);
      console.log('Connected to MongoDB');
      new_r['restid'] = restid;
      new_r['borough'] = borough;
      new_r['cuisine'] = cuisine;
      new_r['owner'] = owner;
      new_r['name'] = name;
      new_r['mimetype'] = mimetype;

      console.log("mimetype ="+mimetype);
      if (mimetype){
        new_r['image'] = req.files.photoToUpload;
      }
      //console.log(data);
      new_r['exif'] = exif;
      console.log("aaaaa"+JSON.stringify(req.files));
      //console.log('About to insert: ' + JSON.stringify(new_r));
      insertdata(db, new_r, function(result){
          db.close();
          console.log('Disconnected MongoDB');
          res.status(200);
          res.render("doInsert", { okOrNot: result });      
          if (result != "ok"){
            res.status(200);
            console.log("fail");
            //res.redirect('/login');
          }else{
            res.status(200);
            console.log("success");
            //res.redirect('/insert');
          }
      });
    });
  
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
    findPhoto(db,criteria,{},function(photo) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + photo.length);
      console.log('GPS = ' + JSON.stringify(photo[0].exif.gps));
      var lat = -1;
      var lon = -1;
      if (photo[0].exif.gps &&
          Object.keys(photo[0].exif.gps).length !== 0) {
        var lat = gpsDecimal(
          photo[0].exif.gps.GPSLatitudeRef,  // direction
          photo[0].exif.gps.GPSLatitude[0],  // degrees
          photo[0].exif.gps.GPSLatitude[1],  // minutes
          photo[0].exif.gps.GPSLatitude[2]  // seconds
        );
        var lon = gpsDecimal(
          photo[0].exif.gps.GPSLongitudeRef,
          photo[0].exif.gps.GPSLongitude[0],
          photo[0].exif.gps.GPSLongitude[1],
          photo[0].exif.gps.GPSLongitude[2]
        );
      }
      console.log(lat,lon);      
      res.status(200);
      res.render("phototest",{p:photo[0],lat:lat,lon:lon});
    });
  });
});

app.get('/map', function(req,res) {
  res.render('gmaptest.ejs',
             {lat:req.query.lat,lon:req.query.lon,name:req.query.name});
});

function gpsDecimal(direction,degrees,minutes,seconds) {
  var d = degrees + minutes / 60 + seconds / (60 * 60);
  return (direction === 'S' || direction === 'W') ? d *= -1 : d;
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
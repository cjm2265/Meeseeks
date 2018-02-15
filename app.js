//import necessary dependancies
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require("mongoose");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var passport = require("passport");

var config = require("./config/config");

var dbMod = require("./config/dbMod");
var dbAccess = require("./config/dbAccess")

require("./config/passport")(passport)


//set up mongo server
var mongoDB = config.mongoAddr;
mongoose.connect(mongoDB, {
	useMongoClient: true
});

//set up app
var app = express();
app.use(express.static(__dirname + "/view/externalFiles"));
app.use(cookieParser());
app.use(session({
	secret: "shrimplypibbles2"
}));
app.use(passport.initialize());
app.use(passport.session())
app.use(bodyParser.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded

//get requests
app.get("/", function(req, res){
	if(req.isAuthenticated())
		res.sendFile(__dirname + "/view/index.html");
	else
		res.redirect("/login")
})

app.get("/login", function(req, res){
	res.sendFile(__dirname + "/view/login.html")
})

app.get("/product", function(req, res){
	res.sendFile(__dirname + "/view/product.html");
})

app.get("/post", function(req, res){
	res.sendFile(__dirname + "/view/post.html");
})

// app.get("/postComments", function(req, res){
// 	res.sendFile(__dirname + "/view/postComments.html")
// })

// app.get("/upvotePage", function(req, res){
// 	res.sendFile(__dirname + "/view/upvotePage.html")
// })

app.get("/getProductId", function(req, res){
	if(req.query.productName){
		dbAccess.getProduct(req.query.productName, function(err, product){
			if(err){
				console.log(err)
				res.status(500).send(err.description)
			}
			else
				res.send(product["_id"]);
		})
	} else{
		res.status(500).send("Oops, you need to tell me what the product name is")
	}
})

app.get("/bugReports", function(req, res){
	if(req.query.productId){
		dbAccess.getBugReports(req.query.productId, function(err, reports){
			if(err)
				res.status(500).send(err.description);
			else 
				res.send(reports)
		})
	} else{
		res.status(500).send("Oops, you have not provided me with a product ID")
	}
})

app.get("/comments", function(req, res){
	if(req.query.bugId){
		dbAccess.getComments(req.query.bugId, function(err, comments){
			if(err)
				res.status(500).send(err.description);
			else 
				res.send(comments)
		})
	} else
		res.status(500).send("Oops, you have not provided me with a bug ID")
})

app.get('/auth/facebook', passport.authenticate('facebook', { 
    scope : ['public_profile', 'email']
}));

app.get('/auth/facebook/callback',
	passport.authenticate('facebook', {
        successRedirect : '/',
        failureRedirect : '/login'
}));

app.get("/profile", function(req, res){
	if(req.isAuthenticated())
		res.send(req.user)
	else
		res.send("You are not logged in to facebook")
})

// app.get('/auth/google', passport.authenticate('google', { 
//     scope : ['profile', 'email']
// }));

// app.get('/auth/google/callback',
// 	passport.authenticate('google', {
//         successRedirect : '/',
//         failureRedirect : '/login'
// }));

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

//post requests

app.post("/bugreport", function(req, res){
	var description;
	var userId;
	var productId;
	var title;
	if(req.body.title && req.body.bugDescription && req.body.productId && req.isAuthenticated()){
		title = req.body.title;
		description = req.body.bugDescription;
		productId = req.body.productId
		userId = req.user["_id"];
		dbMod.addBug(title, description, userId, productId, function(bug){
			res.redirect("/product?productName=" + req.body.productName);
		})

	} else{
		res.status(500).send("I'm sorry, but you did not provide the proper details or you are not logged in");
	}
})

app.post("/comment", function(req, res){
	var description;
	var userId;
	var bugId;
	if(req.body.comment && req.body.bugId &&  req.isAuthenticated()){
		description = req.body.comment;
		userId = req.user["_id"];
		bugId = req.body.bugId
		dbMod.addComment(bugId, userId, description, function(comment){
			res.send("added comment");
		})

	} else{
		res.status(500).send("I'm sorry, but you did not provide the proper details or you are not logged in");
	}
});

app.post("/upvote-comment", function(req, res){
	var commentId;
	var userId;
	if(req.body.commentId && req.isAuthenticated()){
		commentId = req.body.commentId;
		userId = req.user["_id"];
		dbMod.upvoteComment(userId, commentId, function(err, comment){
			if(err)
				res.status(500).send("There was an error: " + err.message);
			else
				res.send("Upvoted Comment")
		})
	} else{
		res.status(500).send("I'm sorry, but you did not provide the proper details or you are not logged in");
	}
});

app.post("/upvote-bug", function(req, res){
	var bugId;
	var userId;
	if(req.body.bugId && req.isAuthenticated()){
		bugId = req.body.bugId;
		userId = req.user["_id"];
		dbMod.upvoteBug(userId, bugId, function(err, bug){
			if(err) 
				res.status(500).send("There was an error: " + err.message);
			else
				res.send("Upvoted Bug Report");
		})
	} else{
		res.status(500).send("I'm sorry, but you did not provide the proper details or you are not logged in");
	}
});

app.listen(8080, function(){
	console.log("server started")
})
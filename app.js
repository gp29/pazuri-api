'use strict';

//configurations
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const jsonResponse = require('./utils/json-response');
const errors = require('./utils/dz-errors');
const cors = require('cors');
const config = require('./config');

const mongoose = require('mongoose');
mongoose.connect(config.database_url, {useNewUrlParser: true, useUnifiedTopology:true, useCreateIndex:true}).then((result) => {
    console.log("Database connected successfully")
}).catch((error) => {
    console.log(error)
});

//routes
const routes = require('./routes/index');
const auth = require('./routes/auth');
const dashboard = require('./routes/dashboard');
const admin = require('./routes/admin');
const user = require('./routes/user');
const authority = require('./routes/authority');
const compliance = require('./routes/compliance');
const price = require('./routes/price');
const region = require('./routes/region');
const reminder = require('./routes/reminder');
const image = require('./routes/image');
const friend = require('./routes/friend');
const category = require('./routes/category');

//other configurations
const passport = require('passport');
const favicon = require('serve-favicon');
const multiparty = require('connect-multiparty');
const upload = require('express-fileupload');
const multipartyMiddleWare = multiparty();

//express configurations
const app = express();
app.use(favicon(path.join(__dirname, './public/img', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.use(multipartyMiddleWare);
const responseCodes = require('./utils/response-codes');

// import routes
app.use('/',routes);
app.use('/api/auth', auth);
app.use('/api/dashboard', dashboard);
app.use('/api/admin', admin);
app.use('/api/user', user);
app.use('/api/authority', authority);
app.use('/api/compliance', compliance);
app.use('/api/price', price);
app.use('/api/region', region);
app.use('/api/reminder', reminder);
app.use('/api/image', image);
app.use('/api/friend', friend);
app.use('/api/category', category);

app.use(upload());

var swaggerUi = require("swagger-ui-express"),
swaggerDocument = require("./swagger.json");

app.use("/api-swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
	console.log('\nError: No route found or Wrong method name');
	jsonResponse(res, errors("No route found or Wrong method name", responseCodes.Forbidden), null);
});

app.use((err, req, res) => {
	res.status(err.status || 500);
	res.render('error', {
	message: err.message,
		error: {}
	});
});

module.exports = app;
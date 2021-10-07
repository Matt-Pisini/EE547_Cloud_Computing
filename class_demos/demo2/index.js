

"use strict";

const express = require('express');
const app = express();

const uuid = require('uuid');
const qs = require('querystring');
const BodyParser = require('body-parser');

app.use(express.static('public'));

const listEndpoints = require('express-list-endpoints');
const PORT = 3000;

// app.use(preRequest);

// function preRequest (){
    
// }

app.get('/hello', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<html><body>Hello, ${}!</body></html>');
  res.end();
});

app.get('/greet', (req, res, next) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`<html><body>Hello, ${req.query.first_name} ${req.query.lst_name}</body></html>`);
    res.end();
    next();
});

// app.post('/greet', (req, res, next) => {
//     let body = '';
    
//     req.on('data', chunk => {
//         body += chunk;
//     });

//     req.on('end', () => {
//         body = qs.parse(body)
//         console.log(body);
//         res.writeHead(200, { 'Content-Type': 'text/html' });
//         res.write(`<html><body>Hello, ${req.query.first_name} ${req.query.lst_name}</body></html>`);
//         res.end();

//         next();
//     });

// });

app.post('/greet', async (req, res, next) => {
    const doc = {
      fname: req.query.first_name,
      lname: req.query.last_name,
      created_at: new Date()
    }
  
    try {
      const result = await mongoDb.collection('users').insertOne(doc);
  
      console.log(`1 document inserted -- _id:${result.insertedId}`);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(`<html> <body>Hello ${req.query.first_name} ${req.query.last_name} node.js!</body> </html>`);
      res.end();
      
      next();
    } catch(err) {
      return next(err);
    }
  });

let mongoDb;

const uri = `mongodb://192.168.0.18:27017?useUnifiedTopology=true`;
const MONGO_DB = 'demo3_db';
const { MongoClient } = require('mongodb');
var ObjectId = require('mongodb').ObjectId; //allows us to look up by ObjectID
MongoClient.connect(uri, (err, mongoConnect) => {  
  if (err) {
    throw(err);
  }

  mongoDb = mongoConnect.db(MONGO_DB);

  app.listen(PORT);
  console.log(`Server started, port ${PORT}`);
});
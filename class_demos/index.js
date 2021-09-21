

"use strict";

const express = require('express');
const app = express();

const uuid = require('uuid');

app.use(express.static('public'));

const listEndpoints = require('express-list-endpoints');
const PORT = 3000;

app.use(preRequest);

function preRequest (){
    
}

app.get('/hello', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<html><body>Hello, express!</body></html>');
  res.end();
});

app.get('/greet',
  (req, res, next) => {
    req.my_data = {
      start_at:   new Date(),
      request_id: uuid.v4()
    };
    next();
  },
  (req, res, next) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`<html><body>Hello, ${req.query.first_name} ${req.query.last_name}</body></html>`);
    res.end();
    next();
  },
  (req, res, next) => {
    console.log(`Request complete -- path:${req.path}, status:${res.statusCode}, id:${req.my_data.request_id}, duration:${new Date() - req.my_data.start_at}ms`);
    next();
  }
);

server.listen(3000);

console.log('server started, port 3000');
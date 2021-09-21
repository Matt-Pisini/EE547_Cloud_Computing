

"use strict";

const express = require('express');
const app = express();

const uuid = require('uuid');
const qs = require('querystring');
const BodyParser = require('body-parser');

app.use(express.static('public'));

const listEndpoints = require('express-list-endpoints');
const PORT = 3000;

app.use(preRequest);

function preRequest (){
    
}

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

app.post('/greet', (req, res, next) => {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk;
    });

    req.on('end', () => {
        body = qs.parse(body)
        console.log(body);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(`<html><body>Hello, ${req.query.first_name} ${req.query.lst_name}</body></html>`);
        res.end();

        next();
    });

});

server.listen(PORT);

console.log('server started, port 3000');
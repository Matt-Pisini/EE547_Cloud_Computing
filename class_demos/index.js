'use strict';

const http = require('http');

const server = http.createServer(function (req,res) {
    if (req.url = "/") {
        res.writeHead(200,{'Content-Type': 'text/html'});
        res.write('<html> <body> Hello, node.js!</body></html>');
        res.end();
    }
});

server.listen(3000);

console.log('server started, port 3000');
'use strict';

const express = require("express");
const app = express();

const fs = require('fs');

function createPlayer(req, res, next) {
    fs.writeFile('./data/player.json', 'test', function(err) {
        if(err) console.log(err);
        console.log('test > /data/player.json');
    });
    next();
}

function getPlayers(req,res,next) {
    try{
        let data = fs.readFileSync('./data/player.json','utf8');
        let players = JSON.parse(data);
        req.players = players.players;
        req.players.sort(function(a,b) {
            var nameA = a.name.toUpperCase();
            var nameB = b.name.toUpperCase();
            if (nameA < nameB) {return -1;}
            if (nameA > nameB) {return 1;}
            return 0;
        });
    } catch(err) {
        console.log(err)
    }    
    next();
}

app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.write('');
    res.end();
    next();
});

app.get('/player', getPlayers, (req,res,next) => {
    res.writeHead(200);
    res.write(JSON.stringify(req.players));
    res.end();
    next();
});

app.get('/player/:pid', (req,res,next) => {
    res.writeHead(200);
    console.log(req.params);
    res.write(JSON.stringify(req.params));
    res.end();
    next();
});

app.delete('/player/:pid', (req,res,next) => {
    res.writeHead(200);
    res.write('');
    res.end();
    next();
});

app.post('/player', (req,res,next) => {
    res.writeHead(200);
    res.write('');
    res.end();
    next();
});

app.listen(3000);

console.log('server started, port 3000');
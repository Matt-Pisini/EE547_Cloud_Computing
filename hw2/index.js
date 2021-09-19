'use strict';

const { json } = require("express");
const express = require("express");
const app = express();

const fs = require('fs');

// function reWriteFile(file_obj) {
//     try{
//         file_obj.update_at = new Date();
//         fs.writeFileSync('./data/player.json', JSON.stringify(file_obj));
//     }catch(err){
//         console.log(err);
//     }
// }
function reWriteFile(file_obj) {
    file_obj.update_at = new Date();
    fs.writeFile('./data/player.json', JSON.stringify(file_obj), err => {
        if(err){
            console.log(err);
        }
    })
}

// function openFile() {
//     try{
//         let data = fs.readFileSync('./data/player.json','utf8');
//         let json_file = JSON.parse(data);
//         return json_file;
//     } catch(err){
//         console.log(err);
//         let json_file = createFile();
//         return json_file; // return empty JSON object
//     }
// }

function openFile(next) {
    fs.readFile('./data/player.json','utf8', (err, data) => {
        if(err){
            console.log(err);
        }
        let json_file = JSON.parse(data);
        return json_file;
        next();
    })
}

function createFile() {
    try{
        let json_file = {"players":[], "update_at": new Date(),"create_at":new Date(),"version": 1.0};
        fs.writeFileSync('./data/player.json', JSON.stringify(json_file));
        return json_file;
    } catch(err){
        console.log(err);
    }
}

function getPlayers(next) {
    try{
        let players = openFile();
        players = players.players;
        players.sort(function(a,b) {
            var nameA = a.name.toUpperCase();
            var nameB = b.name.toUpperCase();
            if (nameA < nameB) {return -1;}
            if (nameA > nameB) {return 1;}
            return 0;
        });
        return players;
        next();
    } catch(err) {
        console.log(err);
        return undefined;
    }    
}

function getActivePlayers(next) {
    try {
        let players = getPlayers();
        const active_players = [];
        for(let i = 0; i < players.length; i++) {
            if(players[i].is_active == 1 || players[i].is_active == 't' || players[i].is_active == true) {
                active_players.push(players[i]);
            }
        }
        return active_players;
    } catch(err){
        console.log(err);
    }
    next();
}

function getPlayer(id) {
    try{
        let players = getPlayers();
        for(let i = 0; i < players.length; i++){
            if(players[i].pid == id){
                return players[i];
            }
        }
        return undefined;
    }catch(err){
        console.log(err);
    }
}

function deletePlayer(id) {
    try{
        let json_file = openFile();
        let file_obj = {
            players: json_file.players,
            update_at: json_file.update_at,
            create_at: json_file.create_at,
            version: json_file.version
        }
        for(let i = 0; i < file_obj.players.length; i++){
            if(file_obj.players[i].pid == id){
                let elem = file_obj.players.splice(i,1); //remove element from players array
            }
        }
        reWriteFile(file_obj);
    } catch(err){
        console.log(err);
    }
}

app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.write('');
    res.end();
    next();
});

app.get('/player', (req,res,next) => {
    let players = getActivePlayers(next);
    if(players == undefined){
        console.log("undefined");
    }
    res.writeHead(200);
    res.write(JSON.stringify(players));
    res.end();
    next();
});

app.get('/player/:pid', (req,res,next) => {
    let player = getPlayer(req.params.pid);
    if (player == undefined){
        res.writeHead(404);
        res.end();
    } 
    else{
        res.writeHead(200);
        res.write(JSON.stringify(player));
        res.end();
    }
    next();
});

app.delete('/player/:pid', (req,res,next) => {
    deletePlayer(req.params.pid);
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
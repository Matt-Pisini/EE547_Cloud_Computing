'use strict';

const { json } = require("express");
const express = require("express");
const fs = require('fs');
const app = express();

const PORT = 3000;
const HOST = 'localhost';

// ***************************** FILE WRITING **************************************
// Updates the player.json file when any changes occur
function reWriteFile(file_obj) {
    try{
        file_obj.update_at = new Date();
        fs.writeFileSync('./data/player.json', JSON.stringify(file_obj));
    }catch(err){
        console.log(err);
    }
}
// Attempts to open player.json file and return parsed JSON object
function openFile() {
    try{
        let data = fs.readFileSync('./data/player.json','utf8');
        let json_file = JSON.parse(data);
        return json_file;
    } catch(err){
        console.log(err);
        let json_file = createFile();
        return json_file; // return empty JSON object
    }
}
// Creates player.json file if it does not exist
function createFile() {
    try{
        let json_file = {"players":[], "update_at": new Date(),"create_at":new Date(),"version": 1.0};
        fs.writeFileSync('./data/player.json', JSON.stringify(json_file));
        return json_file;
    } catch(err){
        console.log(err);
    }
}
// *********************************************************************************


// ***************************** GET FUNCTIONS **************************************
// Returns JSON object of players
function getPlayers() {
    try{
        let players = openFile();
        players = players.players;
        players.sort(function(a,b) {
            var nameA = a.fname.toUpperCase();
            var nameB = b.fname.toUpperCase();
            if (nameA < nameB) {return -1;}
            if (nameA > nameB) {return 1;}
            return 0;
        });
        return players;
    } catch(err) {
        console.log(err);
        return undefined;
    }    
}
// Calls getPlayers() function and returns those with 'is_active'
function getActivePlayers() {
    try {
        let players = getPlayers();
        const active_players = [];
        for(let i = 0; i < players.length; i++) {
            if(players[i].is_active == 1 || players[i].is_active == 't' || players[i].is_active == true) {
                active_players.push(players[i]);
                // active_players.push(formatPlayer(players[i]));
            }
        }
        return active_players;
    } catch(err){
        console.log(err);
    }
}
// Takes PID as input and returns player object if it exists and undefined if it doesn't
function getPlayer(id) {
    try{
        let players = getPlayers();
        for(let i = 0; i < players.length; i++){
            if(players[i].pid == id){
                return formatPlayer(players[i]);
            }
        }
        return undefined;
    }catch(err){
        console.log(err);
    }
}
// *********************************************************************************

function formatPlayer(player){
    if(player.lname){
        let player_output = {
            pid: player.pid,
            name: player.fname + ' ' + player.lname,
            handed: player.handed,
            is_active: player.is_active,
            balance_usd: player.balance_usd
        }
        return player_output;
    }
    else {  //"lname" does not exist so dont add it to "name"
        let player_output = {
            pid: player.pid,
            name: player.fname,
            handed: player.handed,
            is_active: player.is_active,
            balance_usd: player.balance_usd
        }
        return player_output;
    }
}

// ***************************** DELETE FUNCTIONS ***********************************
// If player exists, deletes player from JSON object and rewrites file; else returns undefined.
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
                reWriteFile(file_obj);
                return elem;
            }
        }
        return undefined;
    } catch(err){
        console.log(err);
    }
}
// ********************************************************************************

// ***************************** POST FUNCTIONS ***********************************
function addPlayer(params){
    console.log(params);
    if(Object.keys(params).length == 0){ //Empty
        return 0;
    }
    else {
        if(params.handed.toLowerCase() != 'left' || params.handed.toLowerCase() != 'right' || params.handed.toLowerCase() != 'ambi'){
            return 0;
        }
        if(!/[^a-z]/i.test(params.fname) || !/[^a-z]/i.test(params.lname)){
            return 0;
        }
        

    }
}

function updatePlayer(id){
    console.log(id);
}
// ***********************************************************************************

// ***************************** EXPRESS ENDPOINTS ***********************************

// GET FUNCTIONS
app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.write('');
    res.end();
    next();
});

app.get('/player', (req,res,next) => {
    try{
        let players = getActivePlayers();
        if(players == undefined){
            console.log("undefined");
        }
        res.writeHead(200);
        res.write(JSON.stringify(players, null, 2));
        res.end();
    } catch(err){
        console.log(err);
    }
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
        res.write(JSON.stringify(player, null, 2));
        res.end();
    }
    next();
});

// DELETE FUNCTIONS
app.delete('/player/:pid', (req,res,next) => {
    let player = deletePlayer(req.params.pid);
    if(player == undefined){
        res.writeHead(404);
        res.end();
    }
    else{
        res.writeHead(200);
        res.redirect(`http://${HOST}:${PORT}/player`);
        res.end();
    }
    next();
});

// POST FUNCTIONS
app.post('/player', (req,res,next) => {
    let response = addPlayer(req.query);
    if(response){
        res.redirect(`http://${HOST}:${PORT}/player/`);
        res.end();
    }
    else{
        res.writeHead(422);
        res.end();
    }
    next();
});

app.post('/player/:pid', (req,res,next) => {
    console.log(req.query);
    updatePlayer(req.query);
    res.writeHead(200);
    res.write('');
    res.end();
    next();
});

// ***********************************************************************************

app.listen(`${PORT}`);

console.log('server started, port 3000');
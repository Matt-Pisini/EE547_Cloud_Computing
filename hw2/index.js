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
                // active_players.push(players[i]);
                active_players.push(formatPlayer(players[i]));
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
    // console.log(params);
    let invalid_fields = [];
    if(Object.keys(params).length == 0){ //Empty
        console.log("empty");
        //what is considered wrong for blank string
        // invalid_fields.push();
        return 0;
    }
    else {
        if(params.handed.toLowerCase() != 'left' && params.handed.toLowerCase() != 'right' && params.handed.toLowerCase() != 'ambi'){
            console.log("handed");
            invalid_fields.push("handed");
        }
        if(/[^a-z]/i.test(params.fname)){
            console.log("fname");
            invalid_fields.push("fname");
        }
        if(/[^a-z]/i.test(params.lname)){
            console.log("lname");
            invalid_fields.push("lname");
        }

        let balance_value = checkBalanceFormat(params.initial_balance_usd);
        console.log(balance_value);
        if (balance_value == undefined){
            invalid_fields.push("initial_balance_usd");
        }
        // let money = params.initial_balance_usd.split(".");
        // if(/[^0-9]/i.test(money[0])){
        //     console.log("balance_usd");
        //     invalid_fields.push("initial_balance_usd");
        // }
        // if(money[1] != undefined){
        //     if(money[1].length > 2){
        //         invalid_fields.push("initial_balance_usd");
        //     }
        //     else if (/[^0-9]/i.test(money[1])){
        //         invalid_fields.push("initial_balance_usd");
        //     }
        // }

        if(invalid_fields.length > 0){ //there was some error
            return invalid_fields;
        }

        // //format initial_balance_usd
        // let balance = 0;
        // if(money[1] == undefined){
        //     balance = money[0] + ".00";
        // }
        // else if (money[1].length == 1){
        //     balance = money[0] + "." + money[1] + "0";
        // }
        // else {
        //     balance = money[0] + "." + money[1];
        // }
        
        let new_player = {
            pid: 10,            //how to add pid??
            fname: params.fname,
            lname: params.lname,
            handed: params.handed,
            is_active: params.is_active,
            balance_usd: balance_value
        }
        let json_file = openFile();
        json_file.players.push(new_player);
        reWriteFile(json_file);
        return invalid_fields;

    }
}

function updatePlayer(id){
    console.log(id);
}
// *********************************************************************************

// ***************************** OTHER FUNCTIONS ***********************************

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

function checkBalanceFormat(balance){

    let money = balance.split(".");
    if(/[^0-9]/i.test(money[0])){
        console.log("balance_usd");
        return undefined
    }
    if(money[1] != undefined){
        if(money[1].length > 2){
            return undefined;
        }
        else if (/[^0-9]/i.test(money[1])){
            return undefined;
        }
    }

    //format initial_balance_usd
    let balance_value = 0;
    if(money[1] == undefined){
        balance_value = money[0] + ".00";
    }
    else if (money[1].length == 1){
        balance_value = money[0] + "." + money[1] + "0";
    }
    else {
        balance_value = money[0] + "." + money[1];
    }
    return balance_value;
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
        res.redirect(303, `http://${HOST}:${PORT}/player`);
        res.end();
    }
    next();
});

// POST FUNCTIONS
app.post('/player', (req,res,next) => {
    let response = addPlayer(req.query);
    if(response.length == 0){
        res.redirect(303, `http://${HOST}:${PORT}/player/`);
        res.end();
    }
    else{
        res.writeHead(422);
        res.write(response);
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
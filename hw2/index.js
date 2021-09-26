'use strict';

const { json } = require("express");
const express = require("express");
const fs = require('fs');
const app = express();

const PORT = 3000;
const HOST = 'localhost';


let next_pid = getStartingPID();
console.log(`NEXT PID: ${next_pid}`);

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
        let json_file = createFile();
        return json_file; // return empty JSON object
    }
}
// Creates player.json file if it does not exist
function createFile() {
    try{
        let json_file = {"players":[], "update_at": new Date(),"create_at":new Date(),"version": "1.0"};
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
            // if(players[i].is_active == 1 || players[i].is_active == 't' || players[i].is_active == true) {
            if(players[i].is_active == true) {
                // active_players.push(players[i]);
                active_players.push(formatPlayerOutput(players[i]));
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
                return formatPlayerOutput(players[i]);
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
        let players = json_file.players;
        for(let i = 0; i < players.length; i++){
            if(players[i].pid == id){
                let elem = players.splice(i,1); //remove element from players array
                reWriteFile(json_file);
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
    let invalid_fields = [];
    // Check handedness
    if(params.handed == undefined){
        console.log("handed");
        invalid_fields.push("handed");
    }
    else if(params.handed.toLowerCase() != 'left' && params.handed.toLowerCase() != 'right' && params.handed.toLowerCase() != 'ambi'){
        console.log("handed");
        invalid_fields.push("handed");
    }
    // Check first name
    if(params.fname == undefined){
        console.log("fname");
        invalid_fields.push("fname");
    }
    else if(!validateName(params.fname) || params.fname == ""){
        console.log("fname");
        invalid_fields.push("fname");
    }

    // Check last name (can be blank)
    if(!validateName(params.lname)){
        console.log("lname");
        invalid_fields.push("lname");
    }
    
    // Check initial Balance
    if (!validateBalanceInput(params.initial_balance_usd) || params.initial_balance_usd == ""){
        invalid_fields.push("initial_balance_usd");
    }

    // Invalid Fields
    if(invalid_fields.length > 0){ 
        return invalid_fields;
    }

    let new_player = formatNewPlayerData(params);
    let json_file = openFile();
    json_file.players.push(new_player);
    reWriteFile(json_file);
    next_pid++; //do last to ensure no errors occurred
    return invalid_fields;

}

function updatePlayer(id, query){
    let active = 0;
    if(query.active == 1 || query.active.toLowerCase() == "t" || query.active.toLowerCase() == "true"){
        active = true;
    }
    else if(query.active == 0 || query.active.toLowerCase() == "f" || query.active.toLowerCase() == "false"){
        active = false;
    }
    else{
        console.log("ambiguous input for 'is_active'");
        return 0;
    }

    let name_change_flag = 0;
    if(query.lname != undefined){
        if(validateName(query.lname)){
            name_change_flag = 1;
        }
        else{
            return 0; //invalid lname field
        }
    }
    let json_file = openFile();
    for(let i = 0; i < json_file.players.length; i++){
        if(json_file.players[i].pid == id) {
            json_file.players[i].is_active = active;
            if (name_change_flag){
                json_file.players[i].lname = query.lname;
            }
            reWriteFile(json_file);
            return 1;
        }
    }
    return 0;
}

function updatePlayerBalance(id, query){
    if(!validateBalanceInput(query.amount_usd) || query.amount_usd == ""){
        return 0;
    }
    let new_balance = formatBalanceData(query.amount_usd)
    let old_balance = '0.00';
    let json_file = openFile();
    for(let i = 0; i < json_file.players.length; i++){
        if(json_file.players[i].pid == id) {
            old_balance = json_file.players[i].balance_usd;
            json_file.players[i].balance_usd = new_balance;
            reWriteFile(json_file);
            let player_balance = {
                old_balance_usd: old_balance,
                new_balance_usd: new_balance
            };
            return player_balance;
        }
    }
    return undefined;
}
// *********************************************************************************

// ***************************** FORMAT FUNCTIONS ***********************************
function formatNewPlayerData(params){

    let hand = '';
    if(params.handed.toLowerCase() == "left"){
        hand = "L";
    }
    else if(params.handed.toLowerCase() == "right"){
        hand = "R";
    }
    else{
        hand = "A";
    }

    let balance_value = formatBalanceData(params.initial_balance_usd);

    let new_player = {
        pid: next_pid,            
        fname: params.fname,
        lname: params.lname,
        handed: hand,
        is_active: true,
        balance_usd: balance_value
    }
    
    return new_player;
}

function formatPlayerOutput(player){
    let hand = '';
    if(player.handed == "L"){
        hand = "left";
    }
    else if(player.handed == "R"){
        hand = "right";
    }
    else{
        hand = "ambi";
    }

    let name = '';
    if(player.lname){
        name = player.fname + ' ' + player.lname;
    }
    else {  
        name = player.fname;
    }

    let player_output = {
        pid: player.pid,
        name: name,
        handed: hand,
        is_active: player.is_active,
        balance_usd: player.balance_usd
    }

    return player_output;
}

function formatBalanceData(balance){
    let money = balance.split(".");
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

// ***************************** OTHER FUNCTIONS ***********************************

function validateBalanceInput(balance){
    if(balance == undefined){
        return 0;
    }
    let money = balance.split(".");
    if(/[^0-9]/i.test(money[0])){
        return 0;
    }
    if(money[1] != undefined){
        if(money[1].length > 2){
            return 0;
        }
        else if (/[^0-9]/i.test(money[1])){
            return 0;
        }
    }
    return 1;
}

function validateName(name){
    if(/[^a-z]/i.test(name)){
        return 0;
    }
    return 1;
}

function getStartingPID(){
    try {
        let initial_players = getPlayers();
        if (initial_players.length == 0){
            return 1; //start at index 1 bc no players are in JOSN file
        }
        return Math.max(...initial_players.map(({pid}) => pid)) + 1;
    } catch(err){
        console.log(err);
    }
    
}
// function verifyPlayerExists(id){
//     let json_file = openFile();
//     for(let i = 0; i < json_file.players.length; i++){
//         if(json_file.players[i].pid == id) {
//                 return 1;
//         }
//     }
//     return 0;
// }

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
    console.log("here");
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
        res.redirect(303, `http://${HOST}:${PORT}/player`);
        res.end();
    }
    next();
});

// POST FUNCTIONS
app.post('/player', (req,res,next) => {
    let response = addPlayer(req.query);
    if(response.length == 0){
        res.redirect(303, `http://${HOST}:${PORT}/player`);
        // res.redirect(303, '/');
        res.end();
    }
    else{
        res.writeHead(422);
        res.write("invalid fields: " + response.join(", "));
        res.end();
    }
    next();
});

app.post('/player/:pid', (req,res,next) => {
    let status = updatePlayer(req.params.pid, req.query);
    if(status){
        res.redirect(303, `http://${HOST}:${PORT}/player/${req.params.pid}`);
        res.end();
    }
    else{
        res.writeHead(404);
        res.end();
    }
    next();
});

app.post('/deposit/player/:pid', (req,res,next) => {
    let status = updatePlayerBalance(req.params.pid, req.query);
    if(status == 0){
        res.writeHead(400);
        res.end();
    }
    else if(status == undefined)
    {
        res.writeHead(404);
        res.end();
    }
    else{
        res.writeHead(200);
        res.write(JSON.stringify(status,null,2));
        res.end();
    }
    next();
});

// ***********************************************************************************

app.listen(`${PORT}`);

console.log('server started, port 3000');
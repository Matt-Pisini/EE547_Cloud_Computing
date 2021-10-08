'use strict';

const { json } = require("express");
const express = require("express");
const fs = require('fs');
const { exit } = require("process");
const app = express();

const PORT = 3000;
const MONGO_HOST = '192.168.0.18';
const DATA_PATH = './data/player.json';
const MONGO_DATA_PATH = './config/mongo.json';


// ***************************** FILE WRITING **************************************
// Updates the player.json file when any changes occur

function reWriteFile(file_obj) {
    try{
        file_obj.updated_at = new Date();
        fs.writeFileSync(DATA_PATH, JSON.stringify(file_obj));
    }catch(err){
        console.log(err);
    }
}
// Attempts to open player.json file and return parsed JSON object
function openFile() {
    try{
        let data = fs.readFileSync(DATA_PATH,'utf8');
        let json_file = JSON.parse(data);
        return json_file;
    } catch(err){
        // console.log(err);
        let json_file = createFile();
        return json_file; // return empty JSON object
    }
}
// Creates player.json file if it does not exist
function createFile() {
    try{
        let json_file = {"players":[], "updated_at": new Date(),"created_at":new Date(),"version": "1.0"};
        fs.writeFileSync(DATA_PATH, JSON.stringify(json_file));
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
        return alphabetizePlayers(players);
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
            if(players[i].is_active == true) {
                active_players.push(decor.player(players[i]));
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
                return decor.player(players[i]);
            }
        }
        return undefined;
    }catch(err){
        console.log(err);
    }
}
// *********************************************************************************

// ***************************** POST FUNCTIONS ***********************************
class Post {
    new_player(params){
        let invalid_fields = [];
        let new_player = {};
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
        else if(!v.name(params.fname) || params.fname == ""){
            console.log("fname");
            invalid_fields.push("fname");
        }
    
        // Check last name (can be blank)
        if(!v.name(params.lname)){
            console.log("lname");
            invalid_fields.push("lname");
        }
        
        // Check initial Balance
        if (!v.balance(params.initial_balance_usd)){
            invalid_fields.push("initial_balance_usd");
        }
    
        // Invalid Fields
        if(invalid_fields.length > 0){ 
            return {invalid_fields, new_player};
        }
    
        new_player = form.player(params);
        // let json_file = openFile();
        // json_file.players.push(new_player);
        // reWriteFile(json_file);
        // next_pid++; //do last to ensure no errors occurred
        return {invalid_fields,new_player};
    }

    update_player(id, query){
        let updates = {};

        if( (query.active != undefined) && v.active(query.active) ){
            updates.is_active = form.active(query.active);
        }
       
        if( (query.lname != undefined) && v.name(query.lname)){
            updates.lname = query.lname;
        }

        //either nothing supplied or something invalid
        if(Object.keys(updates).length == 0){
            return updates;
        }
        else{
            return updates;
        }
    }

    update_balance(id, query){
        if(!v.balance(query.amount_usd)){
            return 0;
        }
        let new_balance = decor.balance(query.amount_usd);
        let old_balance = 0.00;
        let json_file = openFile();
        for(let i = 0; i < json_file.players.length; i++){
            if(json_file.players[i].pid == id) {
                old_balance = json_file.players[i].balance_usd;
                json_file.players[i].balance_usd = parseFloat(new_balance) + parseFloat(old_balance);
                reWriteFile(json_file);
                let player_balance = {
                    old_balance_usd: old_balance,
                    new_balance_usd: json_file.players[i].balance_usd.toFixed(2)
                };
                console.log(player_balance);
                return player_balance;
            }
        }
        return undefined;
    }
}
const p = new Post();

// *********************************************************************************

// ***************************** DECORATE CLASS ***********************************
// Used to output data in a specified fashion.

class Decorator {
    balance(balance){
        let money = balance.split(".");
        let balance_value = 0;
        if(money[1] == undefined || money[1] == ""){
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

    player(player){
        let hand = '';
        if(player.handed == "L" || player.handed.toLowerCase() == "left"){
            hand = "left";
        }
        else if(player.handed == "R" || player.handed.toLowerCase() == "right"){
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
}
const decor = new Decorator();

// ***************************** FORMAT CLASS ***********************************
// Used to format output to database.

class Formatter {
    player(params){

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
    
        let balance_value = decor.balance(params.initial_balance_usd);
    
        let new_player = {            
            fname: params.fname,
            lname: params.lname,
            handed: hand,
            is_active: true,
            balance_usd: balance_value
        }
        
        return new_player;
    }
    active(input){
        if(input == 1 || input.toLowerCase() == "t" || input.toLowerCase() == "true"){
            return true;
        }
        else {
            return false;
        }
    }
}
const form = new Formatter();

// ***********************************************************************************

// ***************************** VALIDATE CLASS ***********************************
// Used to validate inputs from user.

class Validator {
    balance(balance){
        if(balance == undefined){
            return 0;
        }
        if(balance == ""){
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

    name(name){
        if(/[^a-z]/i.test(name)){
            return 0;
        }
        return 1;
    }
    active(input){
        if(input == 1 || input.toLowerCase() == "t" || input.toLowerCase() == "true"){
            return 1;
        }
        else if(input == 0 || input.toLowerCase() == "f" || input.toLowerCase() == "false"){
            return 1;
        }
        else{
            console.log("ambiguous input for 'is_active'");
            return 0;
        }
    }

}
const v = new Validator();

// ***************************** OTHER FUNCTIONS ***********************************

// function getStartingPID(){
//     if(fs.existsSync(DATA_PATH)){
//         let initial_players = getPlayers();
//         if (initial_players.length == 0){
//             return 1; //start at index 1 bc no players are in JOSN file
//         }
//         return Math.max(...initial_players.map(({pid}) => pid)) + 1;
//     }
//     return 1;
// }

function alphabetizePlayers(players){
    players.sort(function(a,b) {
        let fnameA = a.fname.toUpperCase();
        let fnameB = b.fname.toUpperCase();
        if (fnameA < fnameB) {return -1;}
        if (fnameA > fnameB) {return 1;}
        if(fnameA == fnameB){
            let lnameA = a.lname.toUpperCase();
            let lnameB = b.lname.toUpperCase();
            if (lnameA < lnameB) {return -1;}
            if (lnameA > lnameB) {return 1;}
            return 0;
        }
        return 0;
    });
    return players;
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

app.get('/player', async (req,res,next) => {
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
app.delete('/player/:pid', async (req,res,next) => {
    try {
        let {acknowledged, deletedCount} = await mongo.delete_player(req.params.pid);
        if(acknowledged == true && deletedCount == 1){
            res.redirect(303, `/player`);
            res.end();
        }
        else{
            res.writeHead(404);
            res.end();
        }
        next();
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// POST FUNCTIONS
app.post('/player', async (req,res,next) => {
    try{
        let {invalid_fields,new_player} = p.new_player(req.query);
        if(invalid_fields.length == 0){
            let name = await mongo.insert_player(new_player);
            res.redirect(303, `/player/${name.insertedId.toString()}`);
            res.end();
        }
        else{
            res.writeHead(422);
            res.write("invalid fields: " + invalid_fields.join(", "));
            res.end();
        }        
        next();
    } catch(err){
        return next(err);
    }
});

app.post('/player/:pid', async (req,res,next) => {
    try{
        let updates = p.update_player(req.params.pid, req.query);
        if(Object.keys(updates).length > 0){
            await mongo.update_player(req.params.pid, updates);
            res.redirect(303, `/player/${req.params.pid}`);
            res.end();
        }
        else{
            res.writeHead(404);
            res.end();
        }
        next();
    } catch(err){
        console.log(err);
        next(err);
    }
});

app.post('/deposit/player/:pid', (req,res,next) => {
    let updates = p.update_balance(req.params.pid, req.query);
    if(Object.keys(updates).length == 0){
        res.writeHead(400);
        res.end();
    }
    // if(status == 0){
    //     res.writeHead(400);
    //     res.end();
    // }
    // else if(status == undefined)
    // {
    //     res.writeHead(404);
    //     res.end();
    // }
    // else{
    //     res.writeHead(200);
    //     res.write(JSON.stringify(status,null,2));
    //     res.end();
    // }
    next();
});

// ***********************************************************************************

class MongoDB {
    constructor(){
        this.MongoDb = null;
        this.ObjectId = require('mongodb').ObjectId; //allows us to look up by ObjectID
        this.collection = 'users';
        this.connect_mongo(this.read_json());
    }
    
    read_json(){
        try{
            let data = fs.readFileSync(MONGO_DATA_PATH,'utf8');
            let json_file = JSON.parse(data);
            return json_file;
        } catch(err){
            console.log(err.name);
            exit(2);
        }
        
    }

    connect_mongo(mongo_json){
        const uri = `mongodb://${mongo_json.host}:${mongo_json.port}?useUnifiedTopology=true`;
        const MONGO_DB = `${mongo_json.db}`;
        const { MongoClient } = require('mongodb');
        MongoClient.connect(uri, (err, mongoConnect) => {  
            if (err) {
                console.log(err.name);
                exit(5);
            }
            this.MongoDb = mongoConnect.db(MONGO_DB);
            app.listen(PORT);
            console.log(`Server started, port ${PORT}`);
        });
    }

    update_player(pid, values){
        try {
            let set_values = {$set:values};
            let key_value = {_id:this.ObjectId(pid.toString())};
            let update_obj = {key_value, set_values};
            this.MongoDb.collection(this.collection).updateOne(update_obj.key_value, update_obj.set_values);
        } catch (err) {
            console.log(err);
        }
    }

    insert_player(new_player){
        try{
            return this.MongoDb.collection(this.collection).insertOne(new_player);
        } catch(err){
            console.log(err);
        }
    }

    delete_player(pid){
        try {
            let key_value = {_id:this.ObjectId(pid.toString())};
            console.log(key_value);
            return this.MongoDb.collection(this.collection).deleteOne(key_value)
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

}

const mongo = new MongoDB();
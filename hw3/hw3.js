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

// MAPS
const COLLECTION = {
    PLAYER: 'player',
    MATCH: 'match'
}

const MATCH_INPUT = {
    PLAYER_DNE: 0,
    PLAYER_ACTIVE: 1,
    INSUFFICIENT_BAL: 2,
    OTHER: 3,
    VALID: 4
}

// const PLAYER_ATTRIBUTES_ARRAY = [
//     "pid",
//     "name",
//     "handed",
//     "is_active",
//     "num_won",
//     "num_dq",
//     "balance_usd",
//     "total_points",
//     "total_prize_usd",
//     "efficiency",
//     "created_at"
// ]



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

    name(fname,lname){
        if(lname){
            return fname + ' ' + lname;
        }
        else {  
            return fname;
        }
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
    
        let name = this.name(player.fname,player.lname);
        
    
        let player_output = {
            pid: player._id,
            name: name,
            handed: hand,
            is_active: player.is_active,
            num_won: 0,
            num_join: 0,
            num_dq: 0,
            balance_usd: player.balance_usd,
            total_points: 0,
            total_prize_usd: 0,
            efficiency: 0.0,
            in_active_match: false,

        }
        return player_output;
    }

    players(player_list){
        let output = [];
        for(let i = 0; i < player_list.length; i++){
            output.push(this.player(player_list[i]));
        }
        return output;
    }

    updated_balance(old_balance, new_balance){
        let updated_balance_output = {
            old_balance_usd: old_balance,
            new_balance_usd: new_balance
        };
        return updated_balance_output;
    }

    async match(match){

        let temp = {is_active: true};
        if(match.ended_at != null){
            temp.winner = match.winner_pid;
            temp.is_active = false;
        } 
        let player1 = await mongo.get_value(COLLECTION.PLAYER,match.p1_id);
        let player2 = await mongo.get_value(COLLECTION.PLAYER,match.p2_id);

        let name1 = this.name(player1.fname,player1.lname);
        let name2 = this.name(player2.fname,player2.lname);

        let match_output = {
            mid: match._id,
            entry_fee_usd: match.entry_fee_usd,
            p1_id: match.p1_id,
            p1_name: name1,
            p1_points: match.p1_points,
            p2_id: match.p2_id,
            p2_name: name2,
            p2_points: match.p2_points,
            winner_pid: temp.winner,
            is_dq: match.is_dq,
            is_active: temp.is_active,
            prize_usd: match.prize_usd,
            age: new Date() - match.created_at,
            end_at: match.ended_at
        }
        return match_output;
    }

    async matches(match_list){
        let output = [];
        for(let i = 0; i < match_list.length; i++){
            output.push(await this.match(match_list[i]));
        }
        return output;
    }
}
const decor = new Decorator();

// ***************************** FORMAT CLASS ***********************************
// Used to format output to database.

class Formatter {
    new_player(params){

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
            balance_usd: balance_value,
            created_at: new Date()
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

    new_match(params){
        let new_match = {            
            created_at: new Date(),
            ended_at: null,
            entry_fee_usd: decor.balance(params.entry_fee_usd),
            is_dq: false,
            p1_id: params.pid1,
            p1_points: 0,
            p2_id: params.pid2,
            p2_points: 0,
            prize_usd: decor.balance(params.prize_usd)
        }
        return new_match;
    }
}
const db_form = new Formatter();

// ***********************************************************************************

// ***************************** VALIDATE CLASS ***********************************
// Used to validate inputs from user.

class Validator {

    new_player(params){
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
        else if(!this.name(params.fname) || params.fname == ""){
            console.log("fname");
            invalid_fields.push("fname");
        }
    
        // Check last name (can be blank)
        if(!this.name(params.lname)){
            console.log("lname");
            invalid_fields.push("lname");
        }
        
        // Check initial Balance
        if (!this.balance(params.initial_balance_usd)){
            invalid_fields.push("initial_balance_usd");
        }
    
        return invalid_fields;
    }

    update_player(query){
        if(query.active != undefined && !this.active(query.active)){
            return 0;
        }
        if(query.lname != undefined && !this.name(query.lname)){
            return 0;
        }
        return 1;
    }

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

    async new_match(query){
        let player1 = await mongo.get_value(COLLECTION.PLAYER,query.pid1);
        let player2 = await mongo.get_value(COLLECTION.PLAYER,query.pid2);

        if(player1 == null){
            return MATCH_INPUT.PLAYER_DNE;
        }
        if(player2 == null){
            return MATCH_INPUT.PLAYER_DNE;
        }
        // if(!this.player_active(player1.is_active)){
        //     return MATCH_INPUT.PLAYER_ACTIVE;
        // }
        // if(!this.player_active(player2.is_active)){
        //     return MATCH_INPUT.PLAYER_ACTIVE;
        // }
        if(!this.balance(query.entry_fee_usd) || !this.balance(query.prize_usd)){
            return MATCH_INPUT.OTHER;
        }
        if(!this.player_balance_sufficient(player1.balance_usd, query.entry_fee_usd)){
            return MATCH_INPUT.INSUFFICIENT_BAL;
        }
        if(!this.player_balance_sufficient(player2.balance_usd, query.entry_fee_usd)){
            return MATCH_INPUT.INSUFFICIENT_BAL;
        }
        
        return MATCH_INPUT.VALID;
    }

    player_active(active){
        if(active == true){
            return 0;
        }
        else{
            return 1;
        }
    }

    player_balance_sufficient(balance, entry_fee){
        if(parseFloat(balance) > parseFloat(entry_fee)){
            return 1;
        }
        else{
            return 0;
        }
    }

}
const v = new Validator();

class Updater {
    player(query){
        let updates = {};
        if(query.active != undefined){
            updates.is_active = db_form.active(query.active);
        }
        if(query.lname != undefined){
            updates.lname = query.lname;
        }
        //ADD ALL POSSIBLE UPDATES

        return updates;
    }

    match() {

    }
}

const updater = new Updater();

// ***************************** OTHER FUNCTIONS ***********************************

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

function sort_by_prize_usd(matches){
    matches.sort(function(a,b) {
        let prize1 = parseFloat(a.prize_usd);
        let prize2 = parseFloat(b.prize_usd);
        if (prize1 < prize2) {return 1;}
        if (prize1 > prize2) {return -1;}
        return 0;
    });
    return matches;
}

function sort_by_end_at(matches){
    matches.sort(function(a,b) {
        let time1 = a.ended_at.toUpperCase();
        let time2 = b.ended_at.toUpperCase();
        if (time1 < time2) {return -1;}
        if (time1 > time2) {return 1;}
        return 0;
    });
    return matches;
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
        let players = await mongo.get_values(COLLECTION.PLAYER);
        players = alphabetizePlayers(players); 
        res.writeHead(200);
        res.write(JSON.stringify(decor.players(players), null, 2));
        res.end();
    } catch(err){
        console.log(err);
    }
    next();
});

app.get('/match', async (req,res,next) => {
    try{
        let matches = await mongo.get_values(COLLECTION.MATCH);
        console.log(JSON.stringify(matches));
        matches = sort_by_prize_usd(matches); 
        res.writeHead(200);
        res.write(JSON.stringify(await decor.matches(matches), null, 2));
        res.end();
    } catch(err){
        console.log(err);
    }
    next();
});

app.get('/player/:pid', async (req,res,next) => {
    try {
        let player = await mongo.get_value(COLLECTION.PLAYER,req.params.pid);
        if (player == null){
            res.writeHead(404);
            res.end();
        } 
        else{
            res.writeHead(200);
            res.write(JSON.stringify(decor.player(player), null, 2));
            res.end();
        }
        next();
    } catch (err) {
        console.log(err);
        next(err);
    } 
});

app.get('/match/:mid', async (req,res,next) => {
    try {
        let match = await mongo.get_value(COLLECTION.MATCH, req.params.mid);
        console.log(match);
        if(match == null){
            res.writeHead(404);
            res.end();
        }
        else{
            res.writeHead(200);
            res.write(JSON.stringify(await decor.match(match), null, 2));
            res.end();
        }
        next();
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// DELETE FUNCTIONS
app.delete('/player/:pid', async (req,res,next) => {
    try {
        let {acknowledged, deletedCount} = await mongo.delete_value(COLLECTION.PLAYER,req.params.pid);
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
        let invalid_fields = v.new_player(req.query);
        if(invalid_fields.length == 0){
            let mongo_player_input = db_form.new_player(req.query);
            let name = await mongo.insert_value(COLLECTION.PLAYER,mongo_player_input);
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

app.post('/match', async (req,res,next) => {
    try{
        // console.log(req.query);
        let response = await v.new_match(req.query);
        console.log(response);
        switch(response) {
            case MATCH_INPUT.PLAYER_DNE:
                res.writeHead(404);
                res.end()
                break;
            case MATCH_INPUT.PLAYER_ACTIVE:
                res.writeHead(409);
                res.end()
                break;
            case MATCH_INPUT.INSUFFICIENT_BAL:
                res.writeHead(400);
                res.end()
                break;
            case MATCH_INPUT.OTHER:
                res.writeHead(400);
                res.end()
                break;
            case MATCH_INPUT.VALID:
                let mongo_player_input = db_form.new_match(req.query);
                let name = await mongo.insert_value(COLLECTION.MATCH,mongo_player_input);
                res.redirect(303, `/match/${name.insertedId.toString()}`);
                res.end();

        }
        next();
    } catch(err){
        return next(err);
    }
});

app.post('/player/:pid', async (req,res,next) => {
    try{
        let updates = {};
        if(v.update_player(req.query)){
            updates = updater.player(req.query);
        }
        if(updates == null){
            res.writeHead(404);
            res.end();
        }
        else{
            let result = await mongo.update_values(COLLECTION.PLAYER,req.params.pid, updates);
            if(result.matchedCount == 0){
                res.writeHead(404);
                res.end();
            }
            else {
                console.log(result);
                res.redirect(303, `/player/${req.params.pid}`);
                res.end();
            }
        }
        next();
    } catch(err){
        console.log(err);
        next(err);
    }
});

app.post('/deposit/player/:pid', async (req,res,next) => {
    let player = await mongo.get_value(COLLECTION.PLAYER,req.params.pid);

    // Invalide balance input
    if(!v.balance(req.query.amount_usd)){
        res.writeHead(400);
        res.end();
    }
    else{
        // player exists
        if(player != null){
            let old_balance = decor.balance(player.balance_usd);
            let deposit = decor.balance(req.query.amount_usd);
            let new_balance = parseFloat(deposit) + parseFloat(old_balance);
            new_balance = new_balance.toFixed(2);
    
            let updates = {balance_usd:new_balance};
            await mongo.update_values(COLLECTION.PLAYER,req.params.pid, updates);
    
            let balance_output = decor.updated_balance(old_balance,new_balance);
            res.writeHead(200);
            res.write(JSON.stringify(balance_output,null,2));
            res.end();
        }
        else{
            res.writeHead(404);
            res.end();
        }
    }
    next();
});

// ***********************************************************************************

class MongoDB {
    constructor(){
        this.MongoDb = null;
        this.ObjectId = require('mongodb').ObjectId; //allows us to look up by ObjectID
        this.connect_mongo();
    }
    
    read_json(){
        try{
            let data = fs.readFileSync(MONGO_DATA_PATH,'utf8');
            let json_file = JSON.parse(data);
            // json_file = MONGO_HOST;
            return json_file;
        } catch(err){
            console.log(err.name);
            exit(2);
        }
        
    }

    connect_mongo(){
        let mongo_json = this.read_json()
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

    update_values(collection,id, values){
        try {
            let set_values = {$set:values};
            let key_value = {_id:this.ObjectId(id.toString())};
            let update_obj = {key_value, set_values};
            
            return this.MongoDb.collection(collection).updateOne(update_obj.key_value, update_obj.set_values);
        } catch (err) {
            console.log(err);
        }
    }

    insert_value(collection,value){
        try{
            return this.MongoDb.collection(collection).insertOne(value);
        } catch(err){
            console.log(err);
        }
    }

    delete_value(collection,id){
        try {
            let key_value = {_id:this.ObjectId(id.toString())};
            return this.MongoDb.collection(collection).deleteOne(key_value);
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    get_value(collection, id){
        try {
            if(id.length != 24){
                return null;
            }
            let key_value = {_id:this.ObjectId(id.toString())};
            return this.MongoDb.collection(collection).findOne(key_value);
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    get_values(collection){
        try {
            return this.MongoDb.collection(collection).find({}).toArray();
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

}

const mongo = new MongoDB();
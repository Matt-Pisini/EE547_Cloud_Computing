'use strict';

const { json, query } = require("express");
const express = require("express");
const { MongoClient } = require('mongodb');
const fs = require('fs');
const { forEach } = require("mathjs");
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
    DNE: 0,
    ACTIVE: 1,
    INACTIVE: 2,
    INSUFFICIENT_BAL: 3,
    TIE: 4,
    OTHER: 5,
    VALID: 6
}


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
        let name = this.name(player.fname,player.lname);
    
        let player_output = {
            pid: player._id,
            name: name,
            handed: player.handed,
            is_active: player.is_active,
            num_join: player.num_join,
            num_won: player.num_won,
            num_dq: player.num_dq,
            balance_usd: player.balance_usd,
            total_points: player.total_points,
            total_prize_usd: player.total_prize_usd,
            efficiency: player.efficiency,
            in_active_match: player.in_active_match,

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

        let player1 = await mongo.get_value(COLLECTION.PLAYER,match.p1_id.toString());
        let player2 = await mongo.get_value(COLLECTION.PLAYER,match.p2_id.toString());

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
            winner_pid: match.winner_pid,
            is_dq: match.is_dq,
            is_active: match.is_active,//(match.ended_at == null) ? true : false,
            prize_usd: match.prize_usd,
            age: new Date() - match.created_at,
            ended_at: match.ended_at
        }
        for(const property in DEFAULT_MATCH_ATTR){
            if(match_output[property] == undefined) match_output[property] = DEFAULT_MATCH_ATTR[property];
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
const DEFAULT_PLAYER_ATTR = {
    num_join: 0,
    num_won: 0,
    num_lost: 0,
    num_dq: 0,
    total_points: 0,
    total_prize_usd: 0,
    efficiency: 0.0,
    in_active_match: null
}
const DEFAULT_MATCH_ATTR = {
    ended_at: null,
    is_dq: false,
    p1_points: 0,
    p2_points: 0,
    winner_pid: null,
    is_active: true
}

class Formatter {
    new_player(params){
        // let hand = this.handed(params.handed);
        let balance_value = decor.balance(params.initial_balance_usd);
    
        let new_player = {            
            fname: params.fname,
            lname: params.lname,
            handed: params.handed,
            is_active: true,
            balance_usd: balance_value,
            created_at: new Date(),
            num_join: 0,
            num_won: 0,
            num_lost: 0,
            num_dq: 0,
            total_points: 0,
            total_prize_usd: 0,
            efficiency: 0.0,
            in_active_match: null
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

    handed(input){

        if(input.toLowerCase() == "left"){
            return "L";
        }
        else if(input.toLowerCase() == "right"){
            return "R";
        }
        else{
            return "A";
        }
    }

    new_match(params){
        let new_match = {            
            created_at: new Date(),
            ended_at: null,
            entry_fee_usd: decor.balance(params.entry_fee_usd),
            is_dq: false,
            p1_id: params.p1_id,
            p1_points: 0,
            p2_id: params.p2_id,
            p2_points: 0,
            winner_pid: null,
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

    async update_player(query, pid){
        await updater.player({},pid);
        let player = await mongo.get_value(COLLECTION.PLAYER,pid);

        // PLAYER DNE
        if (player == null){
            return 0;
        }

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

    async award_points(input){
        if( !this.points(input.query.points) ){
            return MATCH_INPUT.OTHER;
        }

        let match = await mongo.get_value(COLLECTION.MATCH,input.mid);

        if(match == null){
            return MATCH_INPUT.DNE;
        }
        if(!this.match_active(match.ended_at)){
            return MATCH_INPUT.INACTIVE;
        }
        if((input.pid != match.p1_id) && (input.pid != match.p2_id)){
            if(await this.does_player_exist(input.pid)) return MATCH_INPUT.OTHER;
            else return MATCH_INPUT.DNE;
        }

        return MATCH_INPUT.VALID;
    }

    async new_match(query){
        let player1 = await mongo.get_value(COLLECTION.PLAYER,query.p1_id);
        let player2 = await mongo.get_value(COLLECTION.PLAYER,query.p2_id);

        if(player1 == null){
            return MATCH_INPUT.DNE;
        }
        if(player2 == null){
            return MATCH_INPUT.DNE;
        }
        if(this.player_active(player1.in_active_match)){
            return MATCH_INPUT.ACTIVE;
        }
        if(this.player_active(player2.in_active_match)){
            return MATCH_INPUT.ACTIVE;
        }
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

    async end_match(mid){
        let match = await mongo.get_value(COLLECTION.MATCH, mid);

        if(match == null){
            return MATCH_INPUT.DNE;
        }
        if(match.ended_at != null){
            return MATCH_INPUT.INACTIVE;
        }

        if(parseInt(match.p1_points) == parseInt(match.p2_points)) return MATCH_INPUT.TIE;
        else if(match.p1_points == undefined && match.p2_points == undefined) return MATCH_INPUT.TIE;


        return MATCH_INPUT.VALID;
    }

    async disqualify(mid, pid){
        // await updater.match({},mid);
        let match = await mongo.get_value(COLLECTION.MATCH, mid);

        if(match == null){
            return MATCH_INPUT.DNE;
        }
        if(match.ended_at != null){
            return MATCH_INPUT.INACTIVE;
        }
        if(! await this.does_player_exist(pid)) return MATCH_INPUT.DNE;

        if((pid != match.p1_id) && (pid != match.p2_id)){
            return MATCH_INPUT.OTHER;
        }
        
        return MATCH_INPUT.VALID;
    }

    player_active(active){
        return (active != null) ? 1 : 0;
    }

    match_active(end_at){
        return (end_at == null) ? 1 : 0;
    }

    player_balance_sufficient(balance, entry_fee){
        return (parseFloat(balance) > parseFloat(entry_fee)) ? 1 : 0;
    }

    points(value){
        if(value == "")                      return 0; // empty
        else if(isNaN(value))                return 0; // not a number
        else if(value.match(/[.]/) != null)  return 0; // float
        else if(parseInt(value) <= 0)        return 0; // points less than or equal to 0
        else                                 return 1; //valid
    }

    async does_player_exist(pid){
        let player = await mongo.get_value(COLLECTION.PLAYER, pid);
        if(player == null) return false;
        else return true;
    }

    // player_has_attributes(player){
    //     for(const property in DEFAULT_PLAYER_ATTR){
    //         if(player[property] == undefined) player[property] = DEFAULT_PLAYER_ATTR[property];
    //     }
    // }

    // async match_has_attr(mid){
    //     let match = await mongo.get_value(COLLECTION.MATCH, mid.toString());
    //     for(const property in DEFAULT_MATCH_ATTR){
    //         if(match[property] == undefined) updates[property] = DEFAULT_MATCH_ATTR[property];
    //     }

    // }

}
const v = new Validator();

class Updater {
    async player(query, pid){
        let updates = {};

        let player = await mongo.get_value(COLLECTION.PLAYER, pid.toString());
        if(player == null) return;

        for(const property in DEFAULT_PLAYER_ATTR){
            if(player[property] == undefined) updates[property] = DEFAULT_PLAYER_ATTR[property];
        }

        if (query.active != undefined) updates.is_active = db_form.active(query.active);

        if (query.lname != undefined) updates.lname = query.lname;
        
        if (query.in_active_match != undefined) updates.in_active_match = query.in_active_match;

        if (query.join_match != undefined) {
            updates.num_join = (player.num_join) ? parseInt(player.num_join) + 1 : 1;
            updates.balance_usd = (parseFloat(player.balance_usd) - parseFloat(query.entry_fee)).toFixed(2);
        }
        
        if (query.win != undefined){
            updates.num_won = (player.num_won) ? parseInt(player.num_won) + 1 : 1;
            updates.in_active_match = null;
            player.num_lost = (player.num_lost) ? player.num_lost : 0;
            updates.efficiency = updates.num_won / (parseInt(player.num_lost) + updates.num_won);
            updates.balance_usd = (parseFloat(player.balance_usd) + parseFloat(query.award_prize_usd)).toFixed(2);
        }

        if (query.lose != undefined) {
            updates.num_lost = (player.num_lost) ? parseInt(player.num_lost) + 1 : 1;
            updates.in_active_match = null;
            player.num_won = (player.num_won) ? player.num_won : 0;
            updates.efficiency = player.num_won / (updates.num_lost + player.num_won);
        }

        if (query.dq != undefined) {
            updates.num_dq = (player.num_dq) ? parseInt(player.num_dq) + 1 : 1;
            updates.in_active_match = null;
            updates.num_lost = (player.num_lost) ? parseInt(player.num_lost) + 1 : 1;
            updates.efficiency = player.num_won / (updates.num_lost + player.num_won);
        }

        if (query.add_points != undefined) updates.total_points = (player.total_points) ? parseInt(player.total_points) + parseInt(query.add_points) : parseInt(query.add_points);
        
        // UPDATE PLAYER
        if(updates != undefined && ! await mongo.update_values(COLLECTION.PLAYER,pid,updates)){
            throw console.error(`ERROR in Updater: updating COLLECTION:${COLLECTION.PLAYER} with ID:${pid}`);
        }
    }

    async match(query, mid, pid = null) {
        let updates = {};

        let match = await mongo.get_value(COLLECTION.MATCH, mid.toString());

        for(const property in DEFAULT_MATCH_ATTR){
            if(match[property] == undefined) updates[property] = DEFAULT_MATCH_ATTR[property];
        }
        // CHANGE PLAYER SCORE
        if (query.points != undefined && pid != null){
            if(match.p1_id == pid){
                updates.p1_points = (match.p1_points) ? parseInt(match.p1_points) + parseInt(query.points): parseInt(query.points);
            }
            else if (match.p2_id == pid){
                updates.p2_points = (match.p2_points) ? parseInt(match.p2_points) + parseInt(query.points): parseInt(query.points);
            }
            else{
                throw console.error("Update has no valid player");
            }
            await this.player({add_points:query.points},pid);
        }
        
        // UPDATE VALUES
        if (query.is_dq != undefined) {
            updates.is_dq = query.is_dq;
            updates.ended_at = new Date();
            if (match.p1_id == pid) {
                await this.player({dq: true},match.p1_id);
                await this.player({win: true, award_prize_usd: match.prize_usd},match.p2_id);
                updates.winner_pid = match.p2_id;
            }
            else {
                await this.player({dq: true},match.p2_id);
                await this.player({win: true, award_prize_usd: match.prize_usd},match.p1_id);
                updates.winner_pid = match.p1_id;
            }
        }
        if (query.end_match == true) {
            updates.ended_at = new Date();
            updates.is_active = false;
            if (match.p1_points > match.p2_points) {
                await this.player({win: true, award_prize_usd: match.prize_usd},match.p1_id);
                await this.player({lose: true},match.p2_id);
                updates.winner_pid = match.p1_id;
            }
            else {
                await this.player({win: true, award_prize_usd: match.prize_usd},match.p2_id);
                await this.player({lose: true},match.p1_id);
                updates.winner_pid = match.p2_id;
            }
        }

        // PERFORM UPDATE ON MATCH
        if(! await mongo.update_values(COLLECTION.MATCH, mid, updates)){
            throw console.error(`ERROR: updating COLLECTION:${COLLECTION.MATCH} with ID:${mid}`);
        }
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
        let time1 = a.ended_at;
        let time2 = b.ended_at;
        if (time1 < time2) {return 1;}
        if (time1 > time2) {return -1;}
        return 0;
    });
    return matches;
}

// *****************************************************************************************
// 
//                                  * EXPRESS ENDPOINTS *
// 
// *****************************************************************************************

// ************************************** PING *********************************************

app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.write('');
    res.end();
    next();
});

// *****************************************************************************************


// **************************** GET PLAYER FUNCTIONS ***************************************


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

// *****************************************************************************************

// ******************************** GET MATCH FUNCTIONS ************************************


app.get('/match', async (req,res,next) => {
    try{
        let all_matches = await mongo.get_values(COLLECTION.MATCH);
        // console.log(all_matches);
        //return all active
        // return 4 most recent inactive
        let active_matches = []
        let inactive_matches = []
        // all_matches.forEach((element, index) => {is_active});
        for(const match of all_matches){
            if(match.is_active == true || match.is_active == undefined) active_matches.push(match);
            else inactive_matches.push(match);
        }
        
        active_matches = sort_by_prize_usd(active_matches); 
        // console.log("active matches\n");
        // console.log(active_matches);
        inactive_matches = sort_by_end_at(inactive_matches);
        // console.log("inactive matches\n");
        // console.log(inactive_matches);

        let matches = active_matches.concat(inactive_matches.slice(0,4));
        console.log(matches);
        res.writeHead(200);
        res.write(JSON.stringify(await decor.matches(matches), null, 2));
        res.end();
    } catch(err){
        console.log(err);
    }
    next();
});



app.get('/match/:mid', async (req,res,next) => {
    try {
        let match = await mongo.get_value(COLLECTION.MATCH, req.params.mid);
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

// *****************************************************************************************


// ******************************* DELETE PLAYER FUNCTIONS **********************************

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

// *****************************************************************************************


// ********************************* POST PLAYER FUNCTIONS **********************************

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

app.post('/player/:pid', async (req,res,next) => {
    try{
        if(await v.update_player(req.query, req.params.pid)){
            await updater.player(req.query,req.params.pid);
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

app.post('/deposit/player/:pid', async (req,res,next) => {
    // Invalide balance input
    if(!v.balance(req.query.amount_usd)){
        res.writeHead(400);
        res.end();
    }
    else{
        let player = await mongo.get_value(COLLECTION.PLAYER,req.params.pid);
        if(player != null){
            let old_balance = decor.balance(player.balance_usd);
            let deposit = decor.balance(req.query.amount_usd);
            let new_balance = parseFloat(deposit) + parseFloat(old_balance);
            new_balance = new_balance.toFixed(2);
    
            let updates = {balance_usd:new_balance};
            if(await mongo.update_values(COLLECTION.PLAYER,req.params.pid, updates)){
                let balance_output = decor.updated_balance(old_balance,new_balance);
                res.writeHead(200);
                res.write(JSON.stringify(balance_output,null,2));
                res.end();
            }
            else{
                console.log("error updating deposit");
            }
        }
        else{
            res.writeHead(404);
            res.end();
        }
    }
    next();
});

// *****************************************************************************************


// ********************************* POST MATCH FUNCTIONS **********************************
app.post('/match', async (req,res,next) => {
    try{
        // console.log(req.query);
        let response = await v.new_match(req.query);
        switch(response) {
            case MATCH_INPUT.DNE:
                res.writeHead(404);
                res.end()
                break;
            case MATCH_INPUT.ACTIVE:
                res.writeHead(409);
                res.end()
                break;
            case MATCH_INPUT.INSUFFICIENT_BAL:
                res.writeHead(402);
                res.end()
                break;
            case MATCH_INPUT.OTHER:
                res.writeHead(400);
                res.end()
                break;
            case MATCH_INPUT.VALID:
                let mongo_player_input = db_form.new_match(req.query);
                let name = await mongo.insert_value(COLLECTION.MATCH,mongo_player_input);

                //update players
                await updater.player({in_active_match:name.insertedId.toString(), join_match: true, entry_fee: req.query.entry_fee_usd},req.query.p1_id);
                await updater.player({in_active_match:name.insertedId.toString(), join_match: true, entry_fee: req.query.entry_fee_usd},req.query.p2_id);

                res.redirect(303, `/match/${name.insertedId.toString()}`);
                res.end();
                break;
        }
        next();
    } catch(err){
        return next(err);
    }
});

app.post('/match/:mid/award/:pid', async (req,res,next) => {
    try {
        let input = {
            mid:req.params.mid,
            pid:req.params.pid,
            query:req.query
        }
        let response = await v.award_points(input);
        switch(response) {
            case MATCH_INPUT.DNE:
                res.writeHead(404);
                res.end();
                break;
            case MATCH_INPUT.INACTIVE:
                res.writeHead(409);
                res.end();
                break;
            case MATCH_INPUT.OTHER:
                res.writeHead(400);
                res.end();
                break;
            case MATCH_INPUT.VALID:
                await updater.match(input.query,input.mid,input.pid);
                let match = await mongo.get_value(COLLECTION.MATCH, req.params.mid);
                res.writeHead(200);
                res.write(JSON.stringify(await decor.match(match), null, 2))
                res.end();
                break;
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
    next();
});

app.post('/match/:mid/end', async(req,res,next) => {
    try {
        let response = await v.end_match(req.params.mid);
        switch(response){
            case MATCH_INPUT.TIE:
            case MATCH_INPUT.INACTIVE:
                res.writeHead(409);
                res.end();
                break;
            case MATCH_INPUT.DNE:
                res.writeHead(404);
                res.end();
                break;
            case MATCH_INPUT.VALID:
                await updater.match({end_match:true},req.params.mid)
                let match = await mongo.get_value(COLLECTION.MATCH, req.params.mid);
                res.writeHead(200);
                res.write(JSON.stringify(await decor.match(match), null, 2))
                res.end();
                break;
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
});

app.post('/match/:mid/disqualify/:pid', async(req,res,next) => {
    try {
        let response = await v.disqualify(req.params.mid, req.params.pid);
        switch(response){
            case MATCH_INPUT.DNE:
                res.writeHead(404);
                res.end();
                break;
            case MATCH_INPUT.INACTIVE:
                res.writeHead(409);
                res.end();
                break;
            case MATCH_INPUT.OTHER:
                res.writeHead(400);
                res.end();
                break;
            case MATCH_INPUT.VALID:
                await updater.match({is_dq:true},req.params.mid, req.params.pid)
                let match = await mongo.get_value(COLLECTION.MATCH, req.params.mid);
                res.writeHead(200);
                res.write(JSON.stringify(await decor.match(match), null, 2))
                res.end();
                break;
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// *****************************************************************************************



// *****************************************************************************************
// 
//                                 * MONGODB IMPLEMENTATION *
// 
// *****************************************************************************************

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

    async update_values(collection,id, values){
        try {
            let set_values = {$set:values};
            let key_value = {_id:this.ObjectId(id.toString())};
            let update_obj = {key_value, set_values};
            
            let response = await this.MongoDb.collection(collection).updateOne(update_obj.key_value, update_obj.set_values);
            if(response.matchedCount == 0){
                console.log(`Error updating COLLECTION:${collection} with ID:${id}`);
                return false;
            }
            else{
                return true;
            }
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
        }
    }

    get_values(collection, search_value = null){
        try {
            if(search_value == null) return this.MongoDb.collection(collection).find({}).toArray();
            else return this.MongoDb.collection(collection).find(search_value).toArray()
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

}

const mongo = new MongoDB();

// ***********************************************************************************

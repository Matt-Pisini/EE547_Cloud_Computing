'use strict';

const express = require('express');
const {graphqlHTTP} = require('express-graphql');

const {readFileSync} = require('fs');
const {assertResolversPresent, makeExecutableSchema} = require('@graphql-tools/schema');

const app = express();

const { MongoClient } = require('mongodb');
const { forEach } = require("mathjs");
const DataLoader = require('dataloader');

const MONGO_COLLECTION = {MATCH:"match",PLAYER:"player"};

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
        if(!this.player_balance_sufficient(player1.balance_usd_cents, query.entry_fee_usd)){
            return MATCH_INPUT.INSUFFICIENT_BAL;
        }
        if(!this.player_balance_sufficient(player2.balance_usd_cents, query.entry_fee_usd)){
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
        return (parseFloat(balance)/100 > parseFloat(entry_fee)) ? 1 : 0;
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

}
const v = new Validator();

const DEFAULT_PLAYER_ATTR = {
    num_join: 0,
    num_won: 0,
    num_dq: 0,
    total_points: 0,
    total_prize_usd: 0,
    efficiency: 0.0,
    in_active_match: null,
    is_active: true
}

const DEFAULT_MATCH_ATTR = {
    ended_at: null,
    is_dq: false,
    p1_points: 0,
    p2_points: 0,
    winner_pid: null,
    is_active: true,
    winner: null
}

class MongoDB {
    constructor(){
        this.mongo_config = {"host":"192.168.0.18","port":"27017","db":"ee547_hw","opts":{"useUnifiedTopology":true}}
        this.uri = `mongodb://${this.mongo_config.host}:${this.mongo_config.port}?useUnifiedTopology=true`;;
        this.ObjectId = require('mongodb').ObjectId;
        this.connection = null;
        this.connect();
        
    }
    async connect(){
        MongoClient.connect(this.uri, (err, mongoConnect) => {
            if(err) {
                console.log(err);
                exit(5);
            }
            this.connection = mongoConnect.db(this.mongo_config.db);
            console.log("Successfully created mongo connection");
        })
    }
    // async get_player(id){
    //     try {
    //         if(id.length != 24){
    //             return null;
    //         }
    //         let key_value = {_id:this.ObjectId(id.toString())};
    //         return await this.connection.collection('player').findOne(key_value);
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }
    // async get_players(){
    //     try {
    //         return await this.connection.collection('player').find({}).toArray();
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }
    // async get_match(id){
    //     try {
    //         if(id.length != 24){
    //             return null;
    //         }
    //         let key_value = {_id:this.ObjectId(id.toString())};
    //         return this.connection.collection('match').findOne(key_value);
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }
    async player_deposit(context, pid, amount){
        try {
            let balance = await context.loader.player.load(pid).then(data => data.balance_usd_cents);
            let {matchedCount} = await this.connection.collection(MONGO_COLLECTION.PLAYER)
                .updateOne({_id: this.ObjectId(pid.toString())}, {$set:{balance_usd_cents: (amount + balance)}});
            
            if(matchedCount == 0) throw `Cannot update player with pid:${pid}`;
            await context.loader.player.clear(pid);

        } catch (err) {
            console.log(err);
        }
    }
    async update_player(context, pid, {lname, is_active}) {
        try {
            let updates = {is_active:is_active};
            if(lname == undefined) ;
            else if(v.name(lname)) updates.lname = lname;
            else throw `${lname} is not a valid string`;

            let {matchedCount} = await this.connection.collection(MONGO_COLLECTION.PLAYER)
                .updateOne({_id: this.ObjectId(pid.toString())}, {$set:updates});
            if(matchedCount == 0) throw `Cannot update player with pid:${pid}`;
        } catch (err) {
            console.log(err);
        }
    }
    async add_player(context, {fname, lname, handed, initial_balance_usd_cents}) {
        try{
            const new_player = Object.create(DEFAULT_PLAYER_ATTR);
            if(v.name(fname))new_player.fname = fname;
            else throw `${fname} is not a valid string`;
            if(v.name(lname))new_player.lname = lname;
            else throw `${lname} is not a valid string`;
            new_player.handed = handed;
            new_player.balance_usd_cents = initial_balance_usd_cents;
            new_player.name = (lname) ? fname + lname : fname;

            return this.connection.collection(MONGO_COLLECTION.PLAYER).insertOne(new_player);
        } catch(err){
            console.log(err);
        }
    }
    async delete_player(context, pid) {
        const {deletedCount} = await this.connection.collection(MONGO_COLLECTION.PLAYER)
            .deleteOne({_id: new this.ObjectId(pid)});

        context.loader.player.clear(pid);

        if(deletedCount == 0){
            throw new NotFoundError(`player_delete error -- pid:${pid}`);
        }
    }
    async add_match(contex, pid_1, pid_2, entry_fee_usd_cents, prize_usd_cents) {
        try{
            const {in_active_match:p1_active, balance_usd_cents:p1_balance} = await contex.loader.player.load(pid_1);
            const {in_active_match:p2_active, balance_usd_cents:p2_balance} = await contex.loader.player.load(pid_2);
            // console.log(p1_active, p1_balance)
            if(p1_active || (p1_balance < entry_fee_usd_cents)) throw "player 1 error";
            if(p2_active || (p2_balance < entry_fee_usd_cents)) throw "player 2 error";

            const new_match = Object.create(DEFAULT_MATCH_ATTR);
            new_match.entry_fee_usd_cents = entry_fee_usd_cents;
            new_match.prize_usd_cents = prize_usd_cents;
            new_match.p1 = pid_1;
            new_match.p2 = pid_2;

            return this.connection.collection(MONGO_COLLECTION.MATCH).insertOne(new_match);
        } catch(err){
            console.log(err);
        }
    }
    create_loaders() {
        return {
            match: new DataLoader(ids => this._batch(MONGO_COLLECTION.MATCH, ids)),
            player: new DataLoader(ids => this._batch(MONGO_COLLECTION.PLAYER, ids)),
        }
    }
    async _batch(collection, ids = []){
        const obj_ids = ids.map(obj => new this.ObjectId(obj));
        // console.log(obj_ids);
        return this.connection.collection(collection).find({_id: {$in:obj_ids}})
            .toArray()
            .then(docs => {
                // console.log(docs);
                docs.forEach(doc => Object.keys(doc).forEach(k => {
                    if(k == "_id") {
                        if(collection == MONGO_COLLECTION.PLAYER) doc.pid = doc[k].toString();
                        else doc.mid = doc[k].toString();
                    }
                    // delete doc.k;
                    // console.log(k, doc[k]);
                }));
                // console.log(docs);
                const IDtoDoc = {};
                for (const obj of docs){
                    IDtoDoc[obj._id.toString()] = obj;
                    delete IDtoDoc[obj._id.toString()]._id;
                }

                const docById = {};
                for (let id of ids) {
                    if(id in IDtoDoc) docById[id] = IDtoDoc[id];
                    else docById[id] = null;
                }
                // console.log(docById);
                // let temp = docById.reduce(k => {
                //     console.log(k);
                // })
                // console.log(temp);
                return ids.map(id => docById[id] || null);
            })

    }

}
const db = new MongoDB();

const typeDefs = readFileSync('./schema.graphql').toString('utf-8');
// (parent, args, context, info)
const resolvers = {
    Query: {
        player: (_, { pid }, context) => {
            // return context.db.get_player(pid).then(data => data ? {pid} : null);
            return context.loader.player.load(pid).then(data => data ? {pid} : null);
        },
        players: async (_, {limit, offset, sort}, context) => {
            
            let ids = await db.connection.collection(MONGO_COLLECTION.PLAYER).distinct("_id");
            ids = ids.map(id => id.toString());
            return context.loader.player.loadMany(ids).then(data => data.map(pid => {
                return pid;
            }));
            // return context.loader.player.loadMany(ids).then(data => );
            // return context.db.get_players().then(data => data.map(pid => {
            //     console.log(pid);
            //     return {pid:pid._id.toString()}
            // }));
        },
        match: (_, { mid }, context) => {
            return context.loader.match.load(mid).then(data => data ? {mid} : null);
            // return context.db.get_match(mid).then(data => data ? {mid} : null);
        },
        matches: async (_, {limit, offset, sort}, context) => {
            let ids = await db.connection.collection(MONGO_COLLECTION.MATCH).distinct("_id");
            console.log(ids)
            ids = ids.map(id => id.toString());
            return context.loader.match.loadMany(ids).then(data => data.map(mid => {
                // console.log(mid)
                return mid;
            }));
        }
    },
    Mutation: {
        playerUpdate: async (_, { pid, playerInput }, context) => {
            await context.db.update_player(context,pid,playerInput);
            return {pid};
        },
        playerDelete: (_, { pid }, context) => {
            context.db.delete_player(context, pid);
            return true;
        },
        playerCreate: async (_, {playerInput}, context) => {
            let {insertedId} = await context.db.add_player(context, playerInput);
            return{pid:insertedId.toString()};
        },
        playerDeposit: async (_, {pid, amount_usd_cents},  context) => {
            await context.db.player_deposit(context,pid,amount_usd_cents);
            return {pid};
        },
        matchCreate: async (_, {entry_fee_usd_cents, prize_usd_cents, pid1, pid2}, context) => {
            let {insertedId} = await context.db.add_match(context, pid1, pid2, entry_fee_usd_cents, prize_usd_cents);
            return{mid:insertedId.toString()};
        },
        matchAward: (_, {mid, pid, points}, context) => {

        },
        matchDisqualify: (_, {mid, pid}, context) => {

        },
        matchEnd: (_, {mid}, context) => {

        }
    },
    Player: {
        balance_usd_cents: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.balance_usd_cents);
        },
        efficiency: ({ pid },_, context) => {
            return context.db.get_player(pid).then(data => data.num_join ? (data.num_won / data.num_join) : 0.0);
        },
        fname: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.fname ? data.fname : null);
        },
        handed: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.handed ? data.handed : null);
        },
        in_active_match: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.in_active_match ? data.in_active_match : null);
        },
        is_active: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.is_active);
        },
        lname: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.lname ? data.lname : null);
        },
        name: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.name ? data.name : null);
        },
        num_dq: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.num_dq ? data.num_dq : null);
        },
        num_join: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.num_join ? data.num_join : null);
        },
        num_won: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.num_won ? data.num_won : null);
        },
        pid: ({ pid },_, __) => {
            return pid;
        },
        total_points: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.total_points ? data.total_points : null);
        },
        total_prize_usd_cents: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.total_prize_usd_cents ? data.total_prize_usd_cents : null);
        }
    },
    Match: {
        age: async ({ mid }, _, context) => {

        },
        ended_at: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.ended_at ? data.ended_at : null)
        },
        entry_fee_usd_cents: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.entry_fee_usd_cents ? data.entry_fee_usd_cents : null)
        },
        is_active: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.is_active ? data.is_active : null)
        },
        is_dq: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.is_dq ? data.is_dq : null)
        },
        mid: ({ mid }, _, __) => {
          return mid;
        },
        p1: ({ mid }, _, context) => {
          return context.loader.match.load(mid)
            .then(data => {return{pid:data.p1}});
        },
        p1_points: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.p1_points ? data.p1_points : null)
        },
        p2: ({ mid }, _, context) => {
        return context.loader.match.load(mid)
            .then(data => {return {pid:data.p2}});
        },
        p2_points: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.p2_points ? data.p2_points : null)
        },
        prize_usd_cents: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.prize_usd_cents ? data.prize_usd_cents : null)
        },
        winner: ({ mid }, _, context) => {
          return context.loader.match.load(mid)
          .then(({ winner_pid }) => (winner_pid ? { pid: winner_pid } : null));
        }
      },
}
const schema = makeExecutableSchema({
    resolvers,
    // resolverValidationOptions: {
    //     // requireResolversForAllFields: 'warn',
        requireResolversToMatchSchema: 'warn',
    // },
    typeDefs
});

app.use('/graphql', graphqlHTTP(async (req) => {
    // console.log("is anything happening");
    return {
        schema,
        graphiql: true,
        context: {
            req,
            db,
            loader: db.create_loaders(),
        }
    };
}));

app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.write('');
    res.end();
    next();
});


app.listen(3000);

console.log(`GraphQL API server running at http://www.localhost.com/graphql`)
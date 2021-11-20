'use strict';

const express = require('express');
const {graphqlHTTP} = require('express-graphql');

const {readFileSync} = require('fs');
const {assertResolversPresent, makeExecutableSchema} = require('@graphql-tools/schema');

const app = express();

const { MongoClient } = require('mongodb');
const { forEach } = require("mathjs");
const DataLoader = require('dataloader');
const { now } = require('moment');

const MONGO_COLLECTION = {MATCH:"match",PLAYER:"player"};

class Validator {
    name(name){
        if(/[^a-z]/i.test(name)){
            return 0;
        }
        return 1;
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
    winner: null,
    created_at: new Date()
}
const MATCH_DQ = {
    is_dq:true,
    is_active:false,
    ended_at: new Date()
}
const MATCH_END = {
    is_active:false,
    ended_at: new Date()
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

    async player_deposit(context, pid, amount){
        try {
            let player = await context.loader.player.load(pid);
            if(player == null) throw new Error(`No player with pid:${pid}`)
            const {balance_usd_cents} = player;
            let {matchedCount} = await this.connection.collection(MONGO_COLLECTION.PLAYER)
                .updateOne({_id: this.ObjectId(pid.toString())}, {$set:{balance_usd_cents: (amount + balance_usd_cents)}});
            
            if(matchedCount == 0) throw new Error(`Cannot update player with pid:${pid}`);
            context.loader.player.clear(pid);
            
        } catch (err) {
            throw new Error(err);
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
            if(matchedCount == 0) throw new Error(`Cannot update player with pid:${pid}`);
        } catch (err) {
            throw new Error(err);
        }
    }
    async add_player(context, {fname, lname, handed, initial_balance_usd_cents}) {
        try{
            const new_player = Object.create(DEFAULT_PLAYER_ATTR);
            if(v.name(fname))new_player.fname = fname;
            else throw new Error(`${fname} is not a valid string`);
            if(v.name(lname))new_player.lname = lname;
            else throw new Error(`${lname} is not a valid string`);
            if(initial_balance_usd_cents < 0) throw `Initial balance must be greater than 0`;
            new_player.handed = handed;
            new_player.balance_usd_cents = initial_balance_usd_cents;
            new_player.name = (lname) ? fname + lname : fname;

            return this.connection.collection(MONGO_COLLECTION.PLAYER).insertOne(new_player);
        } catch(err){
            throw new Error(err);
        }
    }
    async delete_player(context, pid) {
        const {deletedCount} = await this.connection.collection(MONGO_COLLECTION.PLAYER)
            .deleteOne({_id: new this.ObjectId(pid)});

        context.loader.player.clear(pid);

        if(deletedCount == 0){
            throw new Error(`player_delete error -- pid:${pid}`);
        }
    }
    async add_match(context, pid_1, pid_2, entry_fee_usd_cents, prize_usd_cents) {
        try{
            if(entry_fee_usd_cents < 0) throw new Error(`entry_fee_usd_cents must be greater than 0`);
            if(prize_usd_cents < 0) throw new Error(`prize_usd_cents must be greater than 0`);
            if(await this.is_player_active(context, pid_1) || !(await this.is_balance_sufficient(context,pid_1,entry_fee_usd_cents) )){
                throw new Error("player 1 error");
            } 
            if(await this.is_player_active(context, pid_2) || !(await this.is_balance_sufficient(context,pid_2,entry_fee_usd_cents) )){
                throw new Error("player 2 error");
            }
            const new_match = Object.create(DEFAULT_MATCH_ATTR);
            new_match.entry_fee_usd_cents = entry_fee_usd_cents;
            new_match.prize_usd_cents = prize_usd_cents;
            new_match.p1 = pid_1;
            new_match.p2 = pid_2;

            let {acknowledged,insertedId} = await this.connection.collection(MONGO_COLLECTION.MATCH).insertOne(new_match);
            if (acknowledged){
                await this.player_join_match(context, pid_1, entry_fee_usd_cents, insertedId.toString());
                await this.player_join_match(context, pid_2, entry_fee_usd_cents, insertedId.toString());                
            } //update players

            return insertedId.toString();
        } catch(err){
            throw new Error(err)
        }
    }
    async match_points(context, mid, pid, points){
        try {
            const match = await context.loader.match.load(mid);
            if(match == null) throw new Error(`no match with mid:${mid}`);
            const {p1, p2} = match;
            if(pid == p1){
                await this.connection.collection(MONGO_COLLECTION.MATCH).updateOne({_id: this.ObjectId(mid)}, {$inc:{p1_points: points}});
                await this.player_add_field(context,pid,{total_points:points});
            }
            else if (pid == p2){
                await this.connection.collection(MONGO_COLLECTION.MATCH).updateOne({_id: this.ObjectId(mid)}, {$inc:{p1_points: points}});
                await this.player_add_field(context,pid,{total_points:points});
            }
            else throw new Error(`no player matches pid:${pid}`);
            await context.loader.match.clear(mid);
        }catch(err){
            throw new Error(err);
        }
    }
    async match_disqualify(context,mid,pid){
        try{
            const match = await context.loader.match.load(mid);
            if(match == null) throw new Error(`No match with mid:${mid}`)
            const {p1, p2,prize_usd_cents, is_active} = match;
            let winner = null; 
            let loser = null;
            // console.log(pid)
            // console.log(p1)
            // console.log(p2)
            if(!is_active) throw `Match ${mid} has already ended`;
            if(pid == p1){
                winner = p2;
                loser = p1;
            }
            else if (pid == p2){
                winner = p1;
                loser = p2;
            }
            else throw `no player matches pid:${pid}`

            let update = Object.create(MATCH_DQ)
            update.winner = winner;

            await this.players_end_match(context, loser, winner, prize_usd_cents, true);
            await this.match_change_field(context,mid,update);
        } catch(err){
            throw new Error(err);
        }
    }
    async match_end(context, mid){
        try{
            const match = await context.loader.match.load(mid);
            if(match == null) throw new Error(`No match with mid:${mid}`)
            const {p1, p1_points, p2, p2_points, prize_usd_cents, is_active} = match;
            let winner = null;
            let loser = null;
            if(!is_active) throw new Error(`Match ${mid} has already ended`);
            if(p1_points == p2_points) throw `Can't end match in tie`;
            else if (p1_points < p2_points) {
                winner = p2;
                loser = p1;
            }
            else {
                winner = p1;
                loser = p2;
            }
            let update = Object.create(MATCH_END);
            update.winner = winner;
            console.log(update.winner);
            await this.players_end_match(context,loser, winner, prize_usd_cents, false);
            await this.match_change_field(context,mid,update);
        } catch(err){
            throw new Error(err);
        }
    }

    async players_end_match(context,pid_loser, pid_winner, award, is_dq = false){
        if(is_dq) //DQ end
        {    
            await this.player_add_field(context,pid_loser,{num_dq:1});
        }

        await this.player_change_field(context,pid_loser,{in_active_match:null});
        await this.player_add_field(context,pid_winner,{num_won:1,total_prize_usd_cents:award,balance_usd_cents:award});
        await this.player_change_field(context,pid_winner,{in_active_match:null});
        await context.loader.player.clear(pid_loser);
        await context.loader.player.clear(pid_winner);
    }
    async player_join_match(context, pid, cost, mid) {
        await this.connection.collection(MONGO_COLLECTION.PLAYER).updateOne({_id: this.ObjectId(pid)}, {$inc:{balance_usd_cents: -cost,num_join:1},$set:{in_active_match:mid}});
        await context.loader.player.clear(pid);
    }
    async player_add_field(context, pid, update){
        await this.connection.collection(MONGO_COLLECTION.PLAYER).updateOne({_id: this.ObjectId(pid)}, {$inc:update});
        await context.loader.player.clear(pid);
    }
    async player_change_field(context,pid,updates){
        await this.connection.collection(MONGO_COLLECTION.PLAYER).updateOne({_id: this.ObjectId(pid)}, {$set:updates});
        await context.loader.player.clear(pid);
    }
    async match_change_field(context, mid, updates){
        console.log(updates)
        await this.connection.collection(MONGO_COLLECTION.MATCH).updateOne({_id: this.ObjectId(mid)}, {$set:updates});
        await context.loader.match.clear(mid);
    }
    async is_player_active(context, pid){
        try{
        const {in_active_match, is_active} = await context.loader.player.load(pid);
        return (in_active_match || !is_active) ? true : false;
        } catch(err){
            throw new Error(err)
        }

    }
    async is_balance_sufficient(context, pid, cost){
        const {balance_usd_cents} = await context.loader.player.load(pid);
        return (balance_usd_cents >= cost);
    }

    create_loaders() {
        return {
            match: new DataLoader(ids => this._batch(MONGO_COLLECTION.MATCH, ids)),
            player: new DataLoader(ids => this._batch(MONGO_COLLECTION.PLAYER, ids)),
        }
    }
    async _batch(collection, ids = []){
        const obj_ids = ids.map(obj => new this.ObjectId(obj));
        return this.connection.collection(collection).find({_id: {$in:obj_ids}})
            .toArray()
            .then(docs => {
                docs.forEach(doc => Object.keys(doc).forEach(k => {
                    if(k == "_id") {
                        if(collection == MONGO_COLLECTION.PLAYER) doc.pid = doc[k].toString();
                        else doc.mid = doc[k].toString();
                    }
                }));

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
            return context.loader.player.load(pid).then(data => data ? {pid} : null);
        },
        players: async (_, {limit, offset, sort}, context) => {
            let ids = await db.connection.collection(MONGO_COLLECTION.PLAYER).distinct("_id");
            ids = ids.map(id => id.toString());
            return context.loader.player.loadMany(ids.slice(offset,limit)).then(data => data.map(pid => { return pid;}));
        },
        match: (_, { mid }, context) => {
            return context.loader.match.load(mid).then(data => data ? {mid} : null);
        },
        matches: async (_, {limit, offset, sort}, context) => {
            let ids = await db.connection.collection(MONGO_COLLECTION.MATCH).distinct("_id");
            ids = ids.map(id => id.toString());
            return context.loader.match.loadMany(ids.slice(offset,limit)).then(data => data.map(mid => {return mid;}));
        }
    },
    Mutation: {
        playerUpdate: async (_, { pid, playerInput }, context) => {
            await context.db.update_player(context,pid,playerInput);
            return {pid};
        },
        playerDelete: async (_, { pid }, context) => {
            await context.db.delete_player(context, pid);
            return true;
        },
        playerCreate: async (_, {playerInput}, context) => {
            try {
                let {insertedId} = await context.db.add_player(context, playerInput);
                return{pid:insertedId.toString()};
            } catch(err){
                console.log(err);
            }
        },
        playerDeposit: async (_, {pid, amount_usd_cents},  context) => {
            await context.db.player_deposit(context,pid,amount_usd_cents);
            return {pid};
        },
        matchCreate: async (_, {entry_fee_usd_cents, prize_usd_cents, pid1, pid2}, context) => {
            try {
                let insertedId = await context.db.add_match(context, pid1, pid2, entry_fee_usd_cents, prize_usd_cents);
                return {mid:insertedId};
            } catch(err){
                console.log(err);
            }
        },
        matchAward: async (_, {mid, pid, points}, context) => {
            if(points <= 0) throw `Points awarded must be greater than 0`;
            await context.db.match_points(context,mid,pid,points);
            return {mid};
        },
        matchDisqualify: async (_, {mid, pid}, context) => {
            await context.db.match_disqualify(context,mid,pid);
            return {mid};
        },
        matchEnd: async (_, {mid}, context) => {
            await context.db.match_end(context, mid);
            return {mid};
        }
    },
    Player: {
        balance_usd_cents: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.balance_usd_cents);
        },
        efficiency: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.num_join ? (data.num_won / data.num_join) : 0.0);
        },
        fname: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.fname ? data.fname : null);
        },
        handed: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.handed ? data.handed : null);
        },
        in_active_match: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => {return (data.in_active_match) ? {mid:data.in_active_match} : null});
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
            return context.loader.player.load(pid).then(data => data.num_dq ? data.num_dq : 0);
        },
        num_join: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.num_join ? data.num_join : 0);
        },
        num_won: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.num_won ? data.num_won : 0);
        },
        pid: ({ pid },_, __) => {
            return pid;
        },
        total_points: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.total_points ? data.total_points : 0);
        },
        total_prize_usd_cents: ({ pid },_, context) => {
            return context.loader.player.load(pid).then(data => data.total_prize_usd_cents ? data.total_prize_usd_cents : 0);
        }
    },
    Match: {
        age: async ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => !data.is_active ? parseInt( (new Date - data.created_at) / 1e3, 10) : null)
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
            return context.loader.match.load(mid).then(data => data.p1_points )
        },
        p2: ({ mid }, _, context) => {
        return context.loader.match.load(mid)
            .then(data => {return {pid:data.p2}});
        },
        p2_points: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.p2_points)
        },
        prize_usd_cents: ({ mid }, _, context) => {
            return context.loader.match.load(mid).then(data => data.prize_usd_cents ? data.prize_usd_cents : null)
        },
        winner: ({ mid }, _, context) => {
          return context.loader.match.load(mid)
          .then(data => {return (data.winner) ? {pid:data.winner} : null});
        }
      },
}
const schema = makeExecutableSchema({
    resolvers,
    resolverValidationOptions: {
        requireResolversForAllFields: 'warn',
        requireResolversToMatchSchema: 'warn',
    },
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
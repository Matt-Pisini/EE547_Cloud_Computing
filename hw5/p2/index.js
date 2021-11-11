'use strict';

const express = require('express');
const {graphqlHTTP} = require('express-graphql');

const {readFileSync} = require('fs');
const {assertResolversPresent, makeExecutableSchema} = require('@graphql-tools/schema');

const app = express();

const { MongoClient } = require('mongodb');
const { forEach } = require("mathjs");
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
    async get_player(id){
        try {
            if(id.length != 24){
                return null;
            }
            let key_value = {_id:this.ObjectId(id.toString())};
            return await this.connection.collection('player').findOne(key_value);
        } catch (err) {
            console.log(err);
        }
    }
    async get_players(){
        try {
            return await this.connection.collection('player').find({}).toArray();
        } catch (err) {
            console.log(err);
        }
    }
    async get_match(id){
        try {
            if(id.length != 24){
                return null;
            }
            let key_value = {_id:this.ObjectId(id.toString())};
            return this.connection.collection('match').findOne(key_value);
        } catch (err) {
            console.log(err);
        }
    }

}
const mongo = new MongoDB();

const typeDefs = readFileSync('./schema.graphql').toString('utf-8');
// const resolvers = require('./resolvers');
// (parent, args, context, info)
const resolvers = {
    Query: {
        player: (_, { pid }, context) => {
            return context.db.get_player(pid).then(data => data ? {pid} : null);
        },
        players: async (_, {limit, offset, sort}, context) => {
            return context.db.get_players().then(data => data.map(pid => {
                return {pid:pid._id.toString()}
            }));
        },
        match: (_, { mid }, context) => {
            return context.db.get_match(mid).then(data => data ? {mid} : null);
        },
        matches: (_, {limit, offset, sort}, context) => {
            return context.db.get_players().then(data => data.map(mid => {
                return {mid:mid._id.toString()}
            }));
        }
    },
    Mutation: {
        playerUpdate: (_, { pid, playerInput }, context) => {
            return {pid};
        },
        playerDelete: (_, { pid }, context) => {
            return true;
        }

    },
    Player: {
        // balance_usd_cents: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.balance_usd_cents ? data.balance_usd_cents : 0);
        // },
        // efficiency: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.fname ? data.fname : null);
        // },
        fname: ({ pid },_, context) => {
            return context.db.get_player(pid).then(data => data.fname ? data.fname : null);
        },
        // handed: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.handed ? data.handed : null);
        // },
        // in_active_match: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.is_active ? data.is_active : true);
        // },
        // is_active: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.is_active ? data.is_active : true);
        // },
        lname: ({ pid },_, context) => {
            return context.db.get_player(pid).then(data => data.lname ? data.lname : null);
        },
        // name: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.name ? data.nname : null);
        // },
        // num_dq: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.num_dq ? data.num_dq : 0);
        // },
        // num_join: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.num_join ? data.num_join : 0);
        // },
        // num_won: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.num_won ? data.num_won : 0);
        // },
        pid: ({ pid },_, __) => {
            return pid;
        },
        // total_points: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.total_points ? data.total_points : null);
        // },
        // total_prize_usd_cents: ({ pid },_, context) => {
        //     return context.db.get_player(pid).then(data => data.total_prize_usd_cents ? data.total_prize_usd_cents : null);
        // }
    },
    Match: {

    }
}
const schema = makeExecutableSchema({
    resolvers,
    // resolverValidationOptions: {
    //     // requireResolversForAllFields: 'warn',
    //     requireResolversToMatchSchema: 'warn'
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
            db: mongo,
            userCache: {}
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
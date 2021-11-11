// (parent, args, context, info)
const resolvers = {
    Query: {
        player: (_, { pid }, context) => {
            // return context.db.collection("player").findOne({_id:ObjectId(pid.toString())})
            // .then(data => data ? {_id} : null);
            console.log("here");
            return context.db.get_player(pid).then(data => data ? {pid} : null);
        },
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
        pid: ({ pid },_, __) => {
            return pid;
        },
        lname: async (_, { pid }, context) => {
            console.log("HERE");
            const {lname} = await context.db.collection("player").findOne({_id:ObjectId(pid.toString())});
            return (lname ? lname : null);
        }

    },
    Match: {

    }
}
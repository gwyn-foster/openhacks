const builder = require('botbuilder');
const teamsbuilder = require('botbuilder-teams');
const restify = require('restify');
const fetch = require('node-fetch');
const async = require('async');

const connector = new teamsbuilder.TeamsChatConnector({
    appId: 'b6380be8-1cf0-4aff-8511-491e241616d7',
    appPassword: 'wsmmwKNLUG72]peAK230$%%'
})

const bot = new builder.UniversalBot(connector, [
    (session) =>{
        session.beginDialog('trivia')
    }

])

bot.dialog('trivia',[

    (session, args) => {

        // const response = args.response.entity.toLowerCase();
        // const teamId = session.message.sourceEvent.team.id;

        (async function() {

            if (session.message.sourceEvent.team !== undefined){
                session.send ('You must use this in a one-on-one chat');
                session.endDialog();
                return;
            }
            var format = {
                "id": session.message.address.user.aadObjectId
            }
            console.log(format)
            var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/question',{
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                    body: JSON.stringify(format)
            });
            data = await response.json();
            //session.send (JSON.stringify(data));

            console.log(data)
            var blue = {}
            data.questionOptions.forEach(x=>{
                blue[x.text] = { ...x, qid: data.id }
            })
            session.userData.answers = blue;
            builder.Prompts.choice(session, data.text, blue);

        })()
    },

    (session, args) => {
        //console.log('MUFFFFFFFFINS' , answers[args.response.entity]);
        //console.log(args.response.entity, 'MUFFFFFFFFIIIIIINNNNSSS');
        var answerObj =  session.userData.answers[args.response.entity]

            console.log(session.message.address.user);
            (async function() {
                let format = {
                    "userId": session.message.address.user.aadObjectId,
                    "questionId": answerObj.qid,
                    "answerId": answerObj.id
                }
                //session.send(JSON.stringify(format));
                var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/answer',{
                        headers: { 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify(format)
                });
                let data = await response.json();
                //session.send (JSON.stringify(data));

                if(data.correct === false){

                    // session.beginDialog('trivia')

                    session.send("You are wrong.");
                }
                else {

                    session.send("You are right");
                }

                session.beginDialog('trivia')
            })()
        }
        //builder.Prompts.choice(session, 'What do you need help with?', ['Question','Answer','Greeting']);

]);

bot.on('conversationUpdate', (msg)=>{
    if (msg.sourceEvent.team !== null){
    const teamId = msg.channelData.team.id;
    connector.fetchMembers(session.message.address.serviceUrl, teamId, (err, info) => {
        if (err) {
            session.send("sorry, registration error");
        } else {
            console.log(info);
            //session.send('You said: %s', JSON.stringify(info));

            (async function() {
                var format = {
                    "teamId": teamId,
                    "members": info.map(x=>{
                        return {
                            id: x.objectId,
                            name: x.name
                        }
                    })
                }
            })()
        }
    })
}
})

const server = restify.createServer();
server.get(/\/public\/?.*/, restify.serveStatic({
    directory: './public'
}));
server.post('/api/messages', connector.listen());
server.listen(3333);

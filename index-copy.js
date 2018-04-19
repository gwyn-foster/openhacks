const builder = require('botbuilder');
const teamsbuilder = require('botbuilder-teams');
const restify = require('restify');
const fetch = require('node-fetch');
const async = require('async');

const connector = new teamsbuilder.TeamsChatConnector({
    appId: 'b6380be8-1cf0-4aff-8511-491e241616d7',
    appPassword: 'wsmmwKNLUG72]peAK230$%%'
})

var answers= {};

const bot = new builder.UniversalBot(connector, [
    (session) => {
        builder.Prompts.choice(session, 'What do you need help with?', ['Question','Answer','Greeting', 'register']);
    },
    (session, args) => {
        const response = args.response.entity.toLowerCase();
        if (response === 'greeting') {
            session.send('Wekcome to OpenHack')
        } else if (response === 'fact') {
            session.send('openhack is awesome')
        } else if (response == 'register') {
            const teamId = session.message.sourceEvent.team.id;
            connector.fetchMembers(session.message.address.serviceUrl, teamId, (err, info) => {
                if (err) {
                    session.send("sorry, registration error");
                } else {
                    console.log(info);
                    //session.send('You said: %s', JSON.stringify(info));

                    (async function() {
                        let format = {
                            "teamId": teamId,
                            "members": info.map(x=>{
                                return {
                                    id: x.objectId,
                                    name: x.name
                                }
                            })
                        }
                        //session.send(JSON.stringify(format));
                        console.log(format);
                        var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/register', {
                                headers: { 'Content-Type': 'application/json' },
                                method: 'POST',
                                body: JSON.stringify(format)
                        });
                        let data = await response.json();
                        session.send(JSON.stringify(data));
                    })()
                }
            });
        } else if (response === 'info') {
            const teamId = session.message.sourceEvent.team.id;
            connector.fetchTeamInfo(session.message.address.serviceUrl, teamId, (err, info) => {
                if (err) {
                    session.send('Sorry, I couldn\'t help');
                    return;
                }
                session.send(info.name);
            })
        }
        else if (response === 'question'){
            (async function() {
            console.log(session.message.address.user)
                let format = {
                    "id": session.message.address.user.aadObjectId
                }
                console.log(format)
                var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/question',{
                        headers: { 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify(format)
                });
                let data = await response.json();
                //session.send (JSON.stringify(data));

                var blue = {}
                data.questionOptions.forEach(x=>{
                    blue[x.text] = x
                })
                builder.Prompts.choice(session, data.text, blue);

            })()
            function(session, results){
                if (results.response){
                    var answer = answers[results.response.entity];
                    session.send (`You answwered ${answer.text}`)
                }
            }
        }
        else if (response=== 'answer'){

            console.log(answers[args.response.entity]);


            console.log(session.message.address.user);
            (async function() {
                let format = {
                    "userId": session.message.address.user.aadObjectId,
                    "questionId": 0,
                    "answerId": 0
                }
                //session.send(JSON.stringify(format));
                var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/answer',{
                        headers: { 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify(format)
                });
                let data = await response.json();
                session.send (JSON.stringify(data));
            })()
        }
    }
]);

const server = restify.createServer();
server.post('/api/messages', connector.listen());
server.listen(3333);

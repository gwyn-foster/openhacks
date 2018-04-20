const builder = require('botbuilder');
const teamsbuilder = require('botbuilder-teams');
const restify = require('restify');
const fetch = require('node-fetch');
const async = require('async');
const botauth = require("botauth");
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const expressSession = require('express-session');




const WEBSITE_HOSTNAME = 'hack021.ngrok.io'//"https://login.microsoftonline.com";
const PORT = 443;
// const BOTAUTH_SECRET = "BOTAUTH_SECRET";
const BOTAUTH_SECRET = "foo";
const AZUREAD_APP_ID = "b6380be8-1cf0-4aff-8511-491e241616d7";
const AZUREAD_APP_PASSWORD = "wsmmwKNLUG72]peAK230$%%";
const AZUREAD_APP_REALM = "common";


const connector = new teamsbuilder.TeamsChatConnector({
    appId: 'b6380be8-1cf0-4aff-8511-491e241616d7',
    appPassword: 'wsmmwKNLUG72]peAK230$%%'
})



const bot = new builder.UniversalBot(connector, [
    (session) =>{
        session.beginDialog('trivia')
    }
])

// const bot = new builder.UniversalBot(connector)

// bot.dialog("/", new builder.IntentDialog()
//     .matches(/logout/, "/logout")
//     .matches(/signin/, "/signin")
//     .matches(/trivia/, "/trivia")
//     .onDefault((session, args) => {
//         session.endDialog("welcome");
//     })
// );

// bot.dialog('/trivia', [
bot.dialog('trivia', [

    (session, args) => {

        // const response = args.response.entity.toLowerCase();
        // const teamId = session.message.sourceEvent.team.id;

        (async function () {

            if (session.message.sourceEvent.team !== undefined) {
                session.send('You must use this in a one-on-one chat');
                session.endDialog();
                return;
            }
            var format = {
                "id": session.message.address.user.aadObjectId
            }
            console.log(format)
            var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/question', {
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                body: JSON.stringify(format)
            });
            data = await response.json();
            //session.send (JSON.stringify(data));

            console.log(data)
            var blue = {}
            data.questionOptions.forEach(x => {
                blue[x.text] = { ...x, qid: data.id }
            })
            session.userData.answers = blue;
            builder.Prompts.choice(session, data.text, blue);

        })()
    },

    (session, args) => {

        console.log("asdfsdfs")
        //console.log('MUFFFFFFFFINS' , answers[args.response.entity]);
        //console.log(args.response.entity, 'MUFFFFFFFFIIIIIINNNNSSS');

        // session.beginDialog('/logout')
        // return
        // if (args.response.entity === 'logout') {
        //     session.beginDialog('/logout')
        // }
        var answerObj = session.userData.answers[args.response.entity]


        console.log(session.message.address.user);
        (async function () {
            let format = {
                "userId": session.message.address.user.aadObjectId,
                "questionId": answerObj.qid,
                "answerId": answerObj.id
            }

            //session.send(JSON.stringify(format));
            var response = await fetch('https://msopenhack.azurewebsites.net/api/trivia/answer', {
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                body: JSON.stringify(format)
            });
            let data = await response.json();
            //session.send (JSON.stringify(data));


            if (data.correct === false) {

                // session.beginDialog('trivia')

                session.send("You are wrong.");
            }
            else {

                let format = {
                    "@odata.type": "microsoft.graph.openTypeExtension",
                    "extensionName": "com.msopenhack.trivia",
                    "badge": data.achievementBadge
                }

                var token = "eyJ0eXAiOiJKV1QiLCJub25jZSI6IkFRQUJBQUFBQUFEWDhHQ2k2SnM2U0s4MlRzRDJQYjdySGNvQ0lCV1p3OTFSR1BaVzFYS2MzNXdKX3BETmFxS3FYUmFmXzBHWE9FbjRNekFVT0tTUXdId2JjcklqcnF3NmdhV2sxTGJicGdyUFp1eEs0a255LWlBQSIsImFsZyI6IlJTMjU2IiwieDV0IjoiRlNpbXVGckZOb0Mwc0pYR212MTNuTlpjZURjIiwia2lkIjoiRlNpbXVGckZOb0Mwc0pYR212MTNuTlpjZURjIn0.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8wY2Q0MTU4ZS1kMGNhLTQ4N2EtOTQ2OC0xOTE5MTgxZTM3ZDAvIiwiaWF0IjoxNTI0MjQ3NjUzLCJuYmYiOjE1MjQyNDc2NTMsImV4cCI6MTUyNDI1MTU1MywiYWNyIjoiMSIsImFpbyI6IlkyZGdZSWpoKzhvVzMxRysvQlRMNmk1eDhYVWlwakVsQVNYbDJ0ZE1QcTErZXordDR5QUEiLCJhbXIiOlsicHdkIl0sImFwcF9kaXNwbGF5bmFtZSI6IlRlYW0gRHJlYW0gQm90IFlMIiwiYXBwaWQiOiIxODkzNGNjNS04MjhmLTQ3OTYtOGEyNi02YWFkY2ViNmNjMjgiLCJhcHBpZGFjciI6IjEiLCJmYW1pbHlfbmFtZSI6IkxpdSIsImdpdmVuX25hbWUiOiJZdWJpbmciLCJpcGFkZHIiOiIxODQuOTQuMzYuODgiLCJuYW1lIjoiWXViaW5nICBMaXUiLCJvaWQiOiI4MDFmYmY1MS1mNDcyLTQ2M2UtYTBhOC1jYWU2N2Y4OTAwOGIiLCJwbGF0ZiI6IjUiLCJwdWlkIjoiMTAwMzAwMDBBQTc3MjUwNCIsInNjcCI6IlVzZXIuUmVhZCBVc2VyLlJlYWRCYXNpYy5BbGwgVXNlci5SZWFkV3JpdGUiLCJzaWduaW5fc3RhdGUiOlsia21zaSJdLCJzdWIiOiJlaENGN0w5MkdMUXQxc0ZubXQ0ak9mZ0hpVEhnMVF4cWZjV3FVRkEza040IiwidGlkIjoiMGNkNDE1OGUtZDBjYS00ODdhLTk0NjgtMTkxOTE4MWUzN2QwIiwidW5pcXVlX25hbWUiOiJ5dWJpbmdAbXNvcGVuaGFjay5jb20iLCJ1cG4iOiJ5dWJpbmdAbXNvcGVuaGFjay5jb20iLCJ1dGkiOiI5ckFrZzVhUmdrbXRSX2J1WG9ZMUFBIiwidmVyIjoiMS4wIn0.qURT_Ko7J-iLTUPGeNk0K3lBktv2syipuktNjXcosRCeCHf5MHT-hJEKKL_Ql8vVb8eH9Cs8PFf6vT8qYJ5KSXH6igb2dY-dRskiWexHws9NE-WsH0GxBP1u-ZAbbRrL6XwRnR4c_mw9Zj4Fqu6w5RdS6s0tcSt_Ry4mj5G8MNGk-N9HVh9AkcRcG-AYerC8jwmhkq-VEIW-M4MGOaeEnkDB54Osf8DVDH2P6JY448mkPI5xeb9neUOzGCjWw1BaYSOyZpWGR9qlYFkIPqfUNDOSXkf7HQVc5d_58n_r5wdYyYVfQ13c3LMkI-LnwSYcdpKBz1GO61B574DJm-Z7wg"
                var response = await fetch('https://graph.microsoft.com/v1.0/me/extensions', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer '+ token //+ sesssion.userData.accessToken
                    },
                    method: 'POST',
                    body: JSON.stringify(format)
                });

                console.log(response)

                var dataToSend = [{ "id": '1', "eventType": '', 
                    "subject": 'asdfas', 
                    "eventTime": new Date().toString, 
                    "data":{ blue:'red' }, 
                    "dataVersion": '1.0' 
                }]

                var response = await fetch('https://teamdreamtopic.westus2-1.eventgrid.azure.net/api/events', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer '+ token //+ sesssion.userData.accessToken
                    },
                    method: 'POST',
                    body: JSON.stringify(dataToSend)
                });

                console.log(response)

                // console.log("post graph response", response);


                /* POST TO TOPIC
                var resp =
                 https://docs.microsoft.com/en-us/azure/event-grid/post-to-custom-topic
                 
                 
                 https://teamdreamtopic.westus2-1.eventgrid.azure.net/api/events
                 
                 
                 
                 https://<topic-endpoint>?api-version=2018-01-01 
                 https://exampletopic.westus2-1.eventgrid.azure.net/api/events?api-version=2018-01-01 [{ "id": string, "eventType": string, "subject": string, "eventTime": string-in-date-time-format, "data":{ object-unique-to-each-publisher }, "dataVersion": string }]
                 
             */
                session.send("You are right");
            }

            // session.beginDialog('/trivia')
            
            session.beginDialog('trivia')
        })()
    }
    //builder.Prompts.choice(session, 'What do you need help with?', ['Question','Answer','Greeting']);

]);

bot.on('conversationUpdate', (msg) => {
    if (msg.sourceEvent.team !== null) {
        const teamId = msg.channelData.team.id;
        connector.fetchMembers(session.message.address.serviceUrl, teamId, (err, info) => {
            if (err) {
                session.send("sorry, registration error");
            } else {
                console.log(info);
                //session.send('You said: %s', JSON.stringify(info));
                (async function () {
                    var format = {
                        "teamId": teamId,
                        "members": info.map(x => {
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

server.use(expressSession({ secret: BOTAUTH_SECRET, resave: true, saveUninitialized: false }));


var ba = new botauth.BotAuthenticator(server, bot, { session: true, baseUrl: `https://${WEBSITE_HOSTNAME}`, secret: BOTAUTH_SECRET, successRedirect: '/code' });

ba.provider("aadv2", (options) => {
    // Use the v2 endpoint (applications configured by apps.dev.microsoft.com)
    // For passport-azure-ad v2.0.0, had to set realm = 'common' to ensure authbot works on azure app service
    let oidStrategyv2 = {
        redirectUrl: "https://hack021.ngrok.io/botauth/aadv2/callback", //  redirect: /botauth/aadv2/callback
        realm: AZUREAD_APP_REALM,
        clientID: AZUREAD_APP_ID,
        clientSecret: AZUREAD_APP_PASSWORD,
        identityMetadata: 'https://login.microsoftonline.com/' + AZUREAD_APP_REALM + '/v2.0/.well-known/openid-configuration',
        skipUserProfile: false,
        validateIssuer: false,
        //allowHttpForRedirectUrl: true,
        responseType: 'code',
        responseMode: 'query',
        scope: ['email', 'profile', 'offline_access', 'user.readwrite'],
        passReqToCallback: true
    };

    let strategy = oidStrategyv2;

    return new OIDCStrategy(strategy,
        (req, iss, sub, profile, accessToken, refreshToken, done) => {
            if (!profile.displayName) {
                return done(new Error("No oid found"), null);
            }
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            done(null, profile);
        });
});

bot.dialog("/logout", (session) => {

    console.log("logging out")
    ba.logout(session, "aadv2");
    session.endDialog("logged_out");
});

bot.dialog("/signin", [].concat(
    ba.authenticate("aadv2"),
    (session, args, skip) => {
        let user = ba.profile(session, "aadv2");
        session.endDialog(user.displayName);
        session.userData.accessToken = user.accessToken;
        session.userData.refreshToken = user.refreshToken;
        session.beginDialog('/trivia');
    }
));


function getAccessTokenWithRefreshToken(refreshToken, callback) {
    var data = 'grant_type=refresh_token'
        + '&refresh_token=' + refreshToken
        + '&client_id=' + AZUREAD_APP_ID
        + '&client_secret=' + encodeURIComponent(AZUREAD_APP_PASSWORD)

    var options = {
        method: 'POST',
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        body: data,
        json: true,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };

    request(options, function (err, res, body) {
        if (err) return callback(err, body, res);
        if (parseInt(res.statusCode / 100, 10) !== 2) {
            if (body.error) {
                return callback(new Error(res.statusCode + ': ' + (body.error.message || body.error)), body, res);
            }
            if (!body.access_token) {
                return callback(new Error(res.statusCode + ': refreshToken error'), body, res);
            }
            return callback(null, body, res);
        }
        callback(null, {
            accessToken: body.access_token,
            refreshToken: body.refresh_token
        }, res);
    });
}

server.get(
    '/code'
, restify.plugins.serveStatic({
    'directory': __dirname + '/public',
    'file': 'code.html'
  }));

server.get(
    // `/assets/*`,
    /\/assets\/.*/,
    restify.plugins.serveStatic({
        directory: `${__dirname}/static`, // `${app_root}/static`,
        appendRequestPath: false
    })
)

server.post('/api/messages', connector.listen());
server.listen(4333);

const builder = require('botbuilder');
const teamsbuilder = require('botbuilder-teams');
const restify = require('restify');
const fetch = require('node-fetch');
const async = require('async');
const botauth = require("botauth");
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const expressSession = require('express-session');




const WEBSITE_HOSTNAME = "WEBSITE_HOSTNAME";
const PORT = 4333;
const BOTAUTH_SECRET = "BOTAUTH_SECRET";
const AZUREAD_APP_ID = "18934cc5-828f-4796-8a26-6aadceb6cc28";
const AZUREAD_APP_PASSWORD = "hkpXUDG97$qagmLSM678;@!";
const AZUREAD_APP_REALM = "common";


const connector = new teamsbuilder.TeamsChatConnector({
    appId: 'b6380be8-1cf0-4aff-8511-491e241616d7',
    appPassword: 'wsmmwKNLUG72]peAK230$%%'
})


const bot = new builder.UniversalBot(connector)

bot.dialog("/", new builder.IntentDialog()
    .matches(/logout/, "/logout")
    .matches(/signin/, "/signin")
    .matches(/trivia/, "/trivia")
    .onDefault((session, args) => {
        session.endDialog("welcome");
    })
);

bot.dialog('/trivia',[

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

                    // TODO: this is where we post to 
/*
POST https://graph.microsoft.com/v1.0/me/extensions
Content-type: application/json
{
    "@odata.type":"microsoft.graph.openTypeExtension",
    "extensionName":"com.msopenhack.trivia",
    "badge": x.achievementBadge
}

POST TO TOPIC
https://docs.microsoft.com/en-us/azure/event-grid/post-to-custom-topic

https://<topic-endpoint>?api-version=2018-01-01 
https://exampletopic.westus2-1.eventgrid.azure.net/api/events?api-version=2018-01-01 [{ "id": string, "eventType": string, "subject": string, "eventTime": string-in-date-time-format, "data":{ object-unique-to-each-publisher }, "dataVersion": string }]

*/
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

server.use(expressSession({ secret: BOTAUTH_SECRET, resave: true, saveUninitialized: false }));


var ba = new botauth.BotAuthenticator(server, bot, { session: true, baseUrl: `https://${WEBSITE_HOSTNAME}`, secret : BOTAUTH_SECRET, successRedirect: '/code' });

ba.provider("aadv2", (options) => {
    // Use the v2 endpoint (applications configured by apps.dev.microsoft.com)
    // For passport-azure-ad v2.0.0, had to set realm = 'common' to ensure authbot works on azure app service
    let oidStrategyv2 = {
      redirectUrl: options.callbackURL, //  redirect: /botauth/aadv2/callback
      realm: AZUREAD_APP_REALM,
      clientID: AZUREAD_APP_ID,
      clientSecret: AZUREAD_APP_PASSWORD,
      identityMetadata: 'https://login.microsoftonline.com/' + AZUREAD_APP_REALM + '/v2.0/.well-known/openid-configuration',
      skipUserProfile: false,
      validateIssuer: false,
      //allowHttpForRedirectUrl: true,
      responseType: 'code',
      responseMode: 'query',
      scope: ['email', 'profile', 'offline_access', 'https://outlook.office.com/mail.read'],
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


function getAccessTokenWithRefreshToken(refreshToken, callback){
    var data = 'grant_type=refresh_token'
          + '&refresh_token=' + refreshToken
          + '&client_id=' + AZUREAD_APP_ID
          + '&client_secret=' + encodeURIComponent(AZUREAD_APP_PASSWORD)
  
    var options = {
        method: 'POST',
        url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        body: data,
        json: true,
        headers: { 'Content-Type' : 'application/x-www-form-urlencoded' }
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
    `/assets/*`,
    restify.plugins.serveStatic({
    directory: `${__dirname}/static`, // `${app_root}/static`,
    appendRequestPath: false
    })
)

server.post('/api/messages', connector.listen());
server.listen(4333);

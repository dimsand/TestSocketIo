var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var login = require('./routes/login');
var game = require('./routes/game');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Store people in chatroom
var players = [];

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', login);
app.use('/game', game);

// Get le dernier id user
app.get('/getLastUserId', function (req, res) {
  console.log('PLAYERS : ');
  console.log(players)
  if(players.length > 0){
      res.send({
          'status': 'OK',
          'lastUserId': players[(players.length)-1].id
      });
  }else{
      res.send({
          'status': 'NOPLAYERS'
      });
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//////////////////////////////////////////////////////////////
// EVENEMENTS SOCKETS PROVENANT DU CLIENT
io.on('connection', function(socket) {
  
    // Affichage de la page
    socket.on('init', function() {
        console.log('nb users : ' + players.length);
        socket.broadcast.emit('majNbStats', players);
    });

    // New User
    socket.on('newUser', function(user) {
        if(socket.user == null && socket.user == undefined){
            socket.user = user;
            socket.broadcast.emit('notifyNewUser', {newPlayer: user, players: players});
            console.log('maj adversaire')
            socket.emit('majListAdversaires', {newPlayer: user, players: players});
            socket.broadcast.emit('majNbStats', players);
        }else{
            socket.emit('alreadyLogged', user);
        }
    });

    // Nouvelle demande de défi
    socket.on('newDefi', function(JEU) {
      console.log(JEU);
        var searchPlayer2 = players.find(u => u.id === parseInt(JEU.Player2.id))
        JEU.Player2 = searchPlayer2;
        console.log("JOueur qui défi : " + JEU.Player1.name)
        console.log("JOueur défié : " + JEU.Player2.name)
        socket.broadcast.emit('newPartie', JEU);
    });

    // Lancement de la partie
    socket.on('lancerPartieServeur', function(JEU) {
        socket.broadcast.emit('lancerPartieClients', JEU);
    });

    // User disconnect with leave button
    socket.on('disconnectUser', function(user){
        console.log('DISCONNECT HERE !!!')
        console.log(user);
        console.log(players);
        let player = players.find(u => parseInt(u.id) === parseInt(user.id))
        if(player){
            console.log('user '+user.name+' disconnected from leaving button');
            players = players.filter(u => parseInt(u.id) !== parseInt(user.id));
            socket.broadcast.emit('notifyDeconnectUser', {oldUser: user, players: players});
            socket.user = null;
            console.log("USERS RESTANTS : ");
            console.log(players);
            socket.broadcast.emit('majNbStats', players);          
        }
    });

    // User disconnect with close windows
    socket.on('disconnect', function(){
        if(socket.user != null && socket.user != undefined){
            let player = players.find(u => parseInt(u.id) === parseInt(socket.user.id))
            if(player){
                console.log('user '+socket.user.name+' disconnected from close window');
                players = players.filter(u => parseInt(u.id) !== parseInt(socket.user.id));
                socket.broadcast.emit('notifyDeconnectUser', socket.user);
                socket.user = null;
                socket.broadcast.emit('majNbStats', players);
            }
        }
    });

});

module.exports = {app: app, server: server};
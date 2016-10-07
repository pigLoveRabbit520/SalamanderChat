/**
 * Created by mh on 2016/9/15.
 */
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var redisStore = require('connect-redis')(session);
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('./config');

app.use(express.static('public'));

// 设置session
app.use(session({
    secret: 'ldjfdhslf',
    name: 'chat.id',
    cookie: {maxAge: 24 * 60 * 60 * 1000},
    resave: false,
    saveUninitialized: true
}));
// 模板目录
app.set("views", './views');
// 模板引擎
app.set('view engine', 'ejs');

app.use(function (req, res, next) {
    var url = req.originalUrl;
    if(url != '/login' && url != '/register' && !req.session.uid) {
        res.redirect('/login');
    } else {
        next();
    }
});

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/login', function(req, res) {
    res.render('login');
});

app.get('/register', function(req, res) {
    res.render('register');
});

// 连接列表
var connectionList = {};


io.sockets.on('connection', function (socket) {

    var socketId = socket.id;

    /*客户端连接时，保存socketId和用户名*/
    connectionList[socketId] = {
        socket: socket
    };

    /* 用户进入聊天室，向其他用户广播其用户名*/
    socket.on('join', function (data) {
        console.log(data.username + ' join, IP: ' + socket.client.conn.remoteAddress);
        connectionList[socketId].username = data.username;
        socket.broadcast.emit('broadcast_join', data);
    });

    /*用户离开聊天室，向其他用户广播其离开*/
    socket.on('disconnect', function () {
        if (connectionList[socketId].username) {
            console.log(connectionList[socketId].username + ' quit');
            socket.broadcast.emit('broadcast_quit', {
                username: connectionList[socketId].username
            });
        }
        delete connectionList[socketId];
    });

    /*用户发言，向其他用户广播其信息*/
    socket.on('say', function (data) {
        console.log("Received Message: " + data.text);
        socket.broadcast.emit('broadcast_say', {
            username: connectionList[socketId].username,
            text: data.text
        });
    });


});

http.listen(3000, function() {
    console.log('listening on *:3000');
});



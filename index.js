/**
 * Created by salamander on 2016/9/15.
 */
let express = require('express');
let session = require('express-session');
let bodyParser = require("body-parser");
let cookieParser = require('cookie-parser');
let redisStore = require('connect-redis')(session);
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let mysql = require('mysql');

let config = require('./config');

let conn = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database:'jupan_mail',
    port: 3306
});


app.use(bodyParser.urlencoded({ extended: true }));
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

// 注册用户
app.post('/register', function(req, res) {
    let nickname = req.body.nickname;
    let password = req.body.password;
    console.log(nickname);
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



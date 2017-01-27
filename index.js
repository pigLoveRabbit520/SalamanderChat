/**
 * @author salamander
 */
let express = require('express');
let session = require('express-session');
let bodyParser = require("body-parser");
let cookieParser = require('cookie-parser');
let RedisStore = require('connect-redis')(session);
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
var cookie = require('cookie');
let mysql = require('mysql');

const COOKIE_SECRET = 'ldjfdhslf';

let config = require('./config');

let conn = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database:'chat',
    port: 3306
});

let sessionStore =  new RedisStore({
        host: "127.0.0.1",
        port: 6379,
        db: "0"
});

// 连接数据库
conn.connect();

// 设置 Cookie
app.use(cookieParser(COOKIE_SECRET));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 设置session
app.use(session({
    secret: COOKIE_SECRET,
    name: 'chat.id',
    store: sessionStore,
    cookie: {maxAge: 24 * 60 * 60 * 1000},
    resave: false,
    saveUninitialized: true
}));

// 模板目录
app.set("views", './views');
// 模板引擎
app.set('view engine', 'ejs');

// 中间件
app.use(function (req, res, next) {
    var url = req.originalUrl;
    if(url != '/login' && url != '/register' && !req.session.uid) {
        res.redirect('/login');
    } else {
        next();
    }
});

app.get('/', function(req, res) {
    //res.render('index', {url: config.url});
    res.render('main');
});

app.get('/login', function(req, res) {
    res.render('login');
});

// 登录接口
app.post('/login', function (req, res) {
    let nickname = req.body.nickname;
    let password = req.body.password;
    if(!nickname || !password) {
        res.send({errcode: 1, errmsg: '填写信息不完整'});
    } else {
        nickname = nickname.trim();
        password = password.trim();
        conn.query("SELECT id, nickname FROM user WHERE nickname = ? AND password = ?", [nickname, password], function (err, rows) {
            if(err) {
                res.send({errcode: 1, errmsg: '查询失败'});
            } else {
                if(rows && rows[0]) {
                    req.session.uid = rows[0]['id'];
                    req.session.nickname = rows[0]['nickname'];
                    res.send({errcode: 0, errmsg: '登录成功！'});
                } else {
                    res.send({errcode: 1, errmsg: '登录失败！'});
                }
            }
        });
    }
});

app.get('/register', function(req, res) {
    res.render('register');
});

// 注册用户
app.post('/register', function(req, res) {
    let nickname = req.body.nickname;
    let password = req.body.password;
    if(!nickname || !password) {
        res.send({errcode: 1, errmsg: '填写信息不完整'});
    } else {
        nickname = nickname.trim();
        password = password.trim();
        conn.query("INSERT INTO user SET nickname = ?, password = ?", [nickname, password], function (err, value) {
            if(err) {
                res.send({errcode: 1, errmsg: '注册失败！'});
            } else {
                res.send({errcode: 0, errmsg: '用户id为' + value.insertId});
            }
        })
    }
});

// 设置socket的session验证
io.use(function (socket, next) {
    let cookies = cookie.parse(socket.request.headers.cookie);
    let sessionId = cookies['chat.id'];
    if(sessionId) {
        var connected = cookieParser.signedCookie(sessionId, COOKIE_SECRET);
        if(connected) {
            sessionStore.get(connected, function (error, session) {
                if (error) {
                    return next(new Error(error.message));
                } else {
                    // save the session data and accept the connection
                    if (session.uid) {
                        socket.request.session = session;
                        next(null, true)
                    } else {
                        next('No login')
                    }
                }
            })
        } else {
            return next(new Error('No Session'));
        }
    } else {
        return next(new Error('No Session'));
    }
});


// 连接列表
var connectionList = {};

io.sockets.on('connection', function (socket) {

    let socketId = socket.id;

    let session = socket.request.session; // session

    /*客户端连接时，保存socketId和用户名*/
    connectionList[socketId] = {
        socket: socket
    };

    /* 用户进入聊天室，向其他用户广播其用户名*/
    console.log(session.nickname + ' join, IP: ' + socket.client.conn.remoteAddress);
    socket.broadcast.emit('broadcast_join', {nickname : session.nickname});

    /*用户离开聊天室，向其他用户广播其离开*/
    socket.on('disconnect', function () {
        console.log(session.nickname + ' quit');
        socket.broadcast.emit('broadcast_quit', {
            username: session.nickname
        });
        delete connectionList[socketId];
    });

    /* 用户发言，向其他用户广播其信息 */
    socket.on('say', function (data) {
        console.log("Received Message: " + data.text);
        socket.broadcast.emit('broadcast_say', {
            dataType : 0,
            nickname: session.nickname,
            text: data.text
        });
    });

    /* 用户发言，向其他用户广播其信息 */
    socket.on('img', function (data) {
        console.log("Received img: ");
        socket.broadcast.emit('broadcast_img', {
            dataType : 1,
            nickname: session.nickname,
            img: data
        });
    });


});

http.listen(3000, function() {
    console.log('listening on *:3000');
});



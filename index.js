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
let cookie = require('cookie');
let mysql = require('mysql');

let config = require('./config');

let sessionStore =  new RedisStore({
    host: "127.0.0.1",
    port: 6379,
    db: 0
});

let chat = require('./chat')(http, sessionStore);

let conn = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456mh',
    database:'chat',
    port: 3306
});

// 连接数据库
conn.connect();

// 设置 Cookie
app.use(cookieParser(config.COOKIE_SECRET));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 设置session
app.use(session({
    secret: config.COOKIE_SECRET,
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
    res.render('main', {url: config.url});
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


http.listen(3000, function() {
    console.log('listening on *:3000');
});



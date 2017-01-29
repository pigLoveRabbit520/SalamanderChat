/**
 * Created by salamander on 2017/1/29.
 */
let cookie = require('cookie');
let cookieParser = require('cookie-parser');
let config = require('./config');
let socketIO = require('socket.io');

/**
 * 聊天主程序
 * @param io
 * @param sessionStore
 */
function init(io, sessionStore) {
    // 设置socket的session验证
    io.use(function (socket, next) {
        let cookies = cookie.parse(socket.request.headers.cookie);
        let sessionId = cookies['chat.id'];
        if(sessionId) {
            var connected = cookieParser.signedCookie(sessionId, config.COOKIE_SECRET);
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
                            next(new Error('No Login'))
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


    // 在线用户
    var onlineUsers = {};

    io.sockets.on('connection', function (socket) {

        let socketId = socket.id;

        let session = socket.request.session; // session

        /* 客户端连接时，保存socketId和昵称和uid */
        onlineUsers[socketId] = {
            nickname : session.nickname,
            uid : session.uid
        };

        /* 用户进入聊天室，发送在线用户列表*/
        console.log(session.nickname + ' join, IP: ' + socket.client.conn.remoteAddress);
        //socket.broadcast.emit('broadcast_join', {nickname : session.nickname});
        socket.emit('online users', onlineUsers);

        /*用户离开聊天室，向其他用户广播其离开*/
        socket.on('disconnect', function () {
            console.log(session.nickname + ' quit');
            socket.broadcast.emit('broadcast_quit', {
                username: session.nickname
            });
            delete onlineUsers[socketId];
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
}

module.exports = function (http, sessionStore) {
    let io = socketIO(http);
    init(io, sessionStore);
};


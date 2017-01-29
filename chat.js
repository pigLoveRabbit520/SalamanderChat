/**
 * Created by salamander on 2017/1/29.
 */
let cookie = require('cookie');
let cookieParser = require('cookie-parser');
let config = require('./config');
let socketIO = require('socket.io');

// 在线用户
let onlineUsers = {};
let usersSockets = {};

/**
 * 深拷贝
 * @param source
 * @returns {{}}
 */
function deepCopy(source) {
    let result = {};
    for (var key in source) {
        result[key] = typeof source[key]=== 'object' ? deepCopy(source[key]): source[key];
    }
    return result;
}

/**
 * 获取在线用户列表，删除自己
 * @param socketId
 */
function getOnlineUsers(socketId) {
    let newUsers = deepCopy(onlineUsers);
    delete newUsers[socketId];
    return newUsers;
}

/**
 * 根据uid查找对应的socketId
 * @param uid
 * @returns {string}
 */
function getSocketIdByUid(uid) {
    for (let socketId in onlineUsers) {
        if(onlineUsers[socketId].uid == uid) {
            return socketId;
        }
    }
    return '';
}

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


    io.sockets.on('connection', function (socket) {
        let socketId = socket.id;

        let session = socket.request.session; // session

        /* 客户端连接时，保存socketId和昵称和uid */
        onlineUsers[socketId] = {
            nickname : session.nickname,
            uid : session.uid
        };
        usersSockets[socketId] = socket;

        /* 用户进入聊天室，发送在线用户列表 */
        console.log(session.nickname + ' join, IP: ' + socket.client.conn.remoteAddress);

        //socket.broadcast.emit('broadcast_join', {nickname : session.nickname});
        socket.emit('online users', getOnlineUsers(socketId));

        /*用户离开聊天室，向其他用户广播其离开*/
        socket.on('disconnect', function () {
            console.log(session.nickname + ' quit');
            socket.broadcast.emit('broadcast_quit', {
                username: session.nickname
            });
            delete onlineUsers[socketId];
            delete usersSockets[socketId];
        });

        /* 用户发言，向接受用户发送其信息 */
        socket.on('say', function (toUid, data) {
            let toSocketId = getSocketIdByUid(toUid);
            data.nickname = session.nickname;
            usersSockets[toSocketId].emit('say', session.uid, data)
        });

    });
}

module.exports = function (http, sessionStore) {
    let io = socketIO(http);
    init(io, sessionStore);
};


/**
 * Created by salamander on 2017/1/29.
 */
var chatApp = new Vue({
    el: "#list",
    data: {
        messages: []
    },
    filters: {
        convertType: function (type) {
            return type === 0 ? 'me' : 'other';
        }
    }
});

// 用户消息，根据不同的socketId
var usersMessages = {};

/* 展示消息 */
function showMessage(data) {
    chatApp.$data.messages.push(data);
}

/*收到别人发的消息广播后，显示消息*/
socket.on('say', function (fromUid, data) {
    data.type = 1;
    document.getElementById('chat-audio').play();
    if(fromUid == uid) {
        showMessage(data);
    } else {

    }
});

/*点击发送按钮*/
document.getElementById('send').onclick = function () {
    var keywords = document.getElementById('keywords');
    if (keywords.value === '') {
        keywords.focus();
        return false;
    }
    var data = {
        text: keywords.value,
    };
    /* 向服务器提交一个say事件，发送消息，第一个参数用接收消息用户socketId */
    socket.emit('say', uid, data);
    data.type = 0;

    showMessage(data);
    keywords.value = "";
    keywords.focus();
};

document.getElementById('send-img').onclick = function () {
    document.getElementById('img-file').click();
};

document.getElementById('img-file').addEventListener('change', function() {
    if (this.files.length != 0) {
        var file = this.files[0],
            reader = new FileReader();
        if (!reader) {
            alert('你的浏览器不支持FileReader');
            return;
        }
        reader.onload = function(e) {
            var data = {
                type: 0,
                dataType : 1,
                img: e.target.result
            };
            socket.emit('say', uid, data);
            showMessage(data);
        };
        reader.readAsDataURL(file);
    }
}, false);

/*展示通知*/
function showNotice(data) {
    var item = '<dd class="tc"><span>' + data.text + '</span><dd>';
    document.getElementById('list').innerHTML += item;
}

/*回车事件*/
document.onkeyup = function (e) {
    if (!e) e = window.event;
    if ((e.keyCode || e.which) == 13) {
        document.getElementById('send').click();
    }
};
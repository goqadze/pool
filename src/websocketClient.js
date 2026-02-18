var socket;
if (!window.WebSocket) {
    window.WebSocket = window.MozWebSocket;
}
if (window.WebSocket) {
    socket = new WebSocket("ws://127.0.0.1:8282/websocket");
    socket.onmessage = function(event) {

    };
    socket.onopen = function(event) {

    };
    socket.onclose = function(event) {

    };
} else {
    alert("Your browser does not support Web Socket.");
}

function send(message) {
    if (!window.WebSocket) { return; }
    if (socket.readyState == WebSocket.OPEN) {
        socket.send(message);
    } else {
        alert("The socket is not open.");
    }
}
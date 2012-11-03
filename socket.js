var http = require("http"),
    spawn = require("child_process").spawn,
    websocketServer = require(__dirname + "/node_modules/websocket/index.js").server,
    fs = require("fs"),
    config = JSON.parse(fs.readFileSync(__dirname + "/config.json")),
    log = console.log;

/** --- HTTP --- **/
var httpServer = http.createServer(function() {});
httpServer.listen(config.port, config.host);

/** --- WEBSOCKET --- **/
var ws = new websocketServer({
    httpServer: httpServer
});

ws.on("request", function(request) {
    if(request.origin !== "file://") {
        log("Request rejected");
        request.reject();
        return;
    }
    
    var connection = request.accept(null, request.origin);
    
    connection.on("message", function(data) {
        if(data.type !== "utf8") return;
        var msg = JSON.parse(data.utf8Data);
        if(!msg.type || !msg.params) return;
        if(Handler[msg.type]) Handler[msg.type](msg.params, connection); 
    });
});

var Handler = {
    "run" : function(p, c) {
        if(!p.url) return;
        
        // Remove file protocol
        var path = p.url.substr(8);
        
        var child = spawn("node", [path]);
        child.stdout.on("data", dataEvent);
        child.stderr.on("data", dataEvent);
        
        function dataEvent(data) {
            var data = data.toString();
            c.sendUTF(JSON.stringify({
                "type" : "data",
                "params" : {
                    "data" : data
                }
            }));
        }
    }
};
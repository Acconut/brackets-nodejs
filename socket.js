var http = require("http"),
    spawn = require("child_process").spawn,
    websocketServer = require(__dirname + "/node_modules/websocket/index.js").server,
    fs = require("fs"),
    config = JSON.parse(fs.readFileSync(__dirname + "/config.json")),
    log = console.log;

/** --- HTTP --- **/
var httpServer = http.createServer(function() {});
httpServer.listen(config.port, config.host);

/** --- CHILDPROCESS --- **/
var Cp = {
    "child" : {},
    "run" : function(path) {
        this.terminate();
        this.child = spawn("node", [path]);
    },
    "terminate" : function() {
        if(this.child.kill) this.child.kill();
    }
};

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
    
    log("Connection accepted");
    var connection = request.accept(null, request.origin);
    
    connection.on("message", function(data) {
        if(data.type !== "utf8") return;
        var msg = JSON.parse(data.utf8Data);
        if(!msg.type || !msg.params) return;
        if(Handler[msg.type]) Handler[msg.type](msg.params, connection); 
    });
    
    connection.on("close", function(code) {
        Cp.terminate();
    });
});

var Handler = {
    "run" : function(p, c) {
        if(!p.url) return;
        
        // Remove file protocol
        var path = p.url.substr(8);
        
        log("Running %s", path);
        
        Cp.run(path);
        Cp.child.stdout.on("data", dataEvent);
        Cp.child.stderr.on("data", dataEvent);
        
        function dataEvent(data) {
            var data = data.toString();
            c.sendUTF(JSON.stringify({
                "type" : "data",
                "params" : {
                    "data" : data
                }
            }));
        }
    },
    "terminate" : function(p, c) {
        Cp.terminate();
    }
};
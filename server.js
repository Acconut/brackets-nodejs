(function () {
    "use strict";

    var http = require("http"),
        url = require("url"),
        exec = require("child_process").exec,
        config = require("./config.json"),
        server = null,
        EOL = "\n",
        API_VERSION = 1;

    exports.init = function () {

        server = http.createServer(function (req, res) {
            var query = url.parse(req.url, true);

            // Path in query is required and only or eventsource
            if(query && query.path && req.headers.accept === "text/event-stream") {

                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache"
                });

                // Send data to the eventsource
                var send = function (data) {
                    
                    var d = data.toString().split(EOL);
                    for(var i = 0, l = d.length; i < l; i++) {

                        // Support for ansi colors and text decorations
                        var di = d[i].replace(/\x1B\[/g, "\\x1B[");

                        res.write("data: " + di + EOL + EOL + EOL);
                    }
                };

                // Test api version
                if(!query.query.apiversion || query.query.apiversion != API_VERSION) {
                    send("Client's api version (" + query.query.apiversion + ") does not match the server's one (" + API_VERSION + ").");
                    send("Please restart Bracket's process (close all instances).");
                    send("If a restart does not solve the problem, please report it on Github.");
                    res.end();
                    return;
                }

                try {

                    var command = query.query.command,
                        arg = query.query.arg,
                        cwd = query.query.cwd,
                        dir;
                    
                    if(cwd) {
                        dir = cwd;
                    }

                    var child = exec(command, {
                        cwd: dir,
                        silent: true
                    });


                    child.stdout.on("data", send);
                    child.stderr.on("data", send);

                    child.stdout.on("end", function (code) {
                        res.end();
                    });
                    
                    child.on("error", function(err) {
                        console.log(err);
                    });

                } catch(err) {
                    send("Internal brackets-nodejs error (please report on Github):");
                    send(err.stack);
                    res.end();
                }

                // Kill child process at end of request
                // if it's still running
                req.on("close", function () {
                    console.log("end");
                    send("Process terminated.");
                    process.kill(child.pid, "SIGINT");
                });

            } else {

                // Response with some basic text
                res.writeHead(200, {
                    "Content-Type": "text/plain"
                });
                res.end("This is just an event-server");
            }

        });
        
        // Remove timeout
        server.timeout = 0;
        
        server.listen(config.port);

        // Another server may be running on this port
        // inside another brackets instance.
        // Instead of crashing the process and causing
        // the interface to throw errors keep
        // running and smile :)
        process.on("uncaughtException", function (err) {
            if(err.code == "EADDRINUSE") {
                console.log("Server unable to listen. Address already in use");

                // Keep the event loop running using some noop-stuff
                setInterval(function () {}, 60 * 1000);
                return;
            }

            throw err;
        });
    };

    //exports.init();
}());
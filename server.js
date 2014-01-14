(function () {
	"use strict";

	var http   = require("http"),
	    url    = require("url"),
	    spawn  = require("child_process").spawn,
	    path   = require("path"),
	    config = require("./config.json"),
	    which  = require("which"),
	    server = null,
	    EOL    = "\n";
	
	exports.init = function() {
		
		server = http.createServer(function(req, res) {
			var query = url.parse(req.url, true);
			
			// Path in query is required and only or eventsource
			if(query && query.path && req.headers.accept === "text/event-stream") {
				
				res.writeHead(200, {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache"
				});
				
				// Send data to the eventsource
				var send = function(data) {
					var d = data.toString().split(EOL);
					for(var i = 0, l = d.length; i < l; i++) {
						
						// Support for ansi colors and text decorations
						var di = d[i].replace(/\x1B\[/g, "\\x1B[");
						
						res.write("data: " + di + EOL + EOL + EOL);
					}
				}
				
				try {
				
					var modulePath = decodeURIComponent(query.query.path),
						args = query.query["args[]"] || [],
						command = "",
						dir = path.dirname(decodeURIComponent(query.query.path)),
						npmCmd = query.query.npm;
					
					// Get path via which
					try {
						command = which.sync("node");
					} catch(e) {
						command = process.execPath || "node";
					}
					
					// Add path to module
					if(!npmCmd) args.unshift(modulePath);
					
					// Add npm support
					if(npmCmd && ["start", "stop", "test", "install"].indexOf(npmCmd) > -1) {
						command = "npm";
						if(query.query.npm_path) command = query.query.npm_path;
						args.unshift(npmCmd);
					} else if(query.query.node_path) command = query.query.node_path;
					
					
					
					var child = spawn(
						command,
						args,
						{
							cwd: dir,
							silent: true
						}
					);
					
					
					child.stdout.on("data", send);
					child.stderr.on("data", send);
					
					child.stdout.on("end", function(code) {
						res.end();
					});
					
				} catch(err) {
					send(err.stack);
					res.end();
				}
				
				// Kill child process at end of request
				// if it's still running
				req.on("close", function() {
					child.kill('SIGTERM');
				});
				
			} else {
				
				// Response with some basic text
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("This is just an event-server");
			}
			
		});
		
    server.listen(config.port);
    
    // Another server may be running on this port
    // inside another brackets instance.
    // Instead of crashing the process and causing
    // the interface to throw errors keep
    // running and smile :)
    process.on("uncaughtException", function(err) {
      if(err.code == "EADDRINUSE") {
        console.log("Server unable to listen. Address already in use");
        
        // Keep the event loop running using some noop-stuff
        setInterval(function() {}, 60 * 1000);
        return;
      }
      
      throw err;
    });
	};
  
  //exports.init();
}());

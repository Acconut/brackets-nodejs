(function () {
    "use strict";
    
    var http			= require("http"),
		url				= require("url"),
		spawn			= require("child_process").spawn,
		path			= require("path"),
		config 			= require("./config.json"),
		which			= require("which"),
		server			= null,
		EOL				= "\n";
	
    exports.init = function() {
		
		server = http.createServer(function(req, res) {
			var query = url.parse(req.url, true);
			
			// Path in query is required and only or eventsource
			if(query && query.path && req.headers.accept === "text/event-stream") {
				
				var modulePath = decodeURIComponent(query.query.path),
					args = query.args || [],
					command = "",
					dir = path.dirname(decodeURIComponent(query.query.path));
				
				// Get path via which
				try {
					command = which.sync("node");
				} catch(e) {
					command = "node";
				}
				
				args.unshift(modulePath);
				
				// Add npm suppoert
				if(query.query.npm && ["start", "stop", "test"].indexOf(query.query.npm) > -1) {
					command = "npm";
					if(query.query.npm_path) command = query.query.npm_path;
					args.unshift(query.query.npm);
					args.pop();
				} else if(query.query.node_path) command = query.query.node_path;
				
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
					if(child.disconnect) child.disconnect();
				});
				
			} else {
				
				// Response with some basic text
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("This is just a event-server");
			}
			
		});
		try {
			server.listen(config.port);
		} finally {}
	};
}());
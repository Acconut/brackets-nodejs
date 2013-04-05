/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

(function () {
    "use strict";
    
    var http			= require("http"),
		url				= require("url"),
		spawn			= require("child_process").spawn,
		path			= require("path"),
		config 			= require("./config.json"),
		server			= null,
		EOL				= "\n";
		

    exports.init = function() {
		
		server = http.createServer(function(req, res) {
			var query = url.parse(req.url, true);
			
			if(query && query.path && req.headers.accept === "text/event-stream") {
				
				var modulePath = "" + decodeURIComponent(query.query.path) + "",
					args = query.args || [],
					command = "node",
					dir = path.dirname(decodeURIComponent(query.query.path));
				
				
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
				
				try {
					var child = spawn(
						command,
						args,
						{
							cwd: dir,
							silent: true
						}
					);
					
					var send = function(data) {
						var d = data.toString().split(EOL);
						for(var i = 0, l = d.length; i < l; i++) {
							res.write("data: " + d[i] + EOL + EOL + EOL);
						}
					}
					
					
					child.stdout.on("data", send);
					child.stderr.on("data", send);
					
					child.stdout.on("end", function(code) {
						res.end();
					});
					
				} catch(err) {
					res.write("data: " + err);
					res.end();
				}
				
			} else {
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("This is just a event-server");
			}
			
		});
		try {
			server.listen(config.port);
		} finally {}
	};
	
}());
define(function (require, exports, module) {
    "use strict";
    
    /** --- MODULES --- **/
    var CommandManager  = brackets.getModule("command/CommandManager"),
        Menus           = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
		ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
		NodeConnection  = brackets.getModule("utils/NodeConnection"),
		Dialogs			= brackets.getModule("widgets/Dialogs"),
		ansi			= require("ansi"),
		nodeConnection  = new NodeConnection(),
		NodeMenuID		= "node-menu",
		NodeMenu		= Menus.addMenu("Node.js", NodeMenuID),
		source			= null,
		connected		= false,
		NODE_DIALOG_ID	= "node-settings-dialog",
		LS_PREFIX		= "node-";
    
	
	/** --- SHORTCUTS FOR LOCALSTORAGE --- **/
	function get(name) {
		return localStorage.getItem(LS_PREFIX + name);
	}
	function set(name, value) {
		return localStorage.setItem(LS_PREFIX + name, value);
	}
	function rm(name) {
		return localStorage.removeItem(LS_PREFIX + name);
	}
	
    /** --- CONFIG --- **/
    var config = JSON.parse(require("text!config.json"));
    
	/** --- CONNECT TO NODE --- **/
    nodeConnection.connect(true).then(function () {
		nodeConnection.loadDomains(
			[ExtensionUtils.getModulePath(module, "server.js")],
			true
		).then(
			function () {
				connected = true;
			},
			function () { /* Failed to connect */ }
		);
	});
	
	/** --- CONNECTION MANAGER --- **/
	var ConnectionManager = {
		buildUrl: function(path, args, npm, clear) {
			args = args || [];
			npm = npm || false;
			
			var str = "http://" + config.host + ":" + config.port + "/?path=" + encodeURIComponent(path);
			if(npm) {
				str += "&npm=" + npm;
				var npmPath = get("npm");
				if(npmPath) str += "&npm_path=" + encodeURIComponent(npmPath);
			} else {
				var nodePath = get("node");
				if(nodePath) str += "&node_path=" + encodeURIComponent(nodePath);
			}
			for(var i = 0, l = args.length; i < l; i++) {
				str += "args[]=" + encodeURIComponent(args[i]);
			}
			
			if(clear !== false) {
				Panel.show();
				Panel.clear();
			}
			return str;
		},
		
		"new": function(args, npm, clear) {
			if(source && source.close) source.close();
			
			if(connected || true) {
				source = new EventSource(
					ConnectionManager.buildUrl(
						DocumentManager.getCurrentDocument().file.fullPath,
						args,
						npm,
						clear
					)
				);
			}
			
			source.addEventListener("message", function(msg) {
				Panel.write(msg.data);
			}, false);
			source.addEventListener("error", function() {
				source.close();
				Panel.write("Programm exited.");
			}, false);
		},
		exit: function() {
			if(connected) source.close();
		}
	};
	
    /** --- PANEL --- **/
    $(".content").append(require("text!panel.html"));
    var Panel = {
		id : "brackets-nodejs-terminal",
		panel: null,
		height: 201,
		
		get: function(qs) {
			return this.panel.querySelector(qs);
		},
		
		show : function() {
			this.panel.style.display = "block";
			EditorManager.resizeEditor();
		},
		hide : function() {
			this.panel.style.display = "none";
			EditorManager.resizeEditor();
		},
		clear : function() {
			this.pre.innerHTML = null;
		},
		write : function(str) {
			var e = document.createElement("div");
			e.innerHTML = ansi(str.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
			this.pre.appendChild(e);
		},
		
		mousemove: function(e) {
			
			var h = Panel.height + (Panel.y - e.pageY);
			Panel.panel.style.height = h + "px";
			EditorManager.resizeEditor();
			
		},
		mouseup: function(e) {
		
			document.removeEventListener("mousemove", Panel.mousemove);
			document.removeEventListener("mouseup", Panel.mouseup);
			
			Panel.height = Panel.height + (Panel.y - e.pageY);
			
		},
		y: 0
    };
	Panel.panel = document.getElementById(Panel.id);
	Panel.pre = Panel.get(".table-container pre");
	Panel.get(".resize").addEventListener("mousedown", function(e) {
		
		Panel.y = e.pageY;
		
		document.addEventListener("mousemove", Panel.mousemove);
		document.addEventListener("mouseup", Panel.mouseup);
		
	});
	
	
	/** --- MODAL --- **/
	var Modal = {
		show: function() {
			Dialogs.showModalDialog(NODE_DIALOG_ID).done(function(id) {
				
				// Only saving
				if(id !== "save") return;
				
				var node = get("tmp-node"),
					npm = get("tmp-npm");
				
				if(node && node !== "") set("node", node);
				else rm("node");
				
				if(npm && npm !== "") set("npm", npm)
				else rm("npm");
				
			});
			
			Modal.get("node", true).value = get("node");
			Modal.get("npm", true).value = get("npm");

		},
		
		"get": function(c, i) {
			var str  = "." + NODE_DIALOG_ID + ".";
				str += (i) ? "instance" : "template";
				str += " ." + c;
			return document.querySelector(str);
		}
	}
    
    /** --- MENU --- **/
    var RUN_CMD_ID = "brackets-nodejs.run",
		RUN_NPM_START_CMD_ID = "brackets-nodejs.run_npm_start",
		RUN_NPM_STOP_CMD_ID = "brackets-nodejs.run_npm_stop",
		RUN_NPM_TEST_CMD_ID = "brackets-nodejs.run_npm_test",
		RUN_NPM_INSTALL_CMD_ID = "brackets-nodejs.run_npm_install",
		CONFIG_CMD_ID = "brackets-nodejs.config";
    CommandManager.register("Run", RUN_CMD_ID, function() {
		ConnectionManager.new([]);
    });
	CommandManager.register("Run as npm start", RUN_NPM_START_CMD_ID, function() {
		ConnectionManager.new([], "start");
	});
	CommandManager.register("Run as npm stop", RUN_NPM_STOP_CMD_ID, function() {
		ConnectionManager.new([], "stop");
	});
	CommandManager.register("Run as npm test", RUN_NPM_TEST_CMD_ID, function() {
		ConnectionManager.new([], "test");
	});
	CommandManager.register("Run as npm install", RUN_NPM_INSTALL_CMD_ID, function() {
		ConnectionManager.new([], "install");
	});
	CommandManager.register("Configuration...", CONFIG_CMD_ID, function() {
		Modal.show();
		
	});
    NodeMenu.addMenuItem(RUN_CMD_ID, "Ctrl-Alt-N");
	NodeMenu.addMenuDivider();
	NodeMenu.addMenuItem(RUN_NPM_START_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_STOP_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_TEST_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_INSTALL_CMD_ID);
	NodeMenu.addMenuDivider();
	NodeMenu.addMenuItem(CONFIG_CMD_ID);
	
    /** --- TERMINATE --- **/
    document.querySelector("#" + Panel.id + " .close-close").addEventListener("click", function() {
        ConnectionManager.exit();
        Panel.hide();
    });
    document.querySelector("#" + Panel.id + " .close-terminate").addEventListener("click", function() {
        ConnectionManager.exit();
    });
    
	$("body").append($(Mustache.render(require("text!modal.html"))));
});

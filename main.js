define(function (require, exports, module) {
    "use strict";
    
    /** --- MODULES --- **/
    var CommandManager  		= brackets.getModule("command/CommandManager"),
        Menus           		= brackets.getModule("command/Menus"),
        DocumentManager 		= brackets.getModule("document/DocumentManager"),
        EditorManager   		= brackets.getModule("editor/EditorManager"),
		ExtensionUtils  		= brackets.getModule("utils/ExtensionUtils"),
		NodeConnection  		= brackets.getModule("utils/NodeConnection"),
		Dialogs					= brackets.getModule("widgets/Dialogs"),
		ansi					= require("ansi"),
		nodeConnection  		= new NodeConnection(),
		NodeMenuID				= "node-menu",
		NodeMenu				= Menus.addMenu("Node.js", NodeMenuID),
		source					= null,
		connected				= false,
		NODE_SETTINGS_DIALOG_ID	= "node-settings-dialog",
		NODE_INSTALL_DIALOG_ID 	= "node-install-dialog",
		LS_PREFIX				= "node-";
    
	
	/**
	 * Shortcuts for localstorage with prefix
	 */
	function get(name) {
		return localStorage.getItem(LS_PREFIX + name);
	}
	function set(name, value) {
		return localStorage.setItem(LS_PREFIX + name, value);
	}
	function rm(name) {
		return localStorage.removeItem(LS_PREFIX + name);
	}
	
    /**
	 * Load the configuration
	 */
    var config = JSON.parse(require("text!config.json"));
    
	/**
	 * Start the node server
	 */
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
	
	/**
	 * The ConnectionManager helps to build and run request to execute a file on the serverside
	 */
	var ConnectionManager = {
		
		/**
		 * Builds a URL to be used inside EventSource
		 *
		 * @param: File's path to be executed
		 * @param (optional): Arguments
		 * @param (optional): One of the supported npm commands (start, stop, test, install) or empty for default node
		 * @param (optional): Clear the terminal (Default: true)
		 * @return: String
		 * @api: private
		 */
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
				str += "&args[]=" + encodeURIComponent(args[i]);
			}
			
			if(clear !== false) {
				Panel.show();
				Panel.clear();
			}
			return str;
		},
		
		/**
		 * Creates a new EventSource
		 *
		 * @param (optional): Arguments
		 * @param (optional): One of the supported npm commands (start, stop, test, install) or empty for default node
		 * @param (optional): Clear the terminal (Default: true)
		 */
		// This need to be inside quotes since new is a reserved word
		"new": function(args, npm, clear) {
			
			if(source && source.close) source.close();
			
			// Server should be running
			if(connected) {
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
		
		/**
		 * Close the current connection if server is started
		 */
		exit: function() {
			if(connected) source.close();
		}
	};
	
    /**
	 * Panel alias terminal
	 */
    $(".content").append(require("text!html/panel.html"));
    var Panel = {
		
		id : "brackets-nodejs-terminal",
		panel: null,
		height: 201,
		
		get: function(qs) {
			return this.panel.querySelector(qs);
		},
		
		/**
		 * Basic functionality
		 */
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
		
		/**
		 * Prints a string into the terminal
		 * It will be colored and then escape to prohibit XSS (Yes, inside an editor!)
		 *
		 * @param: String to be output
		 */
		write : function(str) {
			var e = document.createElement("div");
			e.innerHTML = ansi(str.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
			this.pre.appendChild(e);
		},
		
		/**
		 * Used to enable resizing the panel
		 */
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
	
	// Still resizing
	Panel.panel = document.getElementById(Panel.id);
	Panel.pre = Panel.get(".table-container pre");
	Panel.get(".resize").addEventListener("mousedown", function(e) {
		
		Panel.y = e.pageY;
		
		document.addEventListener("mousemove", Panel.mousemove);
		document.addEventListener("mouseup", Panel.mouseup);
		
	});
	
	/**
	 * Termination buttons
	 */
	document.querySelector("#" + Panel.id + " .close-close").addEventListener("click", function() {
        ConnectionManager.exit();
        Panel.hide();
    });
    document.querySelector("#" + Panel.id + " .close-terminate").addEventListener("click", function() {
        ConnectionManager.exit();
    });
	
	
	/**
	 * Modals (settings and install)
	 */
	$("body").append($(Mustache.render(require("text!html/modal-settings.html"))));
	$("body").append($(Mustache.render(require("text!html/modal-install.html"))));
	
	var Modal = {
		
		/**
		 * The settings modal is used to configure the path to node's and npm's binary
		 * HTML : html/modal-settings.html
		 */
		settings: {
			
			/**
			 * Opens up the modal
			 */
			show: function() {
				Dialogs.showModalDialog(NODE_SETTINGS_DIALOG_ID).done(function(id) {
					
					// Only saving
					if(id !== "save") return;
					
					var node = get("tmp-node"),
						npm = get("tmp-npm");
					
					if(node && node !== "") set("node", node);
					else rm("node");
					
					if(npm && npm !== "") set("npm", npm)
					else rm("npm");
					
				});
				
				Modal.settings.get("node", true).value = get("node");
				Modal.settings.get("npm", true).value = get("npm");
	
			},
			
			
			/**
			 * Get an element inside the settings modal
			 *
			 * @param: classname
			 * @param: (real) instance or just tempate
			 * return: Element
			 */
			// This need to be inside quotes since get is a reserved word
			"get": function(c, i) {
				var str  = "." + NODE_SETTINGS_DIALOG_ID + ".";
					str += (i) ? "instance" : "template";
					str += " ." + c;
				return document.querySelector(str);
			}
		},
		
		/**
		 * The install modal is used to install a module inside the directory of the current file
		 * HTML: html/modal-install.html
		 */
		install: {
			
			/**
			 * Opens up the modal
			 */
			show: function() {
				
				Dialogs.showModalDialog(NODE_INSTALL_DIALOG_ID).done(function(id) {
					
					// Only saving
					if(id !== "ok") return;
					
					// Module name musn't be empty
					if(name.value == "") {
						Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "Error", "Please enter a module name");
						return;
					}
					
					// Should it be saved to package.json
					var s = save.checked ? "--save" : "";
					
					ConnectionManager.new([name.value, s], "install");
					
				});
				
				// It's important to set the elements after the modal is rendered but before the done event
				var name = Modal.install.get("name", true),
					save = Modal.install.get("save", true);
				
				
			},
						
			/**
			 * Get an element inside the install modal
			 *
			 * @param: classname
			 * @param: (real) instance or just tempate
			 * return: Element
			 */
			// This need to be inside quotes since get is a reserved word
			"get": function(c, i) {
				var str  = "." + NODE_INSTALL_DIALOG_ID + ".";
					str += (i) ? "instance" : "template";
					str += " ." + c;
				return document.querySelector(str);
			}
		}
	}
    
    /**
	 * Menu
	 */
    var RUN_CMD_ID = "brackets-nodejs.run",
		RUN_NPM_START_CMD_ID = "brackets-nodejs.run_npm_start",
		RUN_NPM_STOP_CMD_ID = "brackets-nodejs.run_npm_stop",
		RUN_NPM_TEST_CMD_ID = "brackets-nodejs.run_npm_test",
		RUN_NPM_INSTALL_CMD_ID = "brackets-nodejs.run_npm_install",
		INSTALL_CMD_ID = "brackets-nodejs.install",
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
	CommandManager.register("Install module...", INSTALL_CMD_ID, function() {
		Modal.install.show();
	});
	CommandManager.register("Configuration...", CONFIG_CMD_ID, function() {
		Modal.settings.show();
		
	});
	
    NodeMenu.addMenuItem(RUN_CMD_ID, "Ctrl-Alt-N");
	NodeMenu.addMenuDivider();
	NodeMenu.addMenuItem(RUN_NPM_START_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_STOP_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_TEST_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_INSTALL_CMD_ID);
	NodeMenu.addMenuDivider();
	NodeMenu.addMenuItem(INSTALL_CMD_ID);
	NodeMenu.addMenuDivider();
	NodeMenu.addMenuItem(CONFIG_CMD_ID);
	
});
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
		nodeConnection  = new NodeConnection(),
		NodeMenuID		= "node-menu",
		NodeMenu		= Menus.addMenu("Node.js", NodeMenuID),
		source			= null,
		connected		= false,
		NODE_DIALOG_ID	= "node-settings-dialog",
		LS_PREFIX		= "node-";
    
	
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
				if(localStorage.getItem(LS_PREFIX + "npm")) str += "&npm_path=" + encodeURIComponent(localStorage.getItem(LS_PREFIX + "npm"));
			} else {
				if(localStorage.getItem(LS_PREFIX + "node")) str += "&node_path=" + encodeURIComponent(localStorage.getItem(LS_PREFIX + "node"));
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
				source = null;
				Panel.write("Programm exited.");
			}, false);
		},
		exit: function() {
			if(connected) source.close();
		}
	};
	
    /** --- PANEL --- **/
    var Panel = {
            "id" : "brackets-nodejs-terminal",
            "show" : function() {
                document.getElementById(this.id).style.display = "block";
                EditorManager.resizeEditor();
            },
            "hide" : function() {
                document.getElementById(this.id).style.display = "none";
                EditorManager.resizeEditor();
            },
            "clear" : function() {
                document.querySelector("#" + this.id + " .table-container pre").innerHTML = null;
            },
            "write" : function(str) {
                var e = document.createElement("div");
                e.textContent = str;
                document.querySelector("#" + this.id + " .table-container pre").appendChild(e);
            }
        };
    $(".content").append(require("text!panel.html"));
	
	/** --- MODAL --- **/
	var Modal = {
		show: function() {
			Dialogs.showModalDialog(NODE_DIALOG_ID);
			$("." + NODE_DIALOG_ID + ".instance .save").click(function() {
				
				var node = $("." + NODE_DIALOG_ID + ".instance .node").val(),
					npm = $("." + NODE_DIALOG_ID + ".instance .npm").val();
				
				if(node && node !== "") {
					localStorage.setItem(LS_PREFIX + "node", node);
					$("." + NODE_DIALOG_ID + ".template .node").val(node);
				} else {
					localStorage.removeItem(LS_PREFIX + "node");
					$("." + NODE_DIALOG_ID + ".template .node").val("");
				}
				
				if(npm && npm !== "") {
					localStorage.setItem(LS_PREFIX + "npm", npm);
					$("." + NODE_DIALOG_ID + ".template .npm").val(npm);
				} else {
					localStorage.removeItem(LS_PREFIX + "npm");
					$("." + NODE_DIALOG_ID + ".template .npm").val("");
				}
				
			});
		}
	}
    
    /** --- MENU --- **/
    var RUN_CMD_ID = "brackets-nodejs.run",
		RUN_NPM_START_CMD_ID = "brackets-nodejs.run_npm_start",
		RUN_NPM_STOP_CMD_ID = "brackets-nodejs.run_npm_stop",
		RUN_NPM_TEST_CMD_ID = "brackets-nodejs.run_npm_test",
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
	CommandManager.register("Configuration...", CONFIG_CMD_ID, function() {
		Modal.show();
		
	});
    NodeMenu.addMenuItem(RUN_CMD_ID, "Ctrl-Alt-N");
	NodeMenu.addMenuDivider();
	NodeMenu.addMenuItem(RUN_NPM_START_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_STOP_CMD_ID);
	NodeMenu.addMenuItem(RUN_NPM_TEST_CMD_ID);
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
	if(localStorage.getItem(LS_PREFIX + "node") !== null) $("." + NODE_DIALOG_ID + ".template .node").val(localStorage.getItem(LS_PREFIX + "node"));
	if(localStorage.getItem(LS_PREFIX + "npm") !== null) $("." + NODE_DIALOG_ID + ".template .npm").val(localStorage.getItem(LS_PREFIX + "npm"));
	
});

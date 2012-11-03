define(function (require, exports, module) {
    "use strict";
    
    /** --- MODULES --- **/
    var CommandManager  = brackets.getModule("command/CommandManager"),
        Menus           = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
    
    /** --- CONFIG --- **/
        Config = JSON.parse(require("text!config.json")),
    
    /** --- WEBSOCKET --- **/
        Ws = new WebSocket("ws://" + Config.host + ":" + Config.port),
        Handler = {
            "data" : function(p) {
                if(!p.data) return;
                Panel.write(p.data);
            },
            "exit" : function(p) {
                
            }
        };
    Ws.addEventListener("message", function(e) {
        var msg = JSON.parse(e.data);
        if(!msg.type || !msg.params) return;
        if(Handler[msg.type]) Handler[msg.type](msg.params); 
    });
    
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
                document.querySelector("#" + this.id + " .table-container table").innerHTML = null;
            },
            "write" : function(str) {
                var e = document.createElement("tr");
                e.textContent = str;
                document.querySelector("#" + this.id + " .table-container table").appendChild(e);
            }
        };
    $(".content").append(require("text!panel.html"));
    
    /** --- RUN MENU --- **/
    var RUN_CMD_ID = "brackets-nodejs.run";
    CommandManager.register("Run (Node.js)", RUN_CMD_ID, function() {
        Ws.send(JSON.stringify({
            "type" : "run",
            "params" : {
                "url" : DocumentManager.getCurrentDocument().url
            }
        }));
        Panel.show();
        Panel.clear();
    });
    Menus.getMenu(Menus.AppMenuBar.DEBUG_MENU).addMenuDivider();
    Menus.getMenu(Menus.AppMenuBar.DEBUG_MENU).addMenuItem(RUN_CMD_ID, "Ctrl-Alt-N");
    
});

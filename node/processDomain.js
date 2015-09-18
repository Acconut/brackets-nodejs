(function () {
    "use strict";
    
    var treekill = require("treekill"),
        exec = require("child_process").exec,
        domain = null,
        child = null,
        DOMAIN_NAME = "brackets-nodejs";

    function cmdStartProcess(command, cwd, cb) {
        if(child !== null) {
            treekill(child.pid);
        }

        child = exec(command, {
            cwd: cwd,
            silent: true
        });

        // Send data to the client
        var send = function(data) {

            // Support for ansi colors and text decorations
            data = data.toString().replace(/\x1B\[/g, "\\x1B[");
            
            domain.emitEvent(DOMAIN_NAME, "output", data);
        };

        child.stdout.on("data", send);
        child.stderr.on("data", send);

        child.on("exit", function(code) {
            cb(null, code);
        });

        child.on("error", function(err) {
            cb(err);
        });
    }
    
    function cmdStopProcess() {
        if(child !== null) {
            treekill(child.pid);
        }
    }
    
    function init(domainManager) {
        domain = domainManager;

        if(!domainManager.hasDomain(DOMAIN_NAME)) {
            domainManager.registerDomain(DOMAIN_NAME, {
                major: 0,
                minor: 0
            });
        }
        
        domainManager.registerCommand(
            DOMAIN_NAME,
            "startProcess",
            cmdStartProcess,
            true,
            "Starts the process using the supplied command",
            [
                {
                    name: "command",
                    type: "string"
                },
                {
                    name: "cwd",
                    type: "string"
                }
            ]
        );
        
        domainManager.registerCommand(
            DOMAIN_NAME,
            "stopProcess",
            cmdStopProcess,
            false,
            "Stops the process if one is already started",
            []
        );
        
        domainManager.registerEvent(
            DOMAIN_NAME,
            "output",
            [
                {
                    name: "output",
                    type: "string"
                }
            ]
        );
    }
    
    exports.init = init;

}());
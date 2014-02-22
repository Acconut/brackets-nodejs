define(function (require, exports, module) {
    "use strict";

    /** --- MODULES --- **/
    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        NodeConnection = brackets.getModule("utils/NodeConnection"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        ansi = require("ansi"),
        nodeConnection = new NodeConnection(),
        NodeMenuID = "node-menu",
        NodeMenu = Menus.addMenu("Node.js", NodeMenuID),
        source = null,
        NODE_SETTINGS_DIALOG_ID = "node-settings-dialog",
        NODE_INSTALL_DIALOG_ID = "node-install-dialog",
        NODE_EXEC_DIALOG_ID = "node-exec-dialog",
        LS_PREFIX = "node-";


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
                console.log("[brackets-nodejs] Connected to nodejs");
            }
        ).fail(
            function () {
                console.log("[brackets-nodejs] Failed to connect to nodejs. The server may be up because of another instance");
            }
        );
    });

    /**
     * The ConnectionManager helps to build and run request to execute a file on the serverside
     */
    var ConnectionManager = {

        last: [],

        //        
        /**
         * Creates a new EventSource
         *
         * @param (optional): Command name
         * @param (optional): Execute in the current working directory
         * @param (optional): Directory to use as cwd
         */
        // This need to be inside quotes since new is a reserved word
        "new": function (command, useCurrentCwd, cwd) {

            if (source && source.close) source.close();

            // Current document
            var doc = DocumentManager.getCurrentDocument();
            if (!doc.file.isFile) return;

            // Build url
            var url = "http://" + config.host + ":" + config.port + "/?command=" + encodeURIComponent(command);
            var dir = null;
            if (useCurrentCwd) {
                dir = doc.file.parentPath;
            } else if (cwd) {
                dir = cwd;
            }

            if (dir !== null) {
                url += "&cwd=" + encodeURIComponent(dir);
            }

            // Store the last command and cwd
            var lastCommand = {
                command: command,
                cwd: dir
            };
            var lastCommandLength = this.last.unshift(lastCommand);
            if (lastCommandLength > 10)
                this.last.pop();

            // Server should be running
            source = new EventSource(url);

            source.addEventListener("message", function (msg) {
                Panel.write(msg.data);
            }, false);
            source.addEventListener("error", function () {
                source.close();
                Panel.write("Program exited.");
            }, false);

            Panel.show(command);
            Panel.clear();
        },

        newNpm: function (command) {

            var npmBin = get("npm");
            if (!npmBin) {
                npmBin = "npm";
            } else {
                // Add quotation because windows paths can contain spaces
                npmBin = '"' + npmBin + '"';
            }

            this.new(npmBin + " " + command, true);

        },

        newNode: function () {

            var nodeBin = get("node");
            if (!nodeBin) {
                nodeBin = "node";
            } else {
                // Add quotation because windows paths can contain spaces
                nodeBin = '"' + nodeBin + '"';
            }

            // Current document
            var doc = DocumentManager.getCurrentDocument();
            if (!doc.file.isFile) return;

            this.new(nodeBin + ' "' + doc.file.fullPath + '"', true);

        },

        rerun: function () {

            var last = this.last;
            if (last[0].command === null) return;

            this.new(last[0].command, false, last[0].cwd);

        },

        /**
         * Close the current connection if server is started
         */
        exit: function () {
            if (source)
                source.close();
            Panel.hide();
        }
    };

    /**
     * Panel alias terminal
     */
    $(".content").append(require("text!html/panel.html"));
    var Panel = {

        id: "brackets-nodejs-terminal",
        panel: null,
        commandTitle: null,
        height: 201,

        get: function (qs) {
            return this.panel.querySelector(qs);
        },

        /**
         * Basic functionality
         */
        show: function (command) {
            this.panel.style.display = "block";
            this.commandTitle.textContent = command;
            EditorManager.resizeEditor();
        },
        hide: function () {
            this.panel.style.display = "none";
            EditorManager.resizeEditor();
        },
        clear: function () {
            this.pre.innerHTML = null;
        },

        /**
         * Prints a string into the terminal
         * It will be colored and then escape to prohibit XSS (Yes, inside an editor!)
         *
         * @param: String to be output
         */
        write: function (str) {
            var e = document.createElement("div");
            e.innerHTML = ansi(str.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            this.pre.appendChild(e);
        },

        /**
         * Used to enable resizing the panel
         */
        mousemove: function (e) {

            var h = Panel.height + (Panel.y - e.pageY);
            Panel.panel.style.height = h + "px";
            EditorManager.resizeEditor();

        },
        mouseup: function (e) {

            document.removeEventListener("mousemove", Panel.mousemove);
            document.removeEventListener("mouseup", Panel.mouseup);

            Panel.height = Panel.height + (Panel.y - e.pageY);

        },
        y: 0
    };

    // Still resizing
    Panel.panel = document.getElementById(Panel.id);
    Panel.commandTitle = Panel.get(".cmd");
    Panel.pre = Panel.get(".table-container pre");
    Panel.get(".resize").addEventListener("mousedown", function (e) {

        Panel.y = e.pageY;

        document.addEventListener("mousemove", Panel.mousemove);
        document.addEventListener("mouseup", Panel.mouseup);

    });

    /**
     * Terminal buttons
     */
    document.querySelector("#" + Panel.id + " .action-close").addEventListener("click", function () {
        ConnectionManager.exit();
        Panel.hide();
    });
    document.querySelector("#" + Panel.id + " .action-terminate").addEventListener("click", function () {
        ConnectionManager.exit();
    });
    document.querySelector("#" + Panel.id + " .action-rerun").addEventListener("click", function () {
        ConnectionManager.rerun();
    });
    document.querySelector("#" + Panel.id + " .action-execute").addEventListener("click", function () {
        var cmd = Panel.get(".cmd-value").value;
        ConnectionManager.new(cmd, true, null);
    });

    var Dialog = {
        /**
         * The settings modal is used to configure the path to node's and node's binary
         * HTML : html/modal-settings.html
         */
        settings: {

            /**
             * HTML put inside the dialog
             */
            html: require("text!html/modal-settings.html"),

            /**
             * Opens up the modal
             */
            show: function () {
                Dialogs.showModalDialog(
                    NODE_SETTINGS_DIALOG_ID, // ID the specify the dialog
                    "Node.js-Configuration", // Title
                    this.html, // HTML-Content
                    [ // Buttons
                        {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: Dialogs.DIALOG_BTN_OK,
                            text: "Save"
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: Dialogs.DIALOG_BTN_CANCEL,
                            text: "Cancel"
                        }
                    ]
                ).done(function (id) {

                    // Only saving
                    if (id !== "ok") return;

                    var node = nodeInput.value,
                        npm = npmInput.value;
                    console.log(node, npm);
                    if (node && node !== "") set("node", node);
                    else rm("node");

                    if (npm && npm !== "") set("npm", npm)
                    else rm("npm");

                });

                // It's important to get the elements after the modal is rendered but before the done event
                var nodeInput = document.querySelector("." + NODE_SETTINGS_DIALOG_ID + " .node"),
                    npmInput = document.querySelector("." + NODE_SETTINGS_DIALOG_ID + " .npm");
                nodeInput.value = get("node");
                npmInput.value = get("npm");

            }
        },

        /**
         * The install modal is used to install a module inside the directory of the current file
         * HTML: html/modal-install.html
         */
        install: {

            /**
             * HTML put inside the dialog
             */
            html: require("text!html/modal-install.html"),

            /**
             * Opens up the modal
             */
            show: function () {

                Dialogs.showModalDialog(
                    NODE_INSTALL_DIALOG_ID,
                    "Install module",
                    this.html, [{
                        className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                        id: Dialogs.DIALOG_BTN_OK,
                        text: "Install"
                    }, {
                        className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                        id: Dialogs.DIALOG_BTN_CANCEL,
                        text: "Cancel"
                    }]
                ).done(function (id) {

                    // Only saving
                    if (id !== "ok") return;

                    // Module name musn't be empty
                    if (name.value == "") {
                        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "Error", "Please enter a module name");
                        return;
                    }

                    // Should it be saved to package.json
                    var s = save.checked ? "--save" : "";

                    ConnectionManager.npm("install " + name.value + " " + s);

                });

                // It's important to get the elements after the modal is rendered but before the done event
                var name = document.querySelector("." + NODE_INSTALL_DIALOG_ID + " .name"),
                    save = document.querySelector("." + NODE_INSTALL_DIALOG_ID + " .save");

                name.focus();

            }
        },

        /**
         * The exec modal is used to execute a command
         * HTML: html/modal-install.html
         */
        exec: {

            /**
             * HTML put inside the dialog
             */
            html: require("text!html/modal-exec.html"),

            /**
             * Opens up the modal
             */
            show: function () {

                Dialogs.showModalDialog(
                    NODE_EXEC_DIALOG_ID,
                    "Execute command",
                    this.html, [{
                        className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                        id: Dialogs.DIALOG_BTN_OK,
                        text: "Run"
                    }, {
                        className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                        id: Dialogs.DIALOG_BTN_CANCEL,
                        text: "Cancel"
                    }]
                ).done(function (id) {

                    if (id !== "ok") return;

                    // Command musn't be empty
                    if (command.value == "") {
                        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "Error", "Please enter a command");
                        return;
                    }

                    // Should it be executed in the current working directory
                    var useCwd = !! cwd.checked;

                    ConnectionManager.new(command.value, useCwd);

                });

                // It's important to get the elements after the modal is rendered but before the done event
                var command = document.querySelector("." + NODE_EXEC_DIALOG_ID + " .command"),
                    cwd = document.querySelector("." + NODE_EXEC_DIALOG_ID + " .cwd");

                command.focus();

            }
        }
    };

    /**
     * Menu
     */
    var RUN_CMD_ID = "brackets-nodejs.run",
        EXEC_CMD_ID = "brackets-nodejs.exec",
        RUN_NPM_START_CMD_ID = "brackets-nodejs.run_npm_start",
        RUN_NPM_STOP_CMD_ID = "brackets-nodejs.run_npm_stop",
        RUN_NPM_TEST_CMD_ID = "brackets-nodejs.run_npm_test",
        RUN_NPM_INSTALL_CMD_ID = "brackets-nodejs.run_npm_install",
        INSTALL_CMD_ID = "brackets-nodejs.install",
        CONFIG_CMD_ID = "brackets-nodejs.config",
        SHOW_TERMINAL = "brackets-nodejs.showterminal";

    CommandManager.register("Run", RUN_CMD_ID, function () {
        ConnectionManager.newNode();
    });
    CommandManager.register("Execute command", EXEC_CMD_ID, function () {
        Dialog.exec.show();
    });
    CommandManager.register("Run as npm start", RUN_NPM_START_CMD_ID, function () {
        ConnectionManager.newNpm("start");
    });
    CommandManager.register("Run as npm stop", RUN_NPM_STOP_CMD_ID, function () {
        ConnectionManager.newNpm("stop");
    });
    CommandManager.register("Run as npm test", RUN_NPM_TEST_CMD_ID, function () {
        ConnectionManager.newNpm("test");
    });
    CommandManager.register("Run as npm install", RUN_NPM_INSTALL_CMD_ID, function () {
        ConnectionManager.newNpm("install");
    });
    CommandManager.register("Install module...", INSTALL_CMD_ID, function () {
        Dialog.install.show();
    });
    CommandManager.register("Configuration...", CONFIG_CMD_ID, function () {
        Dialog.settings.show();

    });
    CommandManager.register("Show Terminal", SHOW_TERMINAL, function () {
        Panel.show();
        Panel.clear();
    });

    NodeMenu.addMenuItem(RUN_CMD_ID, "Alt-N");
    //NodeMenu.addMenuItem(EXEC_CMD_ID);
    NodeMenu.addMenuItem(SHOW_TERMINAL, "Alt-T");
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
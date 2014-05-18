(function () {
    "use strict";
    
    var exec = require('child_process').exec
    , path = require('path');

    function open(target, appName, callback) {
      var opener;

      if (typeof(appName) === 'function') {
        callback = appName;
        appName = null;
      }

      switch (process.platform) {
      case 'darwin':
        if (appName) {
          opener = 'open -a "' + escape(appName) + '"';
        } else {
          opener = 'open';
        }
        break;
      case 'win32':
        // if the first parameter to start is quoted, it uses that as the title
        // so we pass a blank title so we can quote the file we are opening
        if (appName) {
          opener = 'start "" "' + escape(appName) + '"';
        } else {
          opener = 'start ""';
        }
        break;
      default:
        if (appName) {
          opener = escape(appName);
        } else {
          // use Portlands xdg-open everywhere else
          opener = path.join(__dirname, '../vendor/xdg-open');
        }
        break;
      }

      if (process.env.SUDO_USER) {
        opener = 'sudo -u ' + process.env.SUDO_USER + ' ' + opener;
      }
      return exec(opener + ' "' + escape(target) + '"', callback);
    }

    function escape(s) {
      return s.replace(/"/g, '\\\"');
    }
    
    /**
    * Initializes the test domain with several test commands.
    * @param {DomainManager} domainManager The DomainManager for the server
    */
    function init(domainManager) {
        if (!domainManager.hasDomain("openModule")) {
            domainManager.registerDomain("openModule", {major: 0, minor: 1});
        }
        domainManager.registerCommand(
            "openModule", // domain name
            "open", // command name
            open, // command handler function
            false, // this command is synchronous in Node
            "Opens a app",
            [{name: "target",
                type: "string",
                description: "target"}],
            [{name: "appName",
                type: "string",
                description: "name of app"}],
            [{name: "callback",
                type: "function",
                description: "result callback"}]
        );
    }    
    exports.init = init;
    
}());
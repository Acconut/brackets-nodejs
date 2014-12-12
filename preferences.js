define(function main(require, exports, module) {
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        prefs = PreferencesManager.getExtensionPrefs("brackets-nodejs");

    // Default settings
    prefs.definePreference("node-bin", "string", "");
    prefs.definePreference("npm-bin", "string", "");
    prefs.definePreference("autoscroll", "boolean", true);
    prefs.definePreference("v8-flags", "string", "");

    // Conversion from the old localstorage
    if("node-node" in localStorage) {
        prefs.set("node-bin", localStorage["node-node"]);
        localStorage.removeItem("node-node");
    }
    
    if("node-npm" in localStorage) {
        prefs.set("npm-bin", localStorage["node-npm"]);
        localStorage.removeItem("node-npm");
    }

    if("v8-flags" in localStorage) {
	   prefs.set("v8-flags", localStorage["v8-flags"]);
	   localStorage.removeItem("v8-flags");
    }

    prefs.save();

    module.exports = prefs;
});

define(function main(require, exports, module) {

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        prefs = PreferencesManager.getExtensionPrefs("brackets-nodejs");

    // Default settings
    prefs.definePreference("node-bin", "string", "");
    prefs.definePreference("npm-bin", "string", "");

    // Conversion from the old localstorage
    if("node-node" in localStorage) {
        prefs.set("node-bin", localStorage["node-node"]);
        localStorage.removeItem("node-node");
    }
    if("node-npm" in localStorage) {
        prefs.set("npm-bin", localStorage["node-npm"]);
        localStorage.removeItem("node-npm");
    }

    prefs.save();

    module.exports = prefs;

});
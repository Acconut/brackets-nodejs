define(function main(require, exports, module) {

	module.exports = function(str) {
		
		// Bold
		str = str.replace(/\\x1B\[1m/gi, "<b>")
				 .replace(/\\x1B\[22m/gi, "</b>")
		
		// Italic
				 .replace(/\\x1B\[3m/gi, "<i>")
				 .replace(/\\x1B\[23m/gi, "</i>")
		
		// Underline
				 .replace(/\\x1B\[4m/gi, "<u>")
				 .replace(/\\x1B\[24m/gi, "</u>")
		
		// Inverse
				 .replace(/\\x1B\[7m/gi, "<span style=\"-webkit-filter:invert(100%)\">")
				 .replace(/\\x1B\[27m/gi, "</span>");
		
		// Color
		var colors =  {
			
			"black": 	/\\x1B\[30m/gi,
			"red": 		/\\x1B\[31m/gi,
			"green": 	/\\x1B\[32m/gi,
			"yellow": 	/\\x1B\[33m/gi,
			"blue": 	/\\x1B\[34m/gi,
			"magenta": 	/\\x1B\[35m/gi,
			"cyan": 	/\\x1B\[36m/gi,
			"white": 	/\\x1B\[37m/gi,
			
			"grey":		/\\x1B\[90m/gi
			
		}
		
		for(var c in colors) {
			str = str.replace(colors[c], "<span style=\"color:" + c + "\">");
		}
		
		// End codes
		str = str.replace(/\\x1B\[0m/gi, "</span>")
				 .replace(/\\x1B\[39m/gi, "</span>");
		
		return str;
		
	};
	
});
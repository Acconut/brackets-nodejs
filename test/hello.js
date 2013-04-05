console.log("Hello World");
console.log("Secound line");
console.log("Third");

if(process.env.npm_package_name) console.log("I'm %s", process.env.npm_package_name);

var red, blue, reset;
red   = '\u001b[31m';
blue  = '\u001b[34m';
reset = '\u001b[0m';
console.log(red + 'This is red' + reset + ' while ' + blue + ' this is blue' + reset);

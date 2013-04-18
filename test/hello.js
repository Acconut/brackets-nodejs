console.log("Hello World");
console.log("Secound line");
console.log("Third");

if(process.env.npm_package_name) console.log("I'm %s", process.env.npm_package_name);
console.log(process.execPath);

var red, blue, reset;
red   = '\u001b[31m';
blue  = '\u001b[34m';
reset = '\u001b[0m';
console.log(red + 'This is red' + reset + ' while ' + blue + 'this is blue' + reset);

var colors = require('colors');

console.log('hello'.green); // outputs green text
console.log('i like cake and pies'.underline.red) // outputs red underlined text
console.log('inverse the color'.blue.inverse); // inverses the color
console.log('OMG Rainbows!'.rainbow); // rainbow (ignores spaces)

console.log("Zebra WOHO".zebra);

console.log("Hello World".bold);
console.log("Hello World".italic);
console.log("Hello World".underline);
console.log("Hello World".inverse);

console.log("Hello World".white);
console.log("Hello World".grey);
console.log("Hello World".black);

console.log("Hello World".blue);
console.log("Hello World".cyan);
console.log("Hello World".green);
console.log("Hello World".magenta);
console.log("Hello World".red);
console.log("Hello World".yellow);
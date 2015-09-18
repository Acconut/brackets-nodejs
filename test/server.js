var http = require("http");

http.createServer(function(req, res) {
    console.log(req.url);
    res.end("Hello world");
}).listen(7070);

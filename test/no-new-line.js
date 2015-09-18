for(var i = 0; i < 5; i++) {
    setTimeout(function() {
        process.stdout.write(". ");
    }, i * 1000);
}

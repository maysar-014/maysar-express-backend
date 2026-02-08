const fs = require('fs');
try {
    const content = fs.readFileSync('tsc_error.log', 'utf8'); // Try utf8 first
    console.log(content);
} catch (e) {
    try {
        const content = fs.readFileSync('tsc_error.log', 'utf16le'); // Try utf16le
        console.log(content);
    } catch (e2) {
        console.error('Failed to read log');
    }
}

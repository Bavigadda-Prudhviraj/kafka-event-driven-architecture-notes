// Convert "$ bin/x.sh ... config/y" lines inside <code data-lang="cmd"> blocks to Windows form.
// Usage: node winify.js <content-file>
const fs = require('fs');
const file = process.argv[2];
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/(<code data-lang="cmd">)([\s\S]*?)(<\/code>)/g, (m, a, code, b) => a + code.split('\n').map((l) => {
  const mm = l.match(/^\$ (.*)$/);
  if (!mm) return l;
  const c = mm[1]
    .replace(/bin\/([\w-]+)\.sh/g, 'bin\\windows\\$1.bat')
    .replace(/config\/([\w.-]+)/g, 'config\\$1');
  return '&gt; ' + c;
}).join('\n') + b);
fs.writeFileSync(file, s);

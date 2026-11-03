// Run a list of jobs with limited concurrency; results append to a JSONL file; finished ids are skipped on rerun.
//   node exp/pool.js jobs.json results.jsonl [concurrency]
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const [jobsFile, outFile, conc = '2'] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
const done = new Set();
if (fs.existsSync(outFile)) for (const l of fs.readFileSync(outFile, 'utf8').split('\n')) if (l.trim()) { try { done.add(JSON.parse(l).id); } catch (e) {} }
const queue = jobs.filter((j) => !done.has(j.id));
let running = 0, finished = 0;
const total = queue.length;
function next() {
  while (running < +conc && queue.length) {
    const j = queue.shift(); running++;
    const p = spawn(process.execPath, [path.join(__dirname, 'job.js'), JSON.stringify(j)]);
    let buf = '', err = '';
    p.stdout.on('data', (d) => (buf += d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      running--; finished++;
      if (code === 0 && buf.trim()) fs.appendFileSync(outFile, buf.trim() + '\n');
      else fs.appendFileSync(outFile + '.err', JSON.stringify({ id: j.id, code, err: err.slice(0, 2000) }) + '\n');
      process.stdout.write(`${finished}/${total} ${j.id} ${code === 0 ? 'ok' : 'FAIL'}\n`);
      if (queue.length) next(); else if (!running) process.stdout.write('ALL DONE\n');
    });
  }
}
if (!total) console.log('ALL DONE (nothing to run)'); else next();

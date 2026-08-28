const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const inputHtml = process.argv[2] || 'MANAGEMENT_TASKS_GUIDE.html';
const outputPdf = process.argv[3] || 'MANAGEMENT_TASKS_GUIDE.pdf';

const htmlPath = path.resolve(__dirname, '..', inputHtml);
const pdfPath = path.resolve(__dirname, '..', outputPdf);
const htmlContent = fs.readFileSync(htmlPath);
const tmpUserData = path.resolve(__dirname, '..', '.tmp_browser_profile');

if (!fs.existsSync(tmpUserData)) {
  fs.mkdirSync(tmpUserData, { recursive: true });
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlContent);
});

const PORT = 4567;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`HTTP Server running on http://127.0.0.1:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tmpUserData}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--print-to-pdf=${pdfPath}`,
    `http://127.0.0.1:${PORT}`
  ];

  console.log(`Spawning browser: ${browserPath}`);
  const child = spawn(browserPath, args, { stdio: 'inherit' });

  child.on('close', (code) => {
    console.log(`Browser process exited with code: ${code}`);
    server.close(() => {
      try {
        fs.rmSync(tmpUserData, { recursive: true, force: true });
      } catch (e) {}
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`SUCCESS: PDF generated (${stats.size} bytes) at ${pdfPath}`);
      } else {
        console.error('PDF file was not created');
      }
      process.exit(code || 0);
    });
  });

  child.on('error', (err) => {
    console.error('Failed to start browser process:', err);
    server.close();
    process.exit(1);
  });
});

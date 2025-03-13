const { exec } = require('child_process');

function killPort5000() {
  console.log('Checking for processes using port 5000...');
  
  // For Windows
  if (process.platform === 'win32') {
    exec('netstat -ano | findstr :5000', (error, stdout, stderr) => {
      if (error) {
        console.log('No processes found using port 5000.');
        return;
      }
      
      console.log('Found processes using port 5000:');
      console.log(stdout);
      
      // Extract PIDs
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 4) {
          const pid = parts[parts.length - 1];
          pids.add(pid);
        }
      });
      
      if (pids.size === 0) {
        console.log('No PIDs found to kill.');
        return;
      }
      
      console.log(`Found ${pids.size} PIDs to kill: ${Array.from(pids).join(', ')}`);
      
      // Kill each PID
      pids.forEach(pid => {
        console.log(`Killing process with PID ${pid}...`);
        exec(`taskkill /F /PID ${pid}`, (killError, killStdout, killStderr) => {
          if (killError) {
            console.error(`Error killing process ${pid}:`, killStderr);
          } else {
            console.log(`Successfully killed process ${pid}:`, killStdout);
          }
        });
      });
    });
  } 
  // For Unix-like systems (Linux, macOS)
  else {
    exec('lsof -i :5000', (error, stdout, stderr) => {
      if (error) {
        console.log('No processes found using port 5000.');
        return;
      }
      
      console.log('Found processes using port 5000:');
      console.log(stdout);
      
      // Extract PIDs
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      // Skip the header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length > 1) {
          pids.add(parts[1]);
        }
      }
      
      if (pids.size === 0) {
        console.log('No PIDs found to kill.');
        return;
      }
      
      console.log(`Found ${pids.size} PIDs to kill: ${Array.from(pids).join(', ')}`);
      
      // Kill each PID
      pids.forEach(pid => {
        console.log(`Killing process with PID ${pid}...`);
        exec(`kill -9 ${pid}`, (killError, killStdout, killStderr) => {
          if (killError) {
            console.error(`Error killing process ${pid}:`, killStderr);
          } else {
            console.log(`Successfully killed process ${pid}`);
          }
        });
      });
    });
  }
}

// Run the function
killPort5000(); 
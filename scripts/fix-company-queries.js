const fs = require('fs');
const path = require('path');

// Function to search for problematic patterns in files
function searchForProblematicPatterns(directory) {
  console.log(`Searching for problematic patterns in ${directory}...`);
  
  const problematicPatterns = [
    /Company\.findOne\(\s*{\s*where\s*:\s*{\s*recruiterId/g,
    /Company\.findAll\(\s*{\s*where\s*:\s*{\s*recruiterId/g,
    /where\s*:\s*{\s*recruiterId/g
  ];
  
  const excludeDirs = ['node_modules', '.git', 'public', 'uploads'];
  
  // Get all files recursively
  function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      
      if (stat.isDirectory() && !excludeDirs.includes(file)) {
        filelist = walkSync(filepath, filelist);
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
        filelist.push(filepath);
      }
    });
    
    return filelist;
  }
  
  const files = walkSync(directory);
  console.log(`Found ${files.length} JavaScript files to check`);
  
  let foundProblems = false;
  
  // Check each file for problematic patterns
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    problematicPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      
      if (matches) {
        console.log(`\nFound problematic pattern in ${file}:`);
        
        // Get the context around each match
        matches.forEach(() => {
          const lines = content.split('\n');
          let lineNumber = 0;
          let foundMatch = false;
          
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              lineNumber = i + 1;
              foundMatch = true;
              
              // Print context (5 lines before and after)
              console.log(`Line ${lineNumber - 5 > 0 ? lineNumber - 5 : 1} to ${lineNumber + 5 < lines.length ? lineNumber + 5 : lines.length}:`);
              
              for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
                console.log(`${j + 1}: ${lines[j]}${j === i ? ' <-- PROBLEM HERE' : ''}`);
              }
              
              break;
            }
          }
          
          if (!foundMatch) {
            // If the pattern spans multiple lines
            console.log('Pattern spans multiple lines. Manual inspection required.');
            console.log(`Snippet: ${content.substring(content.search(pattern), content.search(pattern) + 100)}...`);
          }
        });
        
        foundProblems = true;
      }
    });
  });
  
  if (!foundProblems) {
    console.log('\nNo problematic patterns found!');
  }
  
  return foundProblems;
}

// Main function
function main() {
  console.log('=== SEARCHING FOR PROBLEMATIC COMPANY QUERIES ===');
  
  const rootDir = path.resolve(__dirname, '..');
  const foundProblems = searchForProblematicPatterns(rootDir);
  
  if (foundProblems) {
    console.log('\n=== SUGGESTED FIX ===');
    console.log('Replace problematic queries with the correct approach:');
    console.log('\nINSTEAD OF:');
    console.log('const company = await Company.findOne({ where: { recruiterId: someId } });');
    console.log('\nUSE:');
    console.log('const recruiterProfile = await RecruiterProfile.findOne({ where: { id: someId } });');
    console.log('const company = recruiterProfile ? await Company.findByPk(recruiterProfile.companyId) : null;');
    
    console.log('\nOR:');
    console.log('const recruiterProfile = await RecruiterProfile.findOne({');
    console.log('  where: { id: someId },');
    console.log('  include: [{ model: Company, as: \'company\' }]');
    console.log('});');
    console.log('const company = recruiterProfile ? recruiterProfile.company : null;');
  }
  
  console.log('\n=== SEARCH COMPLETE ===');
}

main(); 
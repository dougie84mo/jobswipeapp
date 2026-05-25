const fs = require('fs');
const path = require('path');

// Function to search for the specific problematic pattern
function searchForCompanyRecruiterIdQuery(directory) {
  console.log(`Searching for Company.recruiterId queries in ${directory}...`);
  
  const problematicPatterns = [
    /Company.*where.*recruiterId/g,
    /Companies.*where.*recruiterId/g,
    /sequelize.query.*Company.*recruiterId/g,
    /sequelize.query.*Companies.*recruiterId/g
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
      if (pattern.test(content)) {
        console.log(`\nFound problematic pattern in ${file}:`);
        
        // Get the context around the match
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            const lineNumber = i + 1;
            
            // Print context (10 lines before and after)
            console.log(`Line ${lineNumber - 10 > 0 ? lineNumber - 10 : 1} to ${lineNumber + 10 < lines.length ? lineNumber + 10 : lines.length}:`);
            
            for (let j = Math.max(0, i - 10); j <= Math.min(lines.length - 1, i + 10); j++) {
              console.log(`${j + 1}: ${lines[j]}${j === i ? ' <-- PROBLEM HERE' : ''}`);
            }
          }
        }
        
        // Also check for multi-line patterns
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const index = content.indexOf(match);
            const beforeContext = content.substring(Math.max(0, index - 200), index);
            const afterContext = content.substring(index + match.length, Math.min(content.length, index + match.length + 200));
            
            console.log('\nExtended context:');
            console.log('...' + beforeContext + match + afterContext + '...');
          });
        }
        
        foundProblems = true;
      }
    });
  });
  
  if (!foundProblems) {
    console.log('\nNo problematic Company.recruiterId queries found!');
  }
  
  return foundProblems;
}

// Main function
function main() {
  console.log('=== SEARCHING FOR COMPANY.RECRUITERID QUERIES ===');
  
  const rootDir = path.resolve(__dirname, '..');
  const foundProblems = searchForCompanyRecruiterIdQuery(rootDir);
  
  if (foundProblems) {
    console.log('\n=== SUGGESTED FIX ===');
    console.log('Replace problematic queries with the correct approach:');
    console.log('\nINSTEAD OF:');
    console.log('const company = await Company.findOne({ where: { recruiterId: someId } });');
    console.log('\nUSE:');
    console.log('const recruiterProfile = await RecruiterProfile.findOne({ where: { id: someId } });');
    console.log('const company = recruiterProfile ? await Company.findByPk(recruiterProfile.companyId) : null;');
  }
  
  console.log('\n=== SEARCH COMPLETE ===');
}

main(); 
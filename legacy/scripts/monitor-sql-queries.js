const { sequelize } = require('../models');
const express = require('express');
const app = express();
const port = 3001;

// Enable query logging
const originalLogging = sequelize.options.logging;
sequelize.options.logging = (sql, timing) => {
  console.log(`[${new Date().toISOString()}] SQL Query: ${sql}`);
  
  // Check if the query contains problematic patterns
  if (sql.includes('Company') && sql.includes('recruiterId')) {
    console.log('!!! PROBLEMATIC QUERY DETECTED !!!');
    
    // Get the stack trace
    const stack = new Error().stack;
    console.log('Stack trace:', stack);
  }
  
  // Call the original logging function if it exists
  if (typeof originalLogging === 'function') {
    originalLogging(sql, timing);
  }
};

// Create a simple API endpoint to test database queries
app.get('/api/test', async (req, res) => {
  try {
    // Test a simple query
    const companies = await sequelize.query(
      'SELECT * FROM Companies LIMIT 5',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    res.json({ success: true, companies });
  } catch (error) {
    console.error('Error executing test query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create an endpoint to test the problematic query
app.get('/api/test-problematic', async (req, res) => {
  try {
    // Try to execute a query that might cause the error
    const companies = await sequelize.query(
      'SELECT * FROM Companies WHERE recruiterId IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    res.json({ success: true, companies });
  } catch (error) {
    console.error('Error executing problematic query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`=== SQL QUERY MONITOR STARTED ON PORT ${port} ===`);
  console.log('Open your browser to http://localhost:3001/api/test to test a simple query');
  console.log('Open your browser to http://localhost:3001/api/test-problematic to test the problematic query');
  console.log('Press Ctrl+C to stop the monitor');
}); 
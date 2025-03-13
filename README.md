# JobActual Web App

A job matching platform that connects job seekers with recruiters using a swipe-based interface.

## Features

- User authentication and profile management
- Job posting and application
- Swipe-based matching system
- Real-time messaging
- Company profiles
- Subscription management

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Sequelize
- **Authentication**: JWT
- **File Storage**: Local file system

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/jobactualwebapp.git
   cd jobactualwebapp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```

4. Set up the database:
   ```
   npm run setup-db
   ```

5. Run database migrations:
   ```
   npm run migrate
   ```

6. Seed the database with initial data:
   ```
   npm run seed
   ```

### Running the Application

- Development mode (with auto-reload):
  ```
  npm run dev
  ```

- Production mode:
  ```
  npm start
  ```

## API Documentation

See the [API_DOCUMENTATION.md](API_DOCUMENTATION.md) file for detailed API endpoints and usage.

## Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm run setup-db` - Set up the database and create necessary directories
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed the database with initial data
- `npm test` - Run tests
- `npm run test-api` - Run the interactive API testing tool

### Utility Scripts

- `node scripts/list-users.js` - List all users in the database with their details
- `node scripts/generate-token.js <email>` - Generate a JWT token for a user with the specified email
- `node tests/job-creation-test.js` - Test job creation functionality

## API Testing

The project includes an interactive API testing tool that allows you to test various endpoints without using external tools like Postman. To use it:

1. Make sure the server is running in a separate terminal window (`npm run dev`)
2. Run the testing tool:
   ```
   npm run test-api
   ```
3. Follow the interactive prompts to test different API endpoints

The tool provides options to:
- Register and login users
- Create and retrieve jobs
- Create swipes (job applications)
- View matches
- Manage companies
- Test subscription functionality
- Make custom API requests

## Default Users

After running the seed script, the following users will be available:

### Admin
- Email: admin@jobactual.com
- Password: password123
- Role: Recruiter (Admin)

### Recruiter
- Email: recruiter@jobactual.com
- Password: password123
- Role: Recruiter

### Job Seeker
- Email: jobseeker@jobactual.com
- Password: password123
- Role: Job Seeker

## Job Creation

The job creation process has been updated to ensure better validation and error handling. Here are the key points:

### Required Fields for Job Creation
- `title`: Job title (required)
- `description`: Detailed job description (required)
- `jobType`: Must be one of: 'full-time', 'part-time', 'contract', 'internship', 'temporary' (required)
- `location`: Job location (required)
- `skills`: Array of required skills (required)
- `requirements`: Array of job requirements (required)
- `companyId`: ID of the company posting the job (required)

### Optional Fields
- `responsibilities`: Job responsibilities
- `isRemote`: Boolean indicating if the job is remote
- `isHybrid`: Boolean indicating if the job is hybrid
- `experienceLevel`: One of: 'entry', 'mid', 'senior', 'executive'
- `educationLevel`: Required education level
- `salaryMin`: Minimum salary
- `salaryMax`: Maximum salary
- `salaryCurrency`: Currency for salary (default: 'USD')
- `benefits`: Array of job benefits
- `industry`: Industry category
- `applicationDeadline`: Deadline for applications
- `applicationUrl`: URL for external applications

### Testing Job Creation
You can test job creation using the provided test script:

```
node tests/job-creation-test.js
```

Make sure to set the `TEST_RECRUITER_TOKEN` environment variable with a valid recruiter JWT token.

## Recent Updates

- Improved validation for job creation
- Better error handling with detailed error messages
- Alignment between client and server data models
- Added validation for recruiter company association
- Enhanced response formatting to match client expectations
- Added test script for job creation

## License

MIT 
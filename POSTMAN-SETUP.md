# Setting Up Postman for JobActual API Testing

This guide will help you set up Postman to test the JobActual API endpoints.

## Getting Started

1. **Download and Install Postman**
   - Download Postman from [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
   - Install and open the application

2. **Import the Collection**
   - In Postman, click on "Import" in the top left corner
   - Select the `postman-collection.json` file from your project
   - The JobActual API collection will be imported with all the predefined requests

## Using the Collection

### Authentication

1. **Login to get a token**
   - Open the "Auth" folder in the collection
   - Select the "Login" request
   - Update the email and password in the request body if needed
   - Click "Send"
   - Copy the token from the response

2. **Update the Collection Variable**
   - Click on the collection name "JobActual API" in the sidebar
   - Go to the "Variables" tab
   - Update the "token" variable with your new token
   - Click "Save"

### Testing Endpoints

#### Companies

1. **Create a Company**
   - Open the "Companies" folder
   - Select "Create Company"
   - Modify the request body as needed
   - Click "Send"
   - If successful, you'll receive the created company object in the response

2. **Get All Companies**
   - Select "Get All Companies"
   - Click "Send"
   - You'll see a list of all companies in the database

#### Jobs

1. **Create a Job**
   - Open the "Jobs" folder
   - Select "Create Job"
   - Ensure you have a valid company ID (you need to create a company first)
   - Modify the request body as needed
   - Click "Send"
   - If successful, you'll receive the created job object in the response

2. **Get Recruiter Jobs**
   - Select "Get Recruiter Jobs"
   - Click "Send"
   - You'll see a list of all jobs created by the current recruiter

## Troubleshooting

### Authentication Issues

If you receive a 401 Unauthorized error:
- Your token may have expired. Generate a new one by using the Login request.
- Make sure the token is correctly set in the collection variable.

### Company Creation Issues

If you receive an error when creating a company:
- Make sure you're logged in as a recruiter (userType = 'recruiter')
- Check that all required fields are provided in the request body

### Job Creation Issues

If you receive an error when creating a job:
- Ensure you have created a company first and are associated with it
- Check that all required fields are provided in the request body
- Verify that your recruiter profile has been properly set up

## API Base URL

The default base URL is set to `http://localhost:5000`. If your API is running on a different port or host, you'll need to update the URLs in each request. 
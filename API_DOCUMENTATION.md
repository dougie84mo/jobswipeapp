# JobActual API Documentation

This document provides an overview of the JobActual API endpoints for testing purposes.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication using a JWT token. Include the token in the request header:

```
x-auth-token: <your_jwt_token>
```

## Endpoints

### Authentication

#### Register User

- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "jobseeker", // or "recruiter"
    "location": "New York, NY",
    "bio": "A brief description"
  }
  ```
- **Success Response**: JWT token

#### Login

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**: JWT token

#### Get Current User

- **URL**: `/auth/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: User object with profile

### Users

#### Get User Profile

- **URL**: `/users/profile`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: User profile object

#### Update User Profile

- **URL**: `/users/profile`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**: Varies based on user type (jobseeker/recruiter)
- **Success Response**: Updated profile object

#### Upload Profile Picture

- **URL**: `/users/profile/picture`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**: Form data with `profilePicture` file
- **Success Response**: URL of uploaded picture

#### Change Password

- **URL**: `/users/password`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newpassword"
  }
  ```
- **Success Response**: Success message

### Jobs

#### Create Job

- **URL**: `/jobs`
- **Method**: `POST`
- **Auth Required**: Yes (Recruiter only)
- **Body**:
  ```json
  {
    "title": "Software Engineer",
    "description": "Job description",
    "jobType": "full-time",
    "location": "New York, NY",
    "isRemote": false,
    "salaryMin": 80000,
    "salaryMax": 120000,
    "skills": ["JavaScript", "React", "Node.js"]
  }
  ```
- **Success Response**: Created job object

#### Get Jobs

- **URL**: `/jobs`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `search`: Search term
  - `location`: Filter by location
  - `jobType`: Filter by job type
  - `isRemote`: Filter by remote status
  - `salaryMin`: Minimum salary
  - `salaryMax`: Maximum salary
  - `skills`: Filter by skills (comma-separated)
- **Success Response**: List of jobs with pagination

#### Get Job by ID

- **URL**: `/jobs/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Job object

#### Update Job

- **URL**: `/jobs/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Recruiter only)
- **Body**: Job fields to update
- **Success Response**: Updated job object

#### Delete Job

- **URL**: `/jobs/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Recruiter only)
- **Success Response**: Success message

### Swipes

#### Create Swipe

- **URL**: `/swipes`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "direction": "right", // or "left"
    "userType": "jobseeker", // or "recruiter"
    "jobId": "job-uuid", // required for jobseekers
    "jobSeekerId": "user-uuid", // required for recruiters
    "notes": "Optional notes"
  }
  ```
- **Success Response**: Swipe object and potential match

#### Get Swipe History

- **URL**: `/swipes/history`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `direction`: Filter by swipe direction
- **Success Response**: List of swipes with pagination

#### Get Swipe Statistics

- **URL**: `/swipes/stats`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Swipe statistics

### Matches

#### Get Matches

- **URL**: `/matches`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of matches

#### Get Match by ID

- **URL**: `/matches/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Match object with messages

#### Update Match Status

- **URL**: `/matches/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "status": "archived", // or "active", "rejected", "hired"
    "notes": "Optional notes"
  }
  ```
- **Success Response**: Updated match object

#### Get Match Statistics

- **URL**: `/matches/stats/overview`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Match statistics

### Messages

#### Send Message

- **URL**: `/messages`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "matchId": "match-uuid",
    "content": "Message content"
  }
  ```
- **Success Response**: Created message object

#### Send Message with Attachment

- **URL**: `/messages/attachment`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**: Form data with `file` and `matchId`
- **Success Response**: Created message object

#### Get Messages for Match

- **URL**: `/messages/:matchId`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
- **Success Response**: List of messages with pagination

#### Mark Messages as Read

- **URL**: `/messages/read`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "messageIds": ["message-uuid-1", "message-uuid-2"]
  }
  ```
- **Success Response**: Success message

#### Get Unread Message Count

- **URL**: `/messages/unread/count`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Unread message counts

### Companies

#### Create Company

- **URL**: `/companies`
- **Method**: `POST`
- **Auth Required**: Yes (Recruiter only)
- **Body**:
  ```json
  {
    "name": "Company Name",
    "industry": "Technology",
    "website": "https://example.com",
    "size": "51-200",
    "headquarters": "New York, NY",
    "description": "Company description"
  }
  ```
- **Success Response**: Created company object

#### Get Companies

- **URL**: `/companies`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `industry`: Filter by industry
  - `size`: Filter by company size
  - `search`: Search term
- **Success Response**: List of companies with pagination

#### Get Company by ID

- **URL**: `/companies/:id`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: Company object with active jobs

#### Update Company

- **URL**: `/companies/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Recruiter only)
- **Body**: Company fields to update
- **Success Response**: Updated company object

#### Upload Company Logo

- **URL**: `/companies/:id/logo`
- **Method**: `POST`
- **Auth Required**: Yes (Recruiter only)
- **Body**: Form data with `logo` file
- **Success Response**: URL of uploaded logo

#### Get Company Recruiters

- **URL**: `/companies/:id/recruiters`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: List of recruiters for the company

#### Get Company Jobs

- **URL**: `/companies/:id/jobs`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `status`: Filter by job status (default: "active")
- **Success Response**: List of jobs with pagination

### Subscriptions

#### Get Subscription Plans

- **URL**: `/subscriptions/plans`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: List of subscription plans

#### Get Current Subscription

- **URL**: `/subscriptions/current`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Current subscription details

#### Create Subscription

- **URL**: `/subscriptions`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "planType": "jobseeker", // or "recruiter", "company"
    "tier": "basic", // or "free", "premium", "enterprise"
    "paymentMethod": "credit_card", // required for paid tiers
    "paymentId": "payment-id", // required for paid tiers
    "interval": "monthly" // or "yearly"
  }
  ```
- **Success Response**: Created subscription object

#### Update Subscription

- **URL**: `/subscriptions/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**:
  ```json
  {
    "autoRenew": false, // toggle auto-renewal
    "status": "canceled", // cancel subscription
    "tier": "premium" // upgrade/downgrade
  }
  ```
- **Success Response**: Updated subscription object

#### Get Subscription Transactions

- **URL**: `/subscriptions/transactions`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of subscription transactions

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a message explaining the error:

```json
{
  "msg": "Error message"
}
```

or

```json
{
  "errors": [
    {
      "msg": "Error message",
      "param": "field_name"
    }
  ]
}
``` 
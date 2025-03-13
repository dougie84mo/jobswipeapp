/**
 * DATABASE SCHEMA DOCUMENTATION
 * 
 * This file documents the complete database schema of the JobActual web application.
 * It includes all tables, their columns, data types, and relationships.
 * 
 * UPDATED: Based on notes from March 8, 2025
 */

const DB_SCHEMA = {
  /**
   * Users Table
   * 
   * Stores user account information for both job seekers and recruiters.
   * 
   * Relationships:
   * - One-to-One with JobSeekerProfile (if userType is 'jobseeker')
   * - One-to-One with RecruiterProfile (if userType is 'recruiter')
   * - One-to-Many with Matches (as jobSeekerId)
   * - One-to-Many with Matches (as recruiterId)
   * - One-to-Many with Messages (as senderId)
   * - One-to-Many with Swipes (as userId)
   * - One-to-Many with PasswordResets
   * 
   * Note: recruiterId and jobSeekerId fields added for easier querying of profiles
   */
  Users: {
    id: {
      type: "UUID",
      defaultValue: "UUIDV4",
      primaryKey: true
    },
    email: {
      type: "STRING",
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: "STRING",
      allowNull: false
    },
    userType: {
      type: "STRING",
      allowNull: false,
      validate: {
        isIn: [["jobseeker", "recruiter"]]
      }
    },
    firstName: {
      type: "STRING",
      allowNull: true
    },
    lastName: {
      type: "STRING",
      allowNull: true
    },
    profilePicture: {
      type: "STRING",
      allowNull: true
    },
    lastActive: {
      type: "DATE",
      allowNull: true
    },
    isVerified: {
      type: "BOOLEAN",
      defaultValue: false
    },
    // Added for easier querying of profiles
    recruiterId: {
      type: "UUID",
      allowNull: true,
      references: {
        model: "RecruiterProfiles",
        key: "id"
      }
    },
    // Added for easier querying of profiles
    jobSeekerId: {
      type: "UUID",
      allowNull: true,
      references: {
        model: "JobSeekerProfiles",
        key: "id"
      }
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * Companies Table
   * 
   * Stores information about companies that recruiters represent.
   * 
   * Relationships:
   * - Many-to-Many with RecruiterProfiles (through CompanyRecruiters table)
   * - One-to-Many with Jobs (a company can post many jobs)
   * - One-to-Many with Subscriptions
   * 
   * Note: Companies do NOT have a direct recruiterId field. The relationship
   * is established through the CompanyRecruiters junction table.
   * Added createdByRecruiterId to track the original creator of the company.
   */
  Companies: {
    id: {
      type: "UUID",
      defaultValue: "UUIDV4",
      primaryKey: true,
      unique: true
    },
    name: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    // Added to track the original creator of the company
    createdByRecruiterId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "RecruiterProfiles",
        key: "id"
      }
    },
    logo: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    website: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    industry: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    size: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    founded: {
      type: "INTEGER",
      allowNull: true
    },
    headquarters: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    locations: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    description: {
      type: "TEXT",
      allowNull: true
    },
    mission: {
      type: "TEXT",
      allowNull: true
    },
    culture: {
      type: "TEXT",
      allowNull: true
    },
    benefits: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    socialMedia: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "{}"
    },
    isVerified: {
      type: "TINYINT(1)",
      allowNull: true,
      defaultValue: false
    },
    subscriptionTier: {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: "free"
    },
    subscriptionExpiresAt: {
      type: "DATETIME",
      allowNull: true
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * RecruiterProfiles Table
   * 
   * Stores additional information for users who are recruiters.
   * 
   * Relationships:
   * - One-to-One with Users (a recruiter profile belongs to one user)
   * - Many-to-Many with Companies (through CompanyRecruiters table)
   * - One-to-Many with Jobs (a recruiter can post many jobs)
   * 
   * Note: The companyId field has been removed as recruiters can be associated with multiple companies.
   * The relationship is now established through the CompanyRecruiters junction table.
   */
  RecruiterProfiles: {
    id: {
      type: "UUID",
      defaultValue: "UUIDV4",
      primaryKey: true,
      unique: true
    },
    userId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    title: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    department: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    hiringGoals: {
      type: "TEXT",
      allowNull: true
    },
    specialties: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    linkedinUrl: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    isVerified: {
      type: "TINYINT(1)",
      allowNull: true,
      defaultValue: false
    },
    verificationDocuments: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    activeJobPostings: {
      type: "INTEGER",
      allowNull: true,
      defaultValue: "0"
    },
    monthlyJobPostingLimit: {
      type: "INTEGER",
      allowNull: true,
      defaultValue: "5"
    },
    isAdmin: {
      type: "TINYINT(1)",
      allowNull: true,
      defaultValue: false
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * CompanyRecruiters Table (NEW)
   * 
   * Junction table for the many-to-many relationship between Companies and RecruiterProfiles.
   * 
   * Relationships:
   * - Many-to-One with Companies
   * - Many-to-One with RecruiterProfiles
   * 
   * This table allows recruiters to be associated with multiple companies and
   * companies to have multiple recruiters with different access levels.
   */
  CompanyRecruiters: {
    id: {
      type: "UUID",
      defaultValue: "UUIDV4",
      primaryKey: true
    },
    companyId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Companies",
        key: "id"
      }
    },
    recruiterId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "RecruiterProfiles",
        key: "id"
      }
    },
    relationTitle: {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: "Recruiter"
    },
    relationType: {
      type: "VARCHAR(255)",
      allowNull: false,
      defaultValue: "shared-limited",
      validate: {
        isIn: [["admin", "shared-admin", "shared-limited"]]
      }
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * JobSeekerProfiles Table
   * 
   * Stores additional information for users who are job seekers.
   * 
   * Relationships:
   * - One-to-One with Users (a job seeker profile belongs to one user)
   */
  JobSeekerProfiles: {
    id: {
      type: "UUID",
      primaryKey: true
    },
    userId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    title: {
      type: "VARCHAR(255)"
    },
    summary: {
      type: "TEXT"
    },
    experience: {
      type: "INTEGER"
    },
    education: {
      type: "TEXT",
      defaultValue: "[]"
    },
    workHistory: {
      type: "TEXT",
      defaultValue: "[]"
    },
    skills: {
      type: "TEXT",
      defaultValue: "[]"
    },
    certifications: {
      type: "TEXT",
      defaultValue: "[]"
    },
    languages: {
      type: "TEXT",
      defaultValue: "[]"
    },
    resumeUrl: {
      type: "VARCHAR(255)"
    },
    portfolioUrl: {
      type: "VARCHAR(255)"
    },
    linkedinUrl: {
      type: "VARCHAR(255)"
    },
    githubUrl: {
      type: "VARCHAR(255)"
    },
    desiredSalary: {
      type: "INTEGER"
    },
    desiredJobTypes: {
      type: "TEXT",
      defaultValue: "[]"
    },
    desiredLocations: {
      type: "TEXT",
      defaultValue: "[]"
    },
    desiredIndustries: {
      type: "TEXT",
      defaultValue: "[]"
    },
    isRemoteOnly: {
      type: "TINYINT(1)",
      defaultValue: false
    },
    isOpenToRelocation: {
      type: "TINYINT(1)",
      defaultValue: false
    },
    isActivelyLooking: {
      type: "TINYINT(1)",
      defaultValue: true
    },
    visibilitySettings: {
      type: "TEXT",
      defaultValue: "{\"showProfile\":true,\"showContact\":false,\"showSalary\":false}"
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * Jobs Table
   * 
   * Stores job listings created by recruiters.
   * 
   * Relationships:
   * - Many-to-One with Companies (a job belongs to one company)
   * - Many-to-One with RecruiterProfiles (a job is created by one recruiter)
   * - One-to-Many with Swipes (a job can be swiped on many times)
   * - One-to-Many with Matches (a job can have many matches)
   * 
   * Note: The recruiterId field references RecruiterProfiles.id and represents
   * the recruiter who CREATED the job.
   */
  Jobs: {
    id: {
      type: "UUID",
      defaultValue: "UUIDV4",
      primaryKey: true,
      unique: true
    },
    title: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    companyId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Companies",
        key: "id"
      }
    },
    recruiterId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "RecruiterProfiles",
        key: "id"
      }
    },
    description: {
      type: "TEXT",
      allowNull: false
    },
    responsibilities: {
      type: "TEXT",
      allowNull: true
    },
    requirements: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    location: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    isRemote: {
      type: "TINYINT(1)",
      allowNull: true,
      defaultValue: false
    },
    isHybrid: {
      type: "TINYINT(1)",
      allowNull: true,
      defaultValue: false
    },
    jobType: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    experienceLevel: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    educationLevel: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    salaryMin: {
      type: "INTEGER",
      allowNull: true
    },
    salaryMax: {
      type: "INTEGER",
      allowNull: true
    },
    salaryCurrency: {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: "USD",
      comment: "Currency code (USD, EUR, GBP, CAD, AUD, JPY, CNY, INR, BRL, MXN, ZAR, SGD, HKD, CHF, SEK, NZD, THB, IDR, RUB, AED)"
    },
    salaryType: {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: "yearly"
    },
    benefits: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    skills: {
      type: "TEXT",
      allowNull: true,
      defaultValue: "[]"
    },
    industry: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    applicationDeadline: {
      type: "DATETIME",
      allowNull: true
    },
    applicationUrl: {
      type: "VARCHAR(255)",
      allowNull: true
    },
    status: {
      type: "VARCHAR(255)",
      allowNull: true,
      defaultValue: "active"
    },
    isPromoted: {
      type: "TINYINT(1)",
      allowNull: true,
      defaultValue: false
    },
    promotionExpiresAt: {
      type: "DATETIME",
      allowNull: true
    },
    viewCount: {
      type: "INTEGER",
      allowNull: true,
      defaultValue: "0"
    },
    applicationCount: {
      type: "INTEGER",
      allowNull: true,
      defaultValue: "0"
    },
    matchCount: {
      type: "INTEGER",
      allowNull: true,
      defaultValue: "0"
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * Matches Table
   * 
   * Stores matches between job seekers and jobs when both parties express interest.
   * 
   * Relationships:
   * - Many-to-One with Users (as jobSeekerId)
   * - Many-to-One with Users (as recruiterId)
   * - Many-to-One with Jobs
   * - One-to-Many with Messages
   * 
   * Note: The recruiterId field now references Users.recruiterId for consistency
   */
  Matches: {
    id: {
      type: "UUID",
      defaultValue: "UUIDV4",
      primaryKey: true
    },
    jobSeekerId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    recruiterId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    jobId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Jobs",
        key: "id"
      }
    },
    matchDate: {
      type: "DATE",
      defaultValue: "NOW"
    },
    status: {
      type: "STRING",
      defaultValue: "active",
      validate: {
        isIn: [["active", "archived", "rejected", "hired"]]
      }
    },
    lastMessageDate: {
      type: "DATE",
      allowNull: true
    },
    jobSeekerArchived: {
      type: "BOOLEAN",
      defaultValue: false
    },
    recruiterArchived: {
      type: "BOOLEAN",
      defaultValue: false
    },
    matchScore: {
      type: "FLOAT",
      allowNull: true
    },
    notes: {
      type: "TEXT",
      allowNull: true
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * Messages Table
   * 
   * Stores messages exchanged between job seekers and recruiters within a match.
   * 
   * Relationships:
   * - Many-to-One with Matches
   * - Many-to-One with Users (as senderId)
   */
  Messages: {
    id: {
      type: "UUID",
      primaryKey: true
    },
    matchId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Matches",
        key: "id"
      }
    },
    senderId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    content: {
      type: "TEXT",
      allowNull: false
    },
    attachments: {
      type: "TEXT",
      defaultValue: "[]"
    },
    read: {
      type: "TINYINT(1)",
      defaultValue: false
    },
    readAt: {
      type: "DATETIME"
    },
    type: {
      type: "VARCHAR(255)",
      defaultValue: "text"
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * Swipes Table
   * 
   * Stores swipe actions (like/dislike) by users on jobs or job seekers.
   * 
   * Relationships:
   * - Many-to-One with Users (as userId)
   * - Many-to-One with Jobs (as jobId)
   * - Many-to-One with Users (as jobSeekerId)
   */
  Swipes: {
    id: {
      type: "UUID",
      primaryKey: true
    },
    userId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    jobId: {
      type: "UUID",
      references: {
        model: "Jobs",
        key: "id"
      }
    },
    jobSeekerId: {
      type: "UUID",
      references: {
        model: "Users",
        key: "id"
      }
    },
    direction: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    userType: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    timestamp: {
      type: "DATETIME"
    },
    notes: {
      type: "TEXT"
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * Subscriptions Table
   * 
   * Stores subscription information for users or companies.
   * 
   * Relationships:
   * - Many-to-One with Users
   * - Many-to-One with Companies
   * - One-to-Many with SubscriptionTransactions
   */
  Subscriptions: {
    id: {
      type: "UUID",
      primaryKey: true
    },
    userId: {
      type: "UUID",
      references: {
        model: "Users",
        key: "id"
      }
    },
    companyId: {
      type: "UUID",
      references: {
        model: "Companies",
        key: "id"
      }
    },
    planType: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    tier: {
      type: "VARCHAR(255)",
      defaultValue: "free"
    },
    startDate: {
      type: "DATETIME",
      allowNull: false
    },
    endDate: {
      type: "DATETIME"
    },
    isActive: {
      type: "TINYINT(1)",
      defaultValue: true
    },
    autoRenew: {
      type: "TINYINT(1)",
      defaultValue: false
    },
    paymentMethod: {
      type: "VARCHAR(255)"
    },
    paymentId: {
      type: "VARCHAR(255)"
    },
    amount: {
      type: "FLOAT"
    },
    currency: {
      type: "VARCHAR(255)",
      defaultValue: "USD"
    },
    interval: {
      type: "VARCHAR(255)"
    },
    status: {
      type: "VARCHAR(255)",
      defaultValue: "active"
    },
    features: {
      type: "TEXT",
      defaultValue: "{}"
    },
    canceledAt: {
      type: "DATETIME"
    },
    cancelReason: {
      type: "TEXT"
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * SubscriptionTransactions Table
   * 
   * Stores transaction records for subscription payments.
   * 
   * Relationships:
   * - Many-to-One with Subscriptions
   */
  SubscriptionTransactions: {
    id: {
      type: "UUID",
      primaryKey: true
    },
    subscriptionId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Subscriptions",
        key: "id"
      }
    },
    transactionDate: {
      type: "DATETIME",
      allowNull: false
    },
    amount: {
      type: "FLOAT",
      allowNull: false
    },
    currency: {
      type: "VARCHAR(255)",
      defaultValue: "USD"
    },
    paymentMethod: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    paymentId: {
      type: "VARCHAR(255)",
      allowNull: false
    },
    status: {
      type: "VARCHAR(255)",
      defaultValue: "pending"
    },
    type: {
      type: "VARCHAR(255)",
      defaultValue: "subscription"
    },
    description: {
      type: "TEXT"
    },
    metadata: {
      type: "TEXT",
      defaultValue: "{}"
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  },

  /**
   * PasswordResets Table
   * 
   * Stores password reset tokens for users.
   * 
   * Relationships:
   * - Many-to-One with Users
   */
  PasswordResets: {
    id: {
      type: "UUID",
      primaryKey: true
    },
    userId: {
      type: "UUID",
      allowNull: false,
      references: {
        model: "Users",
        key: "id"
      }
    },
    token: {
      type: "VARCHAR(255)",
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: "DATETIME",
      allowNull: false
    },
    isUsed: {
      type: "TINYINT(1)",
      defaultValue: false
    },
    createdAt: {
      type: "DATETIME",
      allowNull: false
    },
    updatedAt: {
      type: "DATETIME",
      allowNull: false
    }
  }
};

/**
 * UPDATED RELATIONSHIPS AND FIXES
 * 
 * 1. User-Profile Relationship:
 *    - Added recruiterId and jobSeekerId fields to Users table for easier querying
 *    - Maintained the existing userId fields in profile tables for backward compatibility
 * 
 * 2. Company-Recruiter Relationship:
 *    - Changed from One-to-Many to Many-to-Many
 *    - Removed companyId from RecruiterProfiles
 *    - Added CompanyRecruiters junction table with relationType field
 *    - Added createdByRecruiterId to Companies table
 * 
 * 3. Relationship Types in CompanyRecruiters:
 *    - admin: Full control over company and jobs
 *    - shared-admin: Can edit/add/update jobs but not company info
 *    - shared-limited: View-only access to company and jobs
 * 
 * 4. Consistent recruiterId References:
 *    - Jobs.recruiterId references RecruiterProfiles.id (creator of the job)
 *    - Matches.recruiterId references Users.id (for consistency with existing code)
 *    - CompanyRecruiters.recruiterId references RecruiterProfiles.id
 */

module.exports = DB_SCHEMA; 
import api from './api';

export interface JobPermission {
  id: string;
  jobId: string;
  recruiterId: string;
  permissionLevel: 'owner' | 'shared-owner' | 'shared';
  recruiter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  companyId: string;
  company?: {
    id: string;
    name: string;
    logo?: string;
    description?: string;
  };
  skills: string[];
  requirements: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  isRemote?: boolean;
  isHybrid?: boolean;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  educationLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryType?: 'hourly' | 'hourly-with-overtime' | 'per-diem' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'project-based' | 'commission';
  benefits?: string[];
  industry?: string;
  applicationDeadline?: string;
  applicationUrl?: string;
  status?: string;
  permissions?: JobPermission[];
  userPermissionLevel?: 'owner' | 'shared-owner' | 'shared';
}

export interface CreateJobData {
  title: string;
  description: string;
  location: string;
  salary?: string;
  companyId: string;
  skills: string[];
  requirements: string[];
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  workLocationType?: 'remote' | 'hybrid' | 'onsite';
  isRemote?: boolean;
  isHybrid?: boolean;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  educationLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryType?: 'hourly' | 'hourly-with-overtime' | 'per-diem' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'project-based' | 'commission';
  benefits?: string[];
  industry?: string;
  applicationDeadline?: string;
  applicationUrl?: string;
}

export interface ShareJobData {
  jobId: string;
  recruiterId: string;
  permissionLevel: 'owner' | 'shared-owner' | 'shared';
}

export interface ShareWithMatchData {
  jobId: string;
  matchId: string;
}

const JobService = {
  // Get all jobs (for job seekers)
  getJobs: async (): Promise<Job[]> => {
    try {
      const response = await api.get<{ jobs: Job[] }>('/api/jobs');
      return response.data.jobs;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
  },

  // Get jobs for a specific recruiter
  getRecruiterJobs: async (): Promise<Job[]> => {
    try {
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get<any>(`/api/jobs/recruiter?_t=${timestamp}`);

      console.log('Job service received response:', JSON.stringify(response.data, null, 2));

      // Check if the response has the expected structure
      if (response.data && Array.isArray(response.data.jobs)) {
        console.log(`Found ${response.data.jobs.length} jobs in response.data.jobs`);
        
        // Ensure each job has a userPermissionLevel property
        const processedJobs = response.data.jobs.map((job: any) => {
          return {
            ...job,
            // Use existing value or default to 'owner' if not provided but recruiter matches
            userPermissionLevel: job.userPermissionLevel || 
              (job.recruiter?.id === localStorage.getItem('recruiterId') ? 'owner' : 'shared')
          };
        });
        
        return processedJobs;
      } else if (response.data && Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} jobs in response.data array`);
        
        // Ensure each job has a userPermissionLevel property
        const processedJobs = response.data.map((job: any) => {
          return {
            ...job,
            // Use existing value or default to 'owner' if not provided but recruiter matches
            userPermissionLevel: job.userPermissionLevel || 
              (job.recruiter?.id === localStorage.getItem('recruiterId') ? 'owner' : 'shared')
          };
        });
        
        return processedJobs;
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract jobs from the response if it's an object
        const arrayProps = Object.entries(response.data)
          .filter(([_, val]) => Array.isArray(val))
          .map(([key, val]) => ({ key, length: (val as any[]).length }));
        
        console.log('Found array properties:', arrayProps);
        
        if (arrayProps.length > 0) {
          // Use the first array property that looks like jobs
          const jobsKey = arrayProps[0].key;
          console.log(`Using ${jobsKey} with ${arrayProps[0].length} items`);
          
          // Ensure each job has a userPermissionLevel property
          const processedJobs = (response.data[jobsKey] as any[]).map((job: any) => {
            return {
              ...job,
              // Use existing value or default to 'owner' if not provided but recruiter matches
              userPermissionLevel: job.userPermissionLevel || 
                (job.recruiter?.id === localStorage.getItem('recruiterId') ? 'owner' : 'shared')
            };
          });
          
          return processedJobs;
        }

        // If we can't find an array, but the response is an object with job-like properties,
        // wrap it in an array
        if (response.data.id && response.data.title) {
          console.log('Found single job object, wrapping in array');
          
          // Ensure job has a userPermissionLevel property
          const processedJob = {
            ...response.data,
            userPermissionLevel: response.data.userPermissionLevel || 
              (response.data.recruiter?.id === localStorage.getItem('recruiterId') ? 'owner' : 'shared')
          };
          
          return [processedJob as Job];
        }

        console.error('Could not extract jobs from response:', response.data);
        return [];
      } else {
        console.error('Unexpected response structure:', typeof response.data);
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching recruiter jobs:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  },

  // Get a specific job by ID
  getJob: async (id: string): Promise<Job> => {
    try {
      const response = await api.get<{ job: Job }>(`/api/jobs/id/${id}`);
      return response.data.job;
    } catch (error) {
      console.error(`Error fetching job ${id}:`, error);
      throw error;
    }
  },

  // Create a new job
  createJob: async (jobData: CreateJobData): Promise<Job> => {
    try {
      const response = await api.post<any>('/api/jobs', jobData);

      // Check if the response has the expected structure
      if (response.data && response.data.job) {
        return response.data.job;
      } else if (response.data && response.data.id) {
        return response.data;
      } else {
        console.error('Unexpected response structure');
        throw new Error('Unexpected response structure');
      }
    } catch (error: any) {
      console.error('Error creating job:', error);
      throw error;
    }
  },

  // Update a job
  updateJob: async (id: string, jobData: Partial<CreateJobData>): Promise<Job> => {
    try {
      const response = await api.put<any>(`/api/jobs/id/${id}`, jobData);

      // Check if the response has the expected structure
      if (response.data && response.data.job) {
        return response.data.job;
      } else if (response.data && response.data.id) {
        return response.data;
      } else {
        console.error('Unexpected response structure');
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      console.error(`Error updating job ${id}:`, error);
      throw error;
    }
  },

  // Delete a job
  deleteJob: async (id: string): Promise<void> => {
    await api.delete(`/api/jobs/id/${id}`);
  },

  // Swipe on a job (for job seekers)
  swipeJob: async (jobId: string, direction: 'right' | 'left'): Promise<void> => {
    await api.post('/api/swipes', {
      jobId,
      direction
    });
  },

  // Get all job permissions
  getJobPermissions: async (jobId: string): Promise<JobPermission[]> => {
    try {
      const response = await api.get<{ permissions: JobPermission[] }>(
        `/api/jobs/id/${jobId}/permissions`
      );
      return response.data.permissions || [];
    } catch (error) {
      console.error('Error fetching job permissions:', error);
      throw error;
    }
  },

  // Share a job with another recruiter
  shareJob: async (shareData: ShareJobData): Promise<JobPermission> => {
    try {
      const response = await api.post<{ permission: JobPermission }>(
        `/api/jobs/id/${shareData.jobId}/share`,
        {
          recruiterId: shareData.recruiterId,
          permissionLevel: shareData.permissionLevel
        }
      );
      return response.data.permission;
    } catch (error) {
      console.error('Error sharing job:', error);
      throw error;
    }
  },

  // Share job with existing match from another job
  shareWithMatch: async (shareData: ShareWithMatchData): Promise<any> => {
    try {
      const response = await api.post(
        `/api/jobs/id/${shareData.jobId}/share-with-match`,
        {
          matchId: shareData.matchId
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sharing job with match:', error);
      throw error;
    }
  },

  // Update permission level
  updateJobPermission: async (
    permissionId: string,
    permissionLevel: 'owner' | 'shared-owner' | 'shared'
  ): Promise<JobPermission> => {
    try {
      const response = await api.put<{ permission: JobPermission }>(
        `/api/job-permissions/${permissionId}`,
        { permissionLevel }
      );
      return response.data.permission;
    } catch (error) {
      console.error('Error updating job permission:', error);
      throw error;
    }
  },

  // Remove a permission (revoke access)
  removeJobPermission: async (permissionId: string): Promise<void> => {
    try {
      await api.delete(`/api/job-permissions/${permissionId}`);
    } catch (error) {
      console.error('Error removing job permission:', error);
      throw error;
    }
  }
};

export default JobService; 
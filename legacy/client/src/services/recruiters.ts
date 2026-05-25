import api from './api';

/**
 * Interface for Recruiter data
 */
export interface Recruiter {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
  };
  title: string;
  department?: string;
  specialties: string[];
  linkedinUrl?: string;
  isVerified: boolean;
  isFollowing?: boolean;
  followerCount?: number;
  company?: {
    id: string;
    name: string;
    logo?: string;
  };
}

/**
 * Search parameters for filtering recruiters
 */
export interface RecruiterSearchParams {
  query?: string;
  specialties?: string[];
  companies?: string[];
  isVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'followers' | 'recent';
}

/**
 * Search for recruiters with optional filters
 */
export const searchRecruiters = async (params: RecruiterSearchParams = {}): Promise<{
  recruiters: Recruiter[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  try {
    const response = await api.get('/api/recruiters/search', { params });
    return response.data;
  } catch (error) {
    console.error('Error searching recruiters:', error);
    throw error;
  }
};

/**
 * Get recruiter details by ID
 */
export const getRecruiterById = async (id: string): Promise<Recruiter> => {
  try {
    const response = await api.get(`/api/recruiters/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching recruiter ${id}:`, error);
    throw error;
  }
};

/**
 * Follow a recruiter
 */
export const followRecruiter = async (recruiterId: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.post(`/api/recruiters/${recruiterId}/follow`);
    return response.data;
  } catch (error) {
    console.error(`Error following recruiter ${recruiterId}:`, error);
    throw error;
  }
};

/**
 * Unfollow a recruiter
 */
export const unfollowRecruiter = async (recruiterId: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.delete(`/api/recruiters/${recruiterId}/follow`);
    return response.data;
  } catch (error) {
    console.error(`Error unfollowing recruiter ${recruiterId}:`, error);
    throw error;
  }
};

/**
 * Get recruiters that the current user is following
 */
export const getFollowedRecruiters = async (): Promise<Recruiter[]> => {
  try {
    const response = await api.get('/api/recruiters/following');
    return response.data.recruiters;
  } catch (error) {
    console.error('Error fetching followed recruiters:', error);
    throw error;
  }
};

/**
 * Get suggested recruiters to follow based on user interests
 */
export const getSuggestedRecruiters = async (limit: number = 5): Promise<Recruiter[]> => {
  try {
    const response = await api.get('/api/recruiters/suggested', { params: { limit } });
    return response.data.recruiters;
  } catch (error) {
    console.error('Error fetching suggested recruiters:', error);
    throw error;
  }
}; 
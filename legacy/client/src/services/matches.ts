import api from './api';
import { Job } from './jobs';

export interface Match {
  id: string;
  jobId: string;
  jobseekerId: string;
  recruiterId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  job?: Job;
  jobseeker?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
    location?: string;
    bio?: string;
  };
  recruiter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  };
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

const MatchService = {
  // Get all matches for the current user
  getMatches: async (): Promise<Match[]> => {
    console.log('MatchService: Calling getMatches API');
    try {
      const response = await api.get<{ matches: Match[] }>('/api/matches');
      console.log('MatchService: getMatches response', response.data);
      return Array.isArray(response.data.matches) ? response.data.matches : [];
    } catch (error) {
      console.error('MatchService: getMatches error', error);
      throw error;
    }
  },

  // Get a specific match by ID
  getMatch: async (id: string): Promise<Match> => {
    console.log(`MatchService: Calling getMatch API for ID ${id}`);
    try {
      const response = await api.get<{ match: Match }>(`/api/matches/${id}`);
      console.log('MatchService: getMatch response', response.data);
      return response.data.match;
    } catch (error) {
      console.error('MatchService: getMatch error', error);
      throw error;
    }
  },

  // Update match status (for recruiters)
  updateMatchStatus: async (id: string, status: 'accepted' | 'rejected'): Promise<Match> => {
    console.log(`MatchService: Calling updateMatchStatus API for ID ${id} with status ${status}`);
    try {
      const response = await api.put<{ match: Match }>(`/api/matches/${id}`, { status });
      console.log('MatchService: updateMatchStatus response', response.data);
      return response.data.match;
    } catch (error) {
      console.error('MatchService: updateMatchStatus error', error);
      throw error;
    }
  },

  // Get messages for a specific match
  getMessages: async (matchId: string): Promise<Message[]> => {
    console.log(`MatchService: Calling getMessages API for match ID ${matchId}`);
    try {
      const response = await api.get<{ messages: Message[] }>(`/api/matches/${matchId}/messages`);
      console.log('MatchService: getMessages response', response.data);
      return Array.isArray(response.data.messages) ? response.data.messages : [];
    } catch (error) {
      console.error('MatchService: getMessages error', error);
      throw error;
    }
  },

  // Send a message in a match
  sendMessage: async (matchId: string, content: string): Promise<Message> => {
    console.log(`MatchService: Calling sendMessage API for match ID ${matchId}`);
    try {
      const response = await api.post<{ message: Message }>(`/api/messages`, {
        matchId,
        content
      });
      console.log('MatchService: sendMessage response', response.data);
      return response.data.message;
    } catch (error) {
      console.error('MatchService: sendMessage error', error);
      throw error;
    }
  }
};

export default MatchService; 
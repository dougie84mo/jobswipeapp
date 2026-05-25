import api from './api';

export interface CompanyPermission {
  id: string;
  companyId: string;
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

export interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  logo?: string;
  location: string;
  industry: string;
  size: string;
  foundedYear?: number;
  recruiterId: string;
  createdAt: string;
  updatedAt: string;
  permissions?: CompanyPermission[];
  userPermissionLevel?: 'owner' | 'shared-owner' | 'shared';
}

export interface CreateCompanyData {
  name: string;
  description: string;
  website: string;
  location: string;
  industry: string;
  size: string;
  foundedYear?: number;
}

export interface ShareCompanyData {
  companyId: string;
  recruiterId: string;
  permissionLevel: 'owner' | 'shared-owner' | 'shared';
}

const CompanyService = {
  // Get recruiter's companies
  getCompanies: async (): Promise<Company[]> => {
    console.log('CompanyService: Calling getCompanies API');
    try {
      const response = await api.get<{ companies: Company[] }>('/api/companies');
      console.log('CompanyService: getCompanies raw response', response.data);
      
      // Ensure companies array exists
      const companies = response.data.companies || [];
      
      // Log each company's industry and size
      companies.forEach(company => {
        console.log(`Company ${company.name} - Industry: "${company.industry}", Size: "${company.size}"`);
      });
      
      // Process companies to ensure userPermissionLevel is set
      const processedCompanies = companies.map((company: Company) => {
        return {
          ...company,
          // Use existing value or default to 'owner' if not provided but recruiterId matches
          userPermissionLevel: company.userPermissionLevel || 
            (company.recruiterId === localStorage.getItem('recruiterId') ? 'owner' : 'shared')
        };
      });
      
      return processedCompanies;
    } catch (error) {
      console.error('CompanyService: getCompanies error', error);
      throw error;
    }
  },

  // Get a specific company by ID
  getCompany: async (id: string): Promise<Company> => {
    console.log(`CompanyService: Calling getCompany API for ID ${id}`);
    try {
      const response = await api.get<{ company: Company }>(`/api/companies/${id}`);
      console.log('CompanyService: getCompany response', response.data);
      return response.data.company;
    } catch (error) {
      console.error('CompanyService: getCompany error', error);
      throw error;
    }
  },

  // Create a new company
  createCompany: async (companyData: CreateCompanyData): Promise<Company> => {
    console.log('CompanyService: Calling createCompany API', companyData);
    try {
      const response = await api.post<{ company: Company }>('/api/companies', companyData);
      console.log('CompanyService: createCompany response', response.data);
      return response.data.company;
    } catch (error) {
      console.error('CompanyService: createCompany error', error);
      throw error;
    }
  },

  // Update a company
  updateCompany: async (id: string, companyData: Partial<CreateCompanyData>): Promise<Company> => {
    const response = await api.put<{ company: Company }>(`/api/companies/${id}`, companyData);
    return response.data.company;
  },

  // Delete a company
  deleteCompany: async (id: string): Promise<void> => {
    await api.delete(`/api/companies/${id}`);
  },

  // Upload company logo
  uploadLogo: async (id: string, logoFile: File): Promise<Company> => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    const response = await api.post<{ company: Company }>(
      `/api/companies/${id}/logo`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data.company;
  },

  // Get all company permissions
  getCompanyPermissions: async (companyId: string): Promise<CompanyPermission[]> => {
    try {
      const response = await api.get<{ permissions: CompanyPermission[] }>(
        `/api/companies/${companyId}/permissions`
      );
      return response.data.permissions || [];
    } catch (error) {
      console.error('CompanyService: getCompanyPermissions error', error);
      throw error;
    }
  },

  // Share a company with another recruiter
  shareCompany: async (shareData: ShareCompanyData): Promise<CompanyPermission> => {
    try {
      const response = await api.post<{ permission: CompanyPermission }>(
        `/api/companies/${shareData.companyId}/share`,
        {
          recruiterId: shareData.recruiterId,
          permissionLevel: shareData.permissionLevel
        }
      );
      return response.data.permission;
    } catch (error) {
      console.error('CompanyService: shareCompany error', error);
      throw error;
    }
  },

  // Update permission level
  updatePermission: async (
    permissionId: string,
    permissionLevel: 'owner' | 'shared-owner' | 'shared'
  ): Promise<CompanyPermission> => {
    try {
      const response = await api.put<{ permission: CompanyPermission }>(
        `/api/permissions/${permissionId}`,
        { permissionLevel }
      );
      return response.data.permission;
    } catch (error) {
      console.error('CompanyService: updatePermission error', error);
      throw error;
    }
  },

  // Remove a permission (revoke access)
  removePermission: async (permissionId: string): Promise<void> => {
    try {
      await api.delete(`/api/permissions/${permissionId}`);
    } catch (error) {
      console.error('CompanyService: removePermission error', error);
      throw error;
    }
  }
};

export default CompanyService; 
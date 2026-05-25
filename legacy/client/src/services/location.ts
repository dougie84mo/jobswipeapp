import api from './api';

// Define interfaces for location data
export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface LocationSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// Location service for handling Google Maps API integration
const LocationService = {
  // Get location suggestions based on input text
  getLocationSuggestions: async (input: string): Promise<LocationSuggestion[]> => {
    try {
      const response = await api.get<{ suggestions: LocationSuggestion[] }>(`/location/suggestions?input=${encodeURIComponent(input)}`);
      return response.data.suggestions;
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      return [];
    }
  },

  // Get geocoding information for a specific place
  getGeocodingForPlace: async (placeId: string): Promise<GeocodingResult | null> => {
    try {
      const response = await api.get<{ result: GeocodingResult }>(`/location/geocode?placeId=${encodeURIComponent(placeId)}`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching geocoding information:', error);
      return null;
    }
  },

  // Get geocoding information for an address
  getGeocodingForAddress: async (address: string): Promise<GeocodingResult | null> => {
    try {
      const response = await api.get<{ result: GeocodingResult }>(`/location/geocode?address=${encodeURIComponent(address)}`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching geocoding information:', error);
      return null;
    }
  },

  // Calculate distance between two locations
  calculateDistance: async (origin: string, destination: string): Promise<number | null> => {
    try {
      const response = await api.get<{ distance: number }>(`/location/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
      return response.data.distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  }
};

export default LocationService; 
import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Autocomplete, 
  CircularProgress, 
  Box, 
  Typography 
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationService, { LocationSuggestion } from '../../services/location';
import { debounce } from 'lodash';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onBlur,
  error,
  helperText,
  label = 'Location',
  placeholder,
  required = false,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced function to fetch location suggestions
  const fetchSuggestions = React.useMemo(
    () =>
      debounce(async (input: string) => {
        if (input.length < 3) {
          setOptions([]);
          return;
        }

        setLoading(true);
        try {
          const suggestions = await LocationService.getLocationSuggestions(input);
          setOptions(suggestions);
        } catch (error) {
          console.error('Error fetching location suggestions:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    if (inputValue) {
      fetchSuggestions(inputValue);
    }
    return () => {
      fetchSuggestions.cancel();
    };
  }, [inputValue, fetchSuggestions]);

  return (
    <Autocomplete
      id="location-autocomplete"
      freeSolo
      filterOptions={(x) => x}
      options={options}
      getOptionLabel={(option) => {
        if (typeof option === 'string') {
          return option;
        }
        return option.description;
      }}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      value={value}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else if (newValue) {
          onChange(newValue.description);
        } else {
          onChange('');
        }
      }}
      onBlur={onBlur}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Box display="flex" alignItems="center">
            <LocationOnIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <Box>
              <Typography variant="body1">{option.mainText}</Typography>
              <Typography variant="body2" color="text.secondary">
                {option.secondaryText}
              </Typography>
            </Box>
          </Box>
        </li>
      )}
    />
  );
};

export default LocationAutocomplete; 
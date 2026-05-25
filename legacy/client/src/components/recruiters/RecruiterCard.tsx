import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Button, 
  Avatar, 
  Box, 
  Chip, 
  Tooltip, 
  IconButton 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import VerifiedIcon from '@mui/icons-material/Verified';
import BusinessIcon from '@mui/icons-material/Business';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { followRecruiter, unfollowRecruiter, Recruiter } from '../../services/recruiters';

const StyledCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  border: `2px solid ${theme.palette.primary.main}`,
  margin: '0 auto',
  marginTop: theme.spacing(2),
}));

const CompanyLogo = styled(Avatar)(({ theme }) => ({
  width: 24,
  height: 24,
  marginRight: theme.spacing(1),
}));

interface RecruiterCardProps {
  recruiter: Recruiter;
  onFollowStatusChange?: (recruiterId: string, isFollowing: boolean) => void;
}

const RecruiterCard: React.FC<RecruiterCardProps> = ({ recruiter, onFollowStatusChange }) => {
  const [isFollowing, setIsFollowing] = useState(recruiter.isFollowing || false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowRecruiter(recruiter.id);
      } else {
        await followRecruiter(recruiter.id);
      }
      
      setIsFollowing(!isFollowing);
      if (onFollowStatusChange) {
        onFollowStatusChange(recruiter.id, !isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <StyledCard>
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <StyledAvatar 
          src={recruiter.user.profilePicture || undefined} 
          alt={`${recruiter.user.firstName} ${recruiter.user.lastName}`}
        >
          {recruiter.user.firstName.charAt(0) + recruiter.user.lastName.charAt(0)}
        </StyledAvatar>
        {recruiter.isVerified && (
          <Tooltip title="Verified Recruiter">
            <VerifiedIcon 
              color="primary" 
              sx={{ 
                position: 'absolute', 
                top: 16, 
                right: 16 
              }} 
            />
          </Tooltip>
        )}
      </Box>
      
      <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
        <Typography variant="h6" component="div" noWrap>
          {recruiter.user.firstName} {recruiter.user.lastName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {recruiter.title}
        </Typography>
        
        {recruiter.company && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            {recruiter.company.logo ? (
              <CompanyLogo src={recruiter.company.logo} alt={recruiter.company.name} />
            ) : (
              <BusinessIcon fontSize="small" sx={{ mr: 1 }} />
            )}
            <Typography variant="body2" color="text.secondary">
              {recruiter.company.name}
            </Typography>
          </Box>
        )}
        
        {recruiter.specialties && recruiter.specialties.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', my: 1 }}>
            {recruiter.specialties.slice(0, 3).map((specialty, index) => (
              <Chip 
                key={index} 
                label={specialty} 
                size="small" 
                variant="outlined" 
              />
            ))}
            {recruiter.specialties.length > 3 && (
              <Tooltip title={recruiter.specialties.slice(3).join(', ')}>
                <Chip 
                  label={`+${recruiter.specialties.length - 3}`} 
                  size="small" 
                  variant="outlined" 
                />
              </Tooltip>
            )}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {recruiter.followerCount || 0} followers
          </Typography>
          {recruiter.linkedinUrl && (
            <Tooltip title="View LinkedIn Profile">
              <IconButton 
                size="small" 
                href={recruiter.linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <LinkedInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <Button
          variant={isFollowing ? "outlined" : "contained"}
          color={isFollowing ? "primary" : "primary"}
          startIcon={isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
          onClick={handleFollowToggle}
          disabled={isLoading}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      </CardContent>
    </StyledCard>
  );
};

export default RecruiterCard; 
import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Avatar, 
  Divider,
  styled
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';
import { Job } from '../../services/jobs';

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  margin: '0 auto',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  position: 'relative',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const CompanyHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const CompanyLogo = styled(Avatar)(({ theme }) => ({
  width: 60,
  height: 60,
  marginRight: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
}));

const JobInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

const SkillsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <StyledCard>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <CompanyHeader>
          <CompanyLogo 
            src={job.company?.logo} 
            alt={job.company?.name}
          >
            {!job.company?.logo && (job.company?.name?.charAt(0) || <BusinessIcon />)}
          </CompanyLogo>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {job.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {job.company?.name}
            </Typography>
          </Box>
        </CompanyHeader>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <JobInfo>
            <LocationOnIcon sx={{ mr: 1 }} />
            <Typography variant="body2">{job.location}</Typography>
          </JobInfo>
          <JobInfo>
            <AttachMoneyIcon sx={{ mr: 1 }} />
            <Typography variant="body2">{job.salary}</Typography>
          </JobInfo>
        </Box>

        <Typography variant="body1" sx={{ mb: 2, flexGrow: 1 }}>
          {job.description}
        </Typography>

        <Box sx={{ mt: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Skills:
          </Typography>
          <SkillsContainer>
            {job.skills.map((skill, index) => (
              <Chip 
                key={index} 
                label={skill} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            ))}
          </SkillsContainer>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default JobCard; 
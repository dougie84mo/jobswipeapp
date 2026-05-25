import React, { useState } from 'react';
import { Box, IconButton, styled } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { Job } from '../../services/jobs';
import JobCard from './JobCard';

const SwipeContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: 600,
  height: 500,
  margin: '0 auto',
  perspective: '1000px',
}));

const CardWrapper = styled(Box)<{ 
  $isDragging: boolean; 
  $translateX: number; 
  $rotate: number;
}>(({ theme, $isDragging, $translateX, $rotate }) => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  transition: $isDragging ? 'none' : 'transform 0.3s ease',
  transform: `translateX(${$translateX}px) rotate(${$rotate}deg)`,
  cursor: $isDragging ? 'grabbing' : 'grab',
  zIndex: 10,
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: theme.spacing(4),
  zIndex: 20,
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

interface SwipeableJobCardProps {
  job: Job;
  onSwipe: (jobId: string, direction: 'right' | 'left') => void;
  onSwipeComplete: () => void;
}

const SwipeableJobCard: React.FC<SwipeableJobCardProps> = ({ 
  job, 
  onSwipe,
  onSwipeComplete
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [rotate, setRotate] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    setTranslateX(deltaX);
    setRotate(deltaX * 0.03);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.touches[0].clientX - startX;
    setTranslateX(deltaX);
    setRotate(deltaX * 0.03);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Determine if the swipe was significant enough
    if (Math.abs(translateX) > 100) {
      // Complete the swipe animation
      const direction = translateX > 0 ? 'right' : 'left';
      const targetX = direction === 'right' ? window.innerWidth : -window.innerWidth;
      
      setTranslateX(targetX);
      setRotate(targetX * 0.03);
      
      // Trigger the swipe action
      onSwipe(job.id, direction);
      
      // Reset after animation completes
      setTimeout(() => {
        setTranslateX(0);
        setRotate(0);
        onSwipeComplete();
      }, 300);
    } else {
      // Reset position if swipe wasn't significant
      setTranslateX(0);
      setRotate(0);
    }
  };

  const handleSwipeButton = (direction: 'right' | 'left') => {
    const targetX = direction === 'right' ? window.innerWidth : -window.innerWidth;
    
    setTranslateX(targetX);
    setRotate(targetX * 0.03);
    
    // Trigger the swipe action
    onSwipe(job.id, direction);
    
    // Reset after animation completes
    setTimeout(() => {
      setTranslateX(0);
      setRotate(0);
      onSwipeComplete();
    }, 300);
  };

  return (
    <SwipeContainer>
      <CardWrapper
        $isDragging={isDragging}
        $translateX={translateX}
        $rotate={rotate}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
      >
        <JobCard job={job} />
      </CardWrapper>
      
      <ActionButtons>
        <ActionButton 
          color="error" 
          size="large"
          onClick={() => handleSwipeButton('left')}
        >
          <ThumbDownIcon />
        </ActionButton>
        <ActionButton 
          color="success" 
          size="large"
          onClick={() => handleSwipeButton('right')}
        >
          <ThumbUpIcon />
        </ActionButton>
      </ActionButtons>
    </SwipeContainer>
  );
};

export default SwipeableJobCard; 
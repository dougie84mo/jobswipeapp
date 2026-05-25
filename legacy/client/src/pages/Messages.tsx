import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Drawer,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Tooltip,
  Badge,
  ListItemButton,
  Chip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import MatchService, { Match, Message } from '../services/matches';
import { useAuth } from '../contexts/AuthContext';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';

// Mock data for conversations
const MOCK_CONVERSATIONS = [
  {
    id: '1',
    name: 'John Smith',
    lastMessage: 'Thanks for considering my application!',
    timestamp: new Date(2025, 2, 10, 14, 30),
    unread: 2,
    avatar: '',
    job: 'Senior Frontend Developer',
    skills: ['React', 'TypeScript', 'Node.js'],
    matchDate: new Date(2025, 2, 5)
  },
  {
    id: '2',
    name: 'Emily Johnson',
    lastMessage: 'When would be a good time for an interview?',
    timestamp: new Date(2025, 2, 9, 10, 15),
    unread: 0,
    avatar: '',
    job: 'UX/UI Designer',
    skills: ['Figma', 'Adobe XD', 'User Research'],
    matchDate: new Date(2025, 2, 3)
  },
  {
    id: '3',
    name: 'Michael Chen',
    lastMessage: 'I have attached my updated portfolio as requested.',
    timestamp: new Date(2025, 2, 8, 16, 45),
    unread: 1,
    avatar: '',
    job: 'Full Stack Developer',
    skills: ['JavaScript', 'Python', 'React'],
    matchDate: new Date(2025, 2, 1)
  },
  {
    id: '4',
    name: 'Sarah Williams',
    lastMessage: 'Looking forward to hearing from you!',
    timestamp: new Date(2025, 2, 7, 9, 20),
    unread: 0,
    avatar: '',
    job: 'Product Manager',
    skills: ['Agile', 'Scrum', 'Product Strategy'],
    matchDate: new Date(2025, 1, 28)
  },
  {
    id: '5',
    name: 'David Brown',
    lastMessage: 'Thank you for the opportunity.',
    timestamp: new Date(2025, 2, 6, 11, 10),
    unread: 0,
    avatar: '',
    job: 'Data Scientist',
    skills: ['Python', 'Machine Learning', 'SQL'],
    matchDate: new Date(2025, 1, 25)
  }
];

// Mock data for messages in a conversation
const MOCK_MESSAGES = [
  {
    id: '1',
    senderId: 'user1',
    content: 'Hi there! I saw your profile and I think you would be a great fit for our Senior Frontend Developer position.',
    timestamp: new Date(2025, 2, 5, 10, 30)
  },
  {
    id: '2',
    senderId: 'user2',
    content: 'Thank you for reaching out! I am definitely interested in learning more about the position.',
    timestamp: new Date(2025, 2, 5, 10, 35)
  },
  {
    id: '3',
    senderId: 'user1',
    content: 'Great! The role involves working with React, TypeScript, and Node.js. Do you have experience with these technologies?',
    timestamp: new Date(2025, 2, 5, 10, 40)
  },
  {
    id: '4',
    senderId: 'user2',
    content: 'Yes, I have been working with React and TypeScript for over 5 years, and I have some experience with Node.js as well.',
    timestamp: new Date(2025, 2, 5, 10, 45)
  },
  {
    id: '5',
    senderId: 'user1',
    content: 'That sounds perfect! Would you be available for an interview next week?',
    timestamp: new Date(2025, 2, 5, 10, 50)
  },
  {
    id: '6',
    senderId: 'user2',
    content: 'Yes, I am available on Tuesday or Thursday afternoon.',
    timestamp: new Date(2025, 2, 5, 10, 55)
  },
  {
    id: '7',
    senderId: 'user1',
    content: 'Let\'s schedule for Tuesday at 2 PM. I\'ll send you a calendar invite with the details.',
    timestamp: new Date(2025, 2, 5, 11, 0)
  },
  {
    id: '8',
    senderId: 'user2',
    content: 'Sounds good! I look forward to speaking with you then.',
    timestamp: new Date(2025, 2, 5, 11, 5)
  },
  {
    id: '9',
    senderId: 'user1',
    content: 'Great! In the meantime, could you please send me your updated resume and portfolio?',
    timestamp: new Date(2025, 2, 5, 11, 10)
  },
  {
    id: '10',
    senderId: 'user2',
    content: 'Of course! I\'ll send those over right away.',
    timestamp: new Date(2025, 2, 5, 11, 15)
  },
  {
    id: '11',
    senderId: 'user2',
    content: 'Thanks for considering my application!',
    timestamp: new Date(2025, 2, 10, 14, 30)
  }
];

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
  avatar: string;
  job: string;
  skills: string[];
  matchDate: Date;
}

interface FilterOptions {
  job: string;
  skills: string[];
  dateRange: string;
}

const Messages: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(matchId || null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for messages
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for compose message
  const [showComposeView, setShowComposeView] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  
  // State for filter/sort
  const [showFilterMenu, setShowFilterMenu] = useState<null | HTMLElement>(null);
  const [showSortMenu, setShowSortMenu] = useState<null | HTMLElement>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    job: '',
    skills: [],
    dateRange: 'all'
  });
  const [sortOption, setSortOption] = useState('recent');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Sidebar width for desktop
  const sidebarWidth = 320;
  
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);
  
  // Listen for URL parameter changes and select conversation
  useEffect(() => {
    if (matchId) {
      setSelectedConversation(matchId);
      fetchMessages(matchId);
    }
  }, [matchId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    // Apply search filter
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(
        conv => 
          conv.name.toLowerCase().includes(query) || 
          conv.lastMessage.toLowerCase().includes(query) ||
          conv.job.toLowerCase().includes(query)
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const fetchMessages = (conversationId: string) => {
    setLoading(true);
    
    // In a real app, this would fetch messages from the API
    setTimeout(() => {
      setMessages(MOCK_MESSAGES);
      setLoading(false);
      
      // Mark conversation as read
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId ? { ...conv, unread: 0 } : conv
        )
      );
    }, 500);
  };
  
  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    // In a real app, this would send the message to the API
    const newMsg = {
      id: `new-${Date.now()}`,
      senderId: 'user1', // Current user
      content: newMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
    
    // Update last message in conversation list
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === selectedConversation 
          ? { 
              ...conv, 
              lastMessage: newMessage.trim(),
              timestamp: new Date()
            } 
          : conv
      )
    );
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    if (isMobile) {
      // On mobile, navigate to the conversation
      navigate(`/messages/${conversationId}`);
    }
  };
  
  const handleOpenFilterMenu = (event: React.MouseEvent<HTMLElement>) => {
    setShowFilterMenu(event.currentTarget);
  };
  
  const handleCloseFilterMenu = () => {
    setShowFilterMenu(null);
  };
  
  const handleOpenSortMenu = (event: React.MouseEvent<HTMLElement>) => {
    setShowSortMenu(event.currentTarget);
  };
  
  const handleCloseSortMenu = () => {
    setShowSortMenu(null);
  };
  
  const handleFilterChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFilterOptions({
      ...filterOptions,
      [name]: value
    });
  };
  
  const handleSortChange = (option: string) => {
    setSortOption(option);
    handleCloseSortMenu();
    
    // Apply sorting
    let sorted = [...conversations];
    switch (option) {
      case 'recent':
        sorted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        break;
      case 'unread':
        sorted.sort((a, b) => b.unread - a.unread);
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    
    setConversations(sorted);
  };
  
  const handleComposeMessage = () => {
    setShowComposeView(true);
    setSelectedConversation(null);
  };
  
  const handleCloseComposeView = () => {
    setShowComposeView(false);
    setSelectedRecipient('');
  };
  
  const renderSidebar = () => {
    return (
      <Box sx={{ 
        width: isMobile ? '100%' : sidebarWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Messages</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleComposeMessage}
              size="small"
            >
              Compose
            </Button>
          </Box>
          <TextField
            fullWidth
            placeholder="Search messages..."
            value={searchQuery}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box sx={{ display: 'flex' }}>
                    <Tooltip title="Filter">
                      <IconButton 
                        size="small" 
                        onClick={handleOpenFilterMenu}
                        aria-controls="filter-menu"
                        aria-haspopup="true"
                        color={filterOptions.job || filterOptions.dateRange !== 'all' ? "primary" : "default"}
                      >
                        <FilterListIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sort">
                      <IconButton 
                        size="small" 
                        onClick={handleOpenSortMenu}
                        aria-controls="sort-menu"
                        aria-haspopup="true"
                        color={sortOption !== 'recent' ? "primary" : "default"}
                      >
                        <SortIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </InputAdornment>
              )
            }}
          />

          {(filterOptions.job || filterOptions.dateRange !== 'all' || sortOption !== 'recent') && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filterOptions.job && (
                <Chip 
                  size="small" 
                  label={`Job: ${filterOptions.job}`}
                  onDelete={() => setFilterOptions(prev => ({ ...prev, job: '' }))}
                />
              )}
              {filterOptions.dateRange !== 'all' && (
                <Chip 
                  size="small" 
                  label={`Date: ${filterOptions.dateRange}`}
                  onDelete={() => setFilterOptions(prev => ({ ...prev, dateRange: 'all' }))}
                />
              )}
              {sortOption !== 'recent' && (
                <Chip 
                  size="small" 
                  label={`Sort: ${sortOption}`}
                  onDelete={() => handleSortChange('recent')}
                />
              )}
            </Box>
          )}
        </Box>
        
        <List sx={{ 
          overflowY: 'auto', 
          flexGrow: 1,
          '& .MuiListItem-root': {
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
          }
        }}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ListItemButton
                key={conversation.id}
                selected={selectedConversation === conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                sx={{ 
                  py: 1.5,
                  bgcolor: selectedConversation === conversation.id ? 'action.selected' : 'inherit'
                }}
              >
                <ListItemAvatar>
                  <Badge
                    color="error"
                    badgeContent={conversation.unread}
                    invisible={conversation.unread === 0}
                    overlap="circular"
                  >
                    <Avatar src={conversation.avatar}>
                      {conversation.name.charAt(0)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: conversation.unread > 0 ? 'bold' : 'normal',
                          maxWidth: '70%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {conversation.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        {format(conversation.timestamp, 'MMM d')}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: conversation.unread > 0 ? 'medium' : 'normal'
                      }}
                    >
                      {conversation.lastMessage}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No conversations found
              </Typography>
            </Box>
          )}
        </List>
        
        {/* Filter Menu */}
        <Menu
          id="filter-menu"
          anchorEl={showFilterMenu}
          open={Boolean(showFilterMenu)}
          onClose={handleCloseFilterMenu}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 2, width: 250 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filter Messages
            </Typography>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Job</InputLabel>
              <Select
                name="job"
                value={filterOptions.job}
                label="Job"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Jobs</MenuItem>
                <MenuItem value="Senior Frontend Developer">Senior Frontend Developer</MenuItem>
                <MenuItem value="UX/UI Designer">UX/UI Designer</MenuItem>
                <MenuItem value="Full Stack Developer">Full Stack Developer</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                name="dateRange"
                value={filterOptions.dateRange}
                label="Date Range"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mr: 1 }}
                onClick={handleCloseFilterMenu}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                size="small"
                onClick={handleCloseFilterMenu}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </Menu>
        
        {/* Sort Menu */}
        <Menu
          id="sort-menu"
          anchorEl={showSortMenu}
          open={Boolean(showSortMenu)}
          onClose={handleCloseSortMenu}
        >
          <MenuItem 
            selected={sortOption === 'recent'} 
            onClick={() => handleSortChange('recent')}
          >
            Most Recent
          </MenuItem>
          <MenuItem 
            selected={sortOption === 'oldest'} 
            onClick={() => handleSortChange('oldest')}
          >
            Oldest First
          </MenuItem>
          <MenuItem 
            selected={sortOption === 'unread'} 
            onClick={() => handleSortChange('unread')}
          >
            Unread First
          </MenuItem>
          <MenuItem 
            selected={sortOption === 'alphabetical'} 
            onClick={() => handleSortChange('alphabetical')}
          >
            Alphabetical
          </MenuItem>
        </Menu>
      </Box>
    );
  };
  
  const renderMessageView = () => {
    if (!selectedConversation) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          p: 3
        }}>
          <Typography variant="h6" gutterBottom>
            Select a conversation
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Choose a conversation from the sidebar to view messages
          </Typography>
        </Box>
      );
    }
    
    const conversation = conversations.find(c => c.id === selectedConversation);
    
    if (!conversation) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Conversation not found
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center'
        }}>
          {isMobile && (
            <IconButton 
              edge="start" 
              onClick={() => navigate('/messages')}
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Avatar 
            src={conversation.avatar} 
            sx={{ mr: 2 }}
          >
            {conversation.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1">
              {conversation.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {conversation.job}
            </Typography>
          </Box>
        </Box>
        
        {/* Messages */}
        <Box sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={40} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%'
            }}>
              <Typography variant="body1" color="text.secondary">
                No messages yet. Start the conversation!
              </Typography>
            </Box>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.senderId === 'user1'; // In a real app, compare with actual user ID
              
              return (
                <Box 
                  key={message.id}
                  sx={{ 
                    display: 'flex',
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}
                >
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-end'
                  }}>
                    {!isCurrentUser && (
                      <Avatar 
                        src={conversation.avatar}
                        sx={{ width: 32, height: 32, mr: 1, ml: isCurrentUser ? 1 : 0 }}
                      >
                        {conversation.name.charAt(0)}
                      </Avatar>
                    )}
                    <Box>
                      <Paper sx={{ 
                        p: 1.5,
                        bgcolor: isCurrentUser ? 'primary.main' : 'grey.100',
                        color: isCurrentUser ? 'white' : 'text.primary',
                        borderRadius: 2,
                        maxWidth: 450
                      }}>
                        <Typography variant="body2">
                          {message.content}
                        </Typography>
                      </Paper>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block', 
                          mt: 0.5,
                          ml: isCurrentUser ? 0 : 1,
                          mr: isCurrentUser ? 1 : 0,
                          textAlign: isCurrentUser ? 'right' : 'left'
                        }}
                      >
                        {format(message.timestamp, 'h:mm a')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>
        
        {/* Message Input */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          display: 'flex'
        }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            variant="outlined"
            size="small"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            sx={{ ml: 1 }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };
  
  const renderComposeView = () => {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6">
            New Message
          </Typography>
          <IconButton onClick={handleCloseComposeView}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Compose Form */}
        <Box sx={{ p: 2, flexGrow: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Recipient</InputLabel>
            <Select
              value={selectedRecipient}
              label="Select Recipient"
              onChange={(e) => setSelectedRecipient(e.target.value)}
            >
              <MenuItem value="">Select a recipient</MenuItem>
              <MenuItem value="1">John Smith - Senior Frontend Developer</MenuItem>
              <MenuItem value="2">Emily Johnson - UX/UI Designer</MenuItem>
              <MenuItem value="3">Michael Chen - Full Stack Developer</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={10}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              sx={{ mr: 1 }}
              onClick={handleCloseComposeView}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              startIcon={<SendIcon />}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px - 48px)', // Subtract AppBar height and padding
      mt: 0,
      ml: 0,
      width: '100%'
    }}>
      {/* Sidebar - only shown on desktop or when no conversation is selected on mobile */}
      {(!isMobile || !selectedConversation) && renderSidebar()}
      
      {/* Main content area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper'
      }}>
        {showComposeView ? renderComposeView() : renderMessageView()}
      </Box>
    </Box>
  );
};

export default Messages; 
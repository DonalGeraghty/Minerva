import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

// Mock Navbar component extracted from App.jsx
function Navbar() {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [location, setLocation] = React.useState({ pathname: '/' });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const scrollToTop = () => {
    console.log('Scroll to top clicked');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <h2>Minerva</h2>
        </div>
        <div className="nav-links">
          <button
            type="button"
            className={`nav-link ${location.pathname === '/habits' ? 'active' : ''}`}
            onClick={() => {
              setLocation({ pathname: '/habits' });
              scrollToTop();
            }}
          >
            Habits
          </button>
        </div>
        <div className="nav-right">
          <ThemeToggle />
          <div className="nav-time">
            <p>{currentTime.toLocaleDateString('en-GB', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })} {currentTime.toLocaleTimeString('en-GB', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Wrapper component to provide theme context
const ThemeWrapper = ({ children, isDarkMode = false }) => {
  const [theme, setTheme] = React.useState({ 
    isDarkMode, 
    toggleTheme: () => setTheme(prev => ({ ...prev, isDarkMode: !prev.isDarkMode })) 
  });
  
  return (
    <ThemeProvider value={theme}>
      <div style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeProvider>
  );
};

export default {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, { args }) => (
      <ThemeWrapper isDarkMode={args.isDarkMode}>
        <Story />
      </ThemeWrapper>
    ),
  ],
  argTypes: {
    isDarkMode: {
      control: 'boolean',
      description: 'Whether dark mode is currently active',
    },
  },
};

export const LightMode = {
  args: {
    isDarkMode: false,
  },
};

export const DarkMode = {
  args: {
    isDarkMode: true,
  },
};

export const Interactive = {
  args: {
    isDarkMode: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive navbar with working theme toggle and live time display. Click the theme toggle to switch modes and click navigation links to see active states.',
      },
    },
  },
};

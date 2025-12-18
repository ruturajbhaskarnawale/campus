import React, { createContext, useState, useContext } from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [activeRoute, setActiveRoute] = useState('Feed');

  const setTabBarVisible = (visible) => {
    setIsTabBarVisible(visible);
  };

  return (
    <NavigationContext.Provider value={{ isTabBarVisible, setTabBarVisible, activeRoute, setActiveRoute }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => useContext(NavigationContext);

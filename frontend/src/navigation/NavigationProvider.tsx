import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Screen = 'home' | 'create-room' | 'join-room' | 'host-dashboard' | 'player-game' | 'admin';

interface NavigationContextType {
  currentScreen: Screen;
  navigate: (screen: Screen, params?: any) => void;
  params: any;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [params, setParams] = useState<any>({});

  const navigate = (screen: Screen, newParams?: any) => {
    setCurrentScreen(screen);
    setParams(newParams || {});
  };

  return (
    <NavigationContext.Provider value={{ currentScreen, navigate, params }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
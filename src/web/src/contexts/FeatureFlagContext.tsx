import React, { createContext, useContext, useEffect, ReactNode } from 'react'; // react 18.x
import useLocalStorage from '../hooks/useLocalStorage';

/**
 * Interface defining all available feature flags in the application
 */
interface FeatureFlags {
  enableAIChatbot: boolean;
  enableDocumentAnalysis: boolean;
  enableRecommendations: boolean;
  enableWorkflowEditor: boolean;
  enableFinancialAid: boolean;
  enableMobileApp: boolean;
  enableBetaFeatures: boolean;
}

/**
 * Type definition for feature flag context value
 */
interface FeatureFlagContextType {
  flags: FeatureFlags;
  isEnabled: (flagName: keyof FeatureFlags) => boolean;
  setFeatureFlag: (flagName: keyof FeatureFlags, enabled: boolean) => void;
  resetFeatureFlags: () => void;
}

/**
 * Props for the FeatureFlagProvider component
 */
interface FeatureFlagProviderProps {
  children: ReactNode;
  initialFlags?: Partial<FeatureFlags>;
}

/**
 * Default feature flags configuration - conservative defaults for production
 */
const defaultFeatureFlags: FeatureFlags = {
  enableAIChatbot: false,
  enableDocumentAnalysis: false,
  enableRecommendations: false,
  enableWorkflowEditor: false,
  enableFinancialAid: true, // Financial aid is a core feature, enabled by default
  enableMobileApp: false,
  enableBetaFeatures: false,
};

// Create the context with undefined as initial value
const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

/**
 * Provider component for feature flag context
 */
const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ 
  children, 
  initialFlags = {} 
}) => {
  // Merge default flags with any initial flags provided
  const mergedDefaults = { ...defaultFeatureFlags, ...initialFlags };
  
  // Use localStorage to persist feature flags between sessions
  const [flags, setFlags] = useLocalStorage<FeatureFlags>('feature_flags', mergedDefaults);

  // Check if a specific feature flag is enabled
  const isEnabled = (flagName: keyof FeatureFlags): boolean => {
    return !!flags[flagName];
  };

  // Enable or disable a specific feature flag
  const setFeatureFlag = (flagName: keyof FeatureFlags, enabled: boolean): void => {
    setFlags(currentFlags => ({
      ...currentFlags,
      [flagName]: enabled
    }));
  };

  // Reset all feature flags to their default values
  const resetFeatureFlags = (): void => {
    setFlags(defaultFeatureFlags);
  };

  // Effect to detect environment and apply appropriate flags
  useEffect(() => {
    // Function to determine current environment
    const detectEnvironment = (): 'development' | 'staging' | 'production' => {
      if (process.env.NODE_ENV === 'development') {
        return 'development';
      }
      
      const hostname = window.location.hostname;
      if (hostname.includes('staging') || hostname.includes('test') || hostname.includes('dev')) {
        return 'staging';
      }
      
      return 'production';
    };
    
    // Only apply environment defaults if no user preferences exist
    const hasExistingFlags = localStorage.getItem('feature_flags') !== null;
    if (hasExistingFlags) {
      return;
    }
    
    // Set environment-specific defaults
    const environment = detectEnvironment();
    switch (environment) {
      case 'development':
        setFlags(current => ({
          ...current,
          enableAIChatbot: true,
          enableDocumentAnalysis: true,
          enableRecommendations: true,
          enableWorkflowEditor: true,
          enableBetaFeatures: true
        }));
        break;
        
      case 'staging':
        setFlags(current => ({
          ...current,
          enableAIChatbot: true,
          enableDocumentAnalysis: true
        }));
        break;
        
      case 'production':
        // Use conservative defaults (already set)
        break;
    }
  }, [setFlags]);

  const contextValue: FeatureFlagContextType = {
    flags,
    isEnabled,
    setFeatureFlag,
    resetFeatureFlags
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

/**
 * Custom hook to access the feature flag context
 */
const useFeatureFlags = (): FeatureFlagContextType => {
  const context = useContext(FeatureFlagContext);
  
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  
  return context;
};

export { FeatureFlagContext, FeatureFlagProvider, useFeatureFlags };
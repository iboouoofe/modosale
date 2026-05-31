import React, { createContext, useState, useEffect, useContext } from 'react';

interface LocationContextType {
  locationName: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  isLoading: boolean;
  setRadiusKm: (radius: number) => void;
  refreshLocation: () => Promise<void>;
  updateCustomLocation: (name: string, lat: number, lng: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const NEIGHBORHOODS = [
  { name: 'Moda, Kadıköy 📍', lat: 40.9782, lng: 29.0264 },
  { name: 'Suadiye, Kadıköy 📍', lat: 40.9602, lng: 29.0831 },
  { name: 'Bebek, Beşiktaş 📍', lat: 41.0763, lng: 29.0435 },
  { name: 'Cihangir, Beyoğlu 📍', lat: 41.0326, lng: 28.9859 },
  { name: 'Nişantaşı, Şişli 📍', lat: 41.0528, lng: 28.9912 }
];

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationName, setLocationName] = useState<string>('Suadiye, Kadıköy 📍');
  const [latitude, setLatitude] = useState<number>(40.9602);
  const [longitude, setLongitude] = useState<number>(29.0831);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshLocation = async () => {
    setIsLoading(true);
    // Simulate mobile hardware GPS ping & reverse geocoding delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Choose a random neighborhood from Turkish location presets
    const index = Math.floor(Math.random() * NEIGHBORHOODS.length);
    const chosen = NEIGHBORHOODS[index];
    
    setLocationName(chosen.name);
    setLatitude(chosen.lat);
    setLongitude(chosen.lng);
    setIsLoading(false);
  };

  const updateCustomLocation = (name: string, lat: number, lng: number) => {
    setLocationName(`${name} 📍`);
    setLatitude(lat);
    setLongitude(lng);
  };

  useEffect(() => {
    // Initial fetch on app mounting
    refreshLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        locationName,
        latitude,
        longitude,
        radiusKm,
        isLoading,
        setRadiusKm,
        refreshLocation,
        updateCustomLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

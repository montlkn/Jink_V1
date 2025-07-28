import { useState, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords),
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  return { location, error };
} 
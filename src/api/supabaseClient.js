/* File: /src/api/supabaseClient.js
  Description: Initializes and exports the Supabase client.
  It reads the credentials from your .env file.
*/
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- EXAMPLE USAGE (for later) ---
/*
  import { supabase } from './supabaseClient';

  const fetchBuildings = async () => {
    const { data, error } = await supabase
      .from('buildings')
      .select('*');
    
    if (error) console.error('Error fetching buildings:', error);
    else console.log('Buildings:', data);
  }
*/
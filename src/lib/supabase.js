import { createClient } from '@supabase/supabase-js'

// 👇 Replace these with your actual values from Supabase project settings
const SUPABASE_URL = 'https://mxyhabaculxcjluelvyh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eWhhYmFjdWx4Y2psdWVsdnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTk4MDgsImV4cCI6MjA5NTQzNTgwOH0.rCr0qjEblb8V6Su_kd8smR9TSBA38lAiOepBkJi0KZc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

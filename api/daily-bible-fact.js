import { env } from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { createDailyFactHandler } from '../server/dailyBibleFact.js';

export default createDailyFactHandler({ env, createClient });

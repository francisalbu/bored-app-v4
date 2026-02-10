/**
 * Supabase Database Configuration
 * PostgreSQL database connection for production
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (for backend operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute a database query
 * @param {string} table - Table name
 * @param {object} options - Query options
 */
const query = (table) => {
  return supabase.from(table);
};

/**
 * Helper functions for common operations
 */
const db = {
  // Generic query builder
  from: (table) => supabase.from(table),
  
  // Users
  users: {
    findByEmail: async (email) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      return { data, error };
    },
    
    findBySupabaseUid: async (uid) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_uid', uid)
        .single();
      return { data, error };
    },
    
    create: async (userData) => {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      return { data, error };
    },
    
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    }
  },
  
  // Experiences
  experiences: {
    findAll: async (filters = {}) => {
      let query = supabase
        .from('experiences')
        .select('*, operators(*)');
      
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    findById: async (id) => {
      const { data, error } = await supabase
        .from('experiences')
        .select('*, operators(*)')
        .eq('id', id)
        .single();
      return { data, error };
    },
    
    create: async (expData) => {
      const { data, error } = await supabase
        .from('experiences')
        .insert(expData)
        .select()
        .single();
      return { data, error };
    }
  },
  
  // Bookings
  bookings: {
    findByUser: async (userId) => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, experiences(*), availability_slots(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data, error };
    },
    
    findByEmail: async (email) => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, experiences(*), availability_slots(*)')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });
      return { data, error };
    },
    
    findByReference: async (reference) => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, experiences(*), availability_slots(*)')
        .eq('booking_reference', reference)
        .single();
      return { data, error };
    },
    
    create: async (bookingData) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();
      return { data, error };
    },
    
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    }
  },
  
  // Reviews
  reviews: {
    findByExperience: async (experienceId) => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, users(name, avatar)')
        .eq('experience_id', experienceId)
        .order('created_at', { ascending: false });
      return { data, error };
    },
    
    create: async (reviewData) => {
      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();
      return { data, error };
    }
  },
  
  // Favorites
  favorites: {
    findByUser: async (userId) => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, experiences(*)')
        .eq('user_id', userId);
      return { data, error };
    },
    
    toggle: async (userId, experienceId) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('experience_id', experienceId)
        .single();
      
      if (existing) {
        // Delete
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('experience_id', experienceId);
        return { deleted: true, error };
      } else {
        // Insert
        const { data, error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, experience_id: experienceId })
          .select()
          .single();
        return { data, error };
      }
    }
  },
  
  // Availability Slots
  availabilitySlots: {
    findByExperience: async (experienceId, fromDate) => {
      let query = supabase
        .from('availability_slots')
        .select('*')
        .eq('experience_id', experienceId)
        .eq('is_available', true);
      
      if (fromDate) {
        query = query.gte('date', fromDate);
      }
      
      const { data, error } = await query.order('date', { ascending: true });
      return { data, error };
    },
    
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('availability_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    }
  }
};

module.exports = { supabase, db };

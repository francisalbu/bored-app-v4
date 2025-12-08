/**
 * AI Concierge Routes - Smart Travel Assistant
 * Combines OpenAI GPT-4o-mini with Supabase experiences database + Google Places
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Credentials
const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
const OPENAI_KEY = process.env.OPENAI_KEY;
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// Simple cache for Google Places results (1 hour TTL)
const placesCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

// Store conversation history per session
const conversationHistory = new Map();

// Clean old sessions and cache every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, data] of conversationHistory) {
    if (data.lastActivity < oneHourAgo) {
      conversationHistory.delete(sessionId);
    }
  }
  for (const [key, data] of placesCache) {
    if (data.timestamp < oneHourAgo) {
      placesCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Search nearby places using Google Places API
async function searchNearbyPlaces(location, type, keyword) {
  if (!GOOGLE_PLACES_KEY) {
    console.log('⚠️ Google Places API key not configured');
    return null;
  }

  const cacheKey = `${location}_${type}_${keyword}`;
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('📍 Using cached places data');
    return cached.data;
  }

  try {
    const query = `${keyword} near ${location} Portugal`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=${type}&key=${GOOGLE_PLACES_KEY}`;
    
    console.log('📍 Searching Google Places:', query);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.length > 0) {
      const places = data.results
        .filter(p => p.rating >= 4.0)
        .slice(0, 3)
        .map(p => ({
          name: p.name,
          rating: p.rating,
          totalRatings: p.user_ratings_total,
          address: p.formatted_address,
          priceLevel: p.price_level,
          isOpen: p.opening_hours?.open_now,
        }));
      
      placesCache.set(cacheKey, { data: places, timestamp: Date.now() });
      console.log('✅ Found', places.length, 'places');
      return places;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Google Places error:', error);
    return null;
  }
}

// Fetch all experiences from database
async function getExperiences() {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .order('rating', { ascending: false });
  
  if (error) {
    console.error('❌ Supabase error:', error);
    return [];
  }
  return data || [];
}

// Format experience for display
function formatExperience(exp) {
  let firstImage = exp.image_url;
  if (exp.images) {
    const imagesArray = typeof exp.images === 'string' ? JSON.parse(exp.images) : exp.images;
    if (Array.isArray(imagesArray) && imagesArray.length > 0) {
      firstImage = imagesArray[0];
    }
  }
  
  return {
    id: String(exp.id),
    title: exp.title,
    description: exp.description,
    category: exp.category,
    tags: Array.isArray(exp.tags) ? exp.tags : [],
    location: exp.location,
    meetingPoint: exp.meeting_point,
    price: exp.price,
    currency: exp.currency || 'EUR',
    duration: exp.duration,
    rating: exp.rating || 0,
    reviewCount: exp.review_count || 0,
    image: firstImage,
    images: exp.images,
  };
}

// Build system prompt with experiences context
function buildSystemPrompt(experiences, placesData = null) {
  const experiencesList = experiences.map(exp => {
    return `- ID:${exp.id} | "${exp.title}" | ${exp.category} | ${exp.location} | €${exp.price} | ${exp.duration}`;
  }).join('\n');

  let placesContext = '';
  if (placesData && placesData.length > 0) {
    placesContext = `\n\nREAL PLACES DATA (from Google - use these specific names!):
${placesData.map(p => `- ${p.name} (★${p.rating}, ${p.totalRatings} reviews)${p.isOpen ? ' - Open now' : ''}`).join('\n')}`;
  }

  return `You are the AI Concierge for "Bored Tourist." 
MISSION: Kill boring tourism. We are the anti-TripAdvisor.

PERSONALITY - THIS IS NON-NEGOTIABLE:
- You're that friend who's slightly judgy but always right
- You roast bad ideas. You have OPINIONS.
- Lowercase. Short. Punchy. Like texting your coolest friend.
- 1-2 sentences MAXIMUM. No essays.
- 1 emoji max (for sarcasm or emphasis only)

FORBIDDEN BEHAVIORS (instant fail):
❌ "Are you looking for..." - NEVER ask polite clarifying questions like a customer service bot
❌ "Nice!" as a standalone response - boring
❌ Long paragraphs - you have ADHD energy
❌ Being helpful without attitude
❌ Generic suggestions without specific names
❌ Sounding like ChatGPT or a travel blog

APPROVED BEHAVIORS:
✅ Roast their basic ideas: "Belém Tower? bro that's a 2 hour line for a photo 💀"
✅ Give unsolicited opinions: "that place is mid tbh"
✅ Be specific: actual street names, actual restaurant names
✅ Challenge them: "you want tourist traps or the real deal?"
✅ Sound like you're texting: "nah", "lowkey", "tbh", "kinda fire"

OUR DATA (Use [ID:XX] for paid items):
${experiencesList}
${placesContext}

EXAMPLES OF YOUR EXACT TONE:

User: "I'm in Sesimbra diving"
You: "sick. the water's freezing though 🥶 after you dry off, skip the tourist seafood traps on the strip. locals eat at the tascas up the hill."

User: "What to do in Lisbon?"
You: "depends. you want instagram spots or actually cool stuff?"

User: "Best restaurant in Cascais?"
You: "define best. fancy date night or plastic chairs with the best fish of your life?"

User: "I want to see Belém Tower"
You: "i mean... it's a 2h line for a tiny tower 💀 but you do you"

REMEMBER: You're not here to please everyone. You have taste. Use it.
`;
}

// Extract experience IDs from AI response
function extractExperienceIds(text) {
  const regex = /\[ID:(\d+)\]/g;
  const ids = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}

// Detect if user is asking about places (restaurants, beaches, etc)
function detectPlacesQuery(message) {
  const lowerMsg = message.toLowerCase();
  const patterns = [
    { keywords: ['restaurant', 'eat', 'food', 'lunch', 'dinner', 'comer'], type: 'restaurant', keyword: 'best restaurants' },
    { keywords: ['cafe', 'coffee', 'café', 'breakfast'], type: 'cafe', keyword: 'best cafes' },
    { keywords: ['beach', 'praia', 'sun', 'swim'], type: 'natural_feature', keyword: 'best beaches' },
    { keywords: ['bar', 'drink', 'nightlife', 'drinks'], type: 'bar', keyword: 'best bars' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => lowerMsg.includes(kw))) {
      return pattern;
    }
  }
  return null;
}

// Extract location from message
function extractLocation(message) {
  const locations = [
    'costa da caparica', 'caparica', 'cascais', 'sintra', 'lisbon', 'lisboa',
    'belem', 'belém', 'alfama', 'bairro alto', 'chiado', 'rossio', 'baixa',
    'sesimbra', 'arrabida', 'arrábida', 'ericeira', 'nazare', 'nazaré'
  ];
  
  const lowerMsg = message.toLowerCase();
  for (const loc of locations) {
    if (lowerMsg.includes(loc)) {
      return loc;
    }
  }
  return 'Lisbon'; // Default
}

// MAIN CHAT ENDPOINT
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    const sid = sessionId || `session_${Date.now()}`;
    console.log(`💬 [${sid}] User: ${message}`);
    
    // Get or create conversation history
    if (!conversationHistory.has(sid)) {
      conversationHistory.set(sid, { messages: [], lastActivity: Date.now() });
    }
    const session = conversationHistory.get(sid);
    session.lastActivity = Date.now();
    
    // Fetch experiences
    const experiences = await getExperiences();
    if (experiences.length === 0) {
      return res.json({
        success: true,
        response: "Having trouble accessing experiences right now. Try again! 🙏",
        experiences: [],
        sessionId: sid
      });
    }
    
    // Check if user is asking about places and fetch from Google
    let placesData = null;
    const placesQuery = detectPlacesQuery(message);
    if (placesQuery && GOOGLE_PLACES_KEY) {
      const location = extractLocation(message);
      console.log(`📍 Detected places query: ${placesQuery.type} near ${location}`);
      placesData = await searchNearbyPlaces(location, placesQuery.type, placesQuery.keyword);
    }
    
    // Build system prompt
    const systemPrompt = buildSystemPrompt(experiences, placesData);
    
    // Add user message to history
    session.messages.push({ role: 'user', content: message });
    
    // Build messages for OpenAI
    const messages = [{ role: 'system', content: systemPrompt }];
    
    // Add context if provided
    if (context?.currentExperience) {
      const exp = experiences.find(e => String(e.id) === String(context.currentExperience.id));
      if (exp) {
        messages.push({
          role: 'system',
          content: `CONTEXT: User viewing "${exp.title}" at ${exp.location}.`
        });
      }
    }
    
    if (context?.upcomingBooking) {
      const booking = context.upcomingBooking;
      messages.push({
        role: 'system',
        content: `CONTEXT: User has booking for "${booking.experienceTitle}" on ${booking.date} at ${booking.location}.`
      });
    }
    
    // Add conversation history (last 10 messages)
    messages.push(...session.messages.slice(-10));
    
    // Call OpenAI
    console.log(`🤖 [${sid}] Calling OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.85,
      max_tokens: 120,
    });
    
    const aiResponse = completion.choices[0].message.content;
    console.log(`✅ [${sid}] AI: ${aiResponse.substring(0, 100)}...`);
    
    // Add to history
    session.messages.push({ role: 'assistant', content: aiResponse });
    
    // Extract mentioned experience IDs
    const mentionedIds = extractExperienceIds(aiResponse);
    const mentionedExperiences = mentionedIds
      .map(id => experiences.find(exp => String(exp.id) === id))
      .filter(Boolean)
      .map(formatExperience);
    
    res.json({
      success: true,
      response: aiResponse.trim(),
      experiences: mentionedExperiences,
      places: placesData,
      sessionId: sid
    });
    
  } catch (error) {
    console.error('❌ AI Concierge error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Something went wrong. Please try again!',
      details: error.message 
    });
  }
});

// Get suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      { emoji: '🔥', text: 'I want to do something wild' },
      { emoji: '🌊', text: 'Get me in the water' },
      { emoji: '🚴', text: 'Show me bike adventures' },
      { emoji: '🌅', text: 'Plan my weekend' },
      { emoji: '💑', text: 'Date ideas that aren\'t basic' },
      { emoji: '🤔', text: 'Surprise me with something cool' },
    ];
    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search places endpoint
router.get('/places', async (req, res) => {
  try {
    const { location, type, keyword } = req.query;
    if (!location) {
      return res.status(400).json({ success: false, error: 'Location is required' });
    }
    const places = await searchNearbyPlaces(location, type || 'restaurant', keyword || 'best restaurants');
    res.json({ success: true, places: places || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear conversation
router.post('/clear', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && conversationHistory.has(sessionId)) {
    conversationHistory.delete(sessionId);
  }
  res.json({ success: true, message: 'Conversation cleared' });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'AI Concierge is ready!',
    openaiConfigured: !!OPENAI_KEY,
    placesConfigured: !!GOOGLE_PLACES_KEY
  });
});

module.exports = router;
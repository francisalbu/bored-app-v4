/**
 * AI Concierge Routes - Smart Travel Assistant
 * Combines OpenAI GPT-4o-mini with Supabase experiences database
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Credentials
const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
const OPENAI_KEY = process.env.OPENAI_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// Store conversation history per session (in production, use Redis/DB)
const conversationHistory = new Map();

// Clean old sessions every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, data] of conversationHistory) {
    if (data.lastActivity < oneHourAgo) {
      conversationHistory.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

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
  // Get first image
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
    highlights: exp.highlights,
    included: exp.included,
    whatToBring: exp.what_to_bring,
    maxGroupSize: exp.max_group_size,
    latitude: exp.latitude,
    longitude: exp.longitude,
  };
}

// Build system prompt with experiences context
function buildSystemPrompt(experiences) {
  const experiencesList = experiences.map(exp => {
    return `- ID:${exp.id} | "${exp.title}" | ${exp.category} | ${exp.location} | €${exp.price} | ${exp.duration} | Tags: ${(exp.tags || []).join(', ')}`;
  }).join('\n');

  return `You are the AI Concierge for "Bored Tourist", a travel app focused on experiences in Portugal (mainly Lisbon area).

YOUR PERSONALITY:
- Friendly, helpful, and slightly playful
- You're like a cool local friend who knows all the best spots
- Keep responses concise but informative (max 150 words unless user asks for details)
- Use 1-2 emojis per response to keep it fun

AVAILABLE EXPERIENCES IN OUR DATABASE:
${experiencesList}

YOUR CAPABILITIES:
1. **Recommend experiences** based on user preferences, mood, interests, time of day
2. **Plan itineraries** - suggest combinations of activities for a day/weekend
3. **Answer questions** about specific experiences (price, duration, location, what to bring)
4. **Help with logistics** - suggest what to do before/after an experience based on location
5. **Be conversational** - if user is vague, ask clarifying questions (interests, budget, group size, fitness level)

RULES:
1. ONLY recommend experiences from the database above
2. When recommending, include the experience ID in format [ID:XX] so the app can link to it
3. If asked about something not in our database, acknowledge it and suggest similar alternatives we DO have
4. For logistics questions (transport, nearby restaurants), give general advice but encourage booking through our app
5. If user mentions a specific date/time, factor that into recommendations (morning activities, evening experiences, etc.)
6. Maximum 3-4 experience recommendations per response unless user asks for more

RESPONSE FORMAT:
- For recommendations: Include [ID:XX] after the experience name
- Be conversational first, then list recommendations
- If suggesting multiple experiences, briefly explain why each one fits

EXAMPLES:
User: "I want something adventurous for tomorrow morning"
You: "Morning adrenaline? I've got you! 🌊 Check out **Kayak Experience in Sesimbra** [ID:26] - paddle through crystal-clear waters and explore sea caves. Or if you prefer wheels, the **Electric Mountain Bike Tour in Sintra** [ID:29] is epic for morning rides through the forest. Both start early and leave your afternoon free!"

User: "What can I do near Costa da Caparica?"
You: "Costa da Caparica is surf paradise! 🏄 We have **Surf Lesson at Costa da Caparica** [ID:15] which is perfect for beginners. After that, you could grab lunch at the beach bars and then try the **Arrabida & Sesimbra Day Tour** [ID:8] which is nearby and shows you the stunning coastline!"`;
}

// Extract experience IDs from AI response
function extractExperienceIds(text) {
  const regex = /\[ID:(\d+)\]/g;
  const ids = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)]; // Remove duplicates
}

// Clean AI response (remove [ID:XX] markers for display, keep them for parsing)
function cleanResponse(text) {
  // Keep the text as-is, the app will handle rendering
  return text.trim();
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
      conversationHistory.set(sid, {
        messages: [],
        lastActivity: Date.now()
      });
    }
    const session = conversationHistory.get(sid);
    session.lastActivity = Date.now();
    
    // Fetch experiences
    const experiences = await getExperiences();
    if (experiences.length === 0) {
      return res.json({
        success: true,
        response: "I'm having trouble accessing our experiences right now. Please try again in a moment! 🙏",
        experiences: [],
        sessionId: sid
      });
    }
    
    // Build system prompt with experiences
    const systemPrompt = buildSystemPrompt(experiences);
    
    // Add user message to history
    session.messages.push({ role: 'user', content: message });
    
    // Build messages for OpenAI (include context if provided)
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add context about current experience if provided
    if (context?.currentExperience) {
      const exp = experiences.find(e => String(e.id) === String(context.currentExperience.id));
      if (exp) {
        messages.push({
          role: 'system',
          content: `CONTEXT: User is currently viewing "${exp.title}" (ID:${exp.id}) at ${exp.location}. They might ask questions about this specific experience or want related suggestions.`
        });
      }
    }
    
    // Add booking context if provided
    if (context?.upcomingBooking) {
      const booking = context.upcomingBooking;
      messages.push({
        role: 'system',
        content: `CONTEXT: User has an upcoming booking for "${booking.experienceTitle}" on ${booking.date} at ${booking.time} at ${booking.location}. They might ask what to do before/after.`
      });
    }
    
    // Add conversation history (last 10 messages to avoid token limits)
    const recentMessages = session.messages.slice(-10);
    messages.push(...recentMessages);
    
    // Call OpenAI
    console.log(`🤖 [${sid}] Calling OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const aiResponse = completion.choices[0].message.content;
    console.log(`✅ [${sid}] AI Response: ${aiResponse.substring(0, 100)}...`);
    
    // Add AI response to history
    session.messages.push({ role: 'assistant', content: aiResponse });
    
    // Extract mentioned experience IDs
    const mentionedIds = extractExperienceIds(aiResponse);
    console.log(`📦 [${sid}] Mentioned experiences:`, mentionedIds);
    
    // Get full experience data for mentioned IDs
    const mentionedExperiences = mentionedIds
      .map(id => experiences.find(exp => String(exp.id) === id))
      .filter(Boolean)
      .map(formatExperience);
    
    // Clean response for display
    const cleanedResponse = cleanResponse(aiResponse);
    
    res.json({
      success: true,
      response: cleanedResponse,
      experiences: mentionedExperiences,
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

// Get suggestions for quick actions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      { emoji: '🌅', text: 'Plan my weekend in Lisbon' },
      { emoji: '🏄', text: 'I want something adventurous' },
      { emoji: '🍷', text: 'Relaxing experiences for couples' },
      { emoji: '👨‍👩‍👧‍👦', text: 'Family-friendly activities' },
      { emoji: '📸', text: 'Best spots for photos' },
      { emoji: '🌊', text: 'Water activities near Lisbon' },
    ];
    
    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear conversation history
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
    openaiConfigured: !!OPENAI_KEY
  });
});

module.exports = router;

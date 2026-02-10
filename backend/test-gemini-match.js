const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

async function test() {
  // Dados REAIS do Reel de surf
  const metadata = {
    platform: 'instagram',
    description: 'Sun set sesh Are THE BEST 🌴🌎🔥🌎🌎🌎🌎🌅🌅☀️🌅🌅🌅🌅🌅🌅NEVER STOP WORKING 🌎🌴🦾🌎🌎🌎🌎🌎',
    hashtags: ['#surf', '#sunset', '#surfing', '#surflife', '#surfphotography', '#world', '#day', '#sun', '#surftrip', '#livingmybestlife', '#life', '#lifestyle', '#livingthegoodlife', '#ocean'],
    fullTitle: 'Sun set sesh Are THE BEST #surf #sunset #surfing #surflife #ocean'
  };
  
  console.log('📱 Metadata simulado:', metadata);
  
  // Hardcoded for test - same values from app
  const SUPABASE_URL = 'https://hnivuisqktlrusyqywaz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXZ1aXNxa3RscnVzeXF5d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzE2NzgsImV4cCI6MjA3ODc0NzY3OH0.amqHQkxh9tun5cIHUJN23ocGImZek6QfoSGpLDSUhDA';
  const GOOGLE_AI_KEY = 'AIzaSyAlvnCcn8ndC6avTq2BlW7LJ-H3VgCEAk4';
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { data: experiences, error } = await supabase
    .from('experiences')
    .select('id, title, category, tags, location')
    .order('rating', { ascending: false });
  
  if (error) {
    console.error('Erro Supabase:', error);
    return;
  }
  
  console.log('📦 Total experiências:', experiences.length);
  
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const experiencesSummary = experiences.map(exp => ({
    id: exp.id, title: exp.title, category: exp.category, tags: exp.tags, location: exp.location
  }));
  
  const contentContext = 'Description: "' + metadata.description + '"\nHashtags: ' + metadata.hashtags.join(', ');
  
  const prompt = `You are matching social media content to travel experiences in Portugal.

SOCIAL MEDIA CONTENT:
${contentContext}

AVAILABLE EXPERIENCES:
${JSON.stringify(experiencesSummary, null, 2)}

MATCHING PRIORITY (follow strictly):

1. DIRECT MATCH (highest priority): If a hashtag is a SPECIFIC activity (surf, yoga, wine, cooking, horse), 
   ALWAYS include ALL experiences that contain that exact word in title or tags.
   Example: #surf → MUST include every experience with "surf" in title/tags

2. RELATED MATCH (second priority): After direct matches, add experiences with related concepts.
   Example: #surf → also add beach experiences, water sports, coastal activities

3. CONTEXTUAL MATCH (third priority): For GENERIC hashtags (beach, summer, paradise, vacation, adventure),
   use creativity to find thematically related experiences.
   Example: #summer → beach activities, outdoor tours, water sports

KEYWORD MAPPINGS:
- surf/surfing/waves → surf lessons, surf camps, beach activities
- wine/vineyard/tasting → wine tours, wine experiences
- cooking/chef/food/gastronomy → cooking classes, food tours
- yoga/meditation/wellness → yoga retreats, wellness experiences
- horse/riding/equestrian → horseback riding
- beach/praia/coastal → beach activities, coastal tours
- adventure/adrenaline/extreme → adventure experiences, outdoor activities

Return ONLY a JSON array of experience IDs (max 5), ordered by relevance (direct matches first).
Example: [26, 18, 19, 5, 3]

If nothing matches well, return [].`;

  console.log('🤖 A chamar Gemini AI...');
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
  });

  let text = result.response.text().trim();
  console.log('🤖 Gemini Response (raw):', text);
  
  // Clean markdown wrapper if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  console.log('🧹 Cleaned:', text);
  
  const matchedIds = JSON.parse(text);
  
  console.log('\n✅ TOP 3 EXPERIÊNCIAS RECOMENDADAS para #surf #paradise:\n');
  
  matchedIds.slice(0, 3).forEach((id, i) => {
    const exp = experiences.find(e => e.id === id || e.id === String(id));
    if (exp) {
      console.log((i+1) + '. ' + exp.title);
      console.log('   📍 ' + exp.location);
      console.log('   🏷️  ' + (exp.tags || []).join(', '));
      console.log('');
    }
  });
}

test().catch(console.error);

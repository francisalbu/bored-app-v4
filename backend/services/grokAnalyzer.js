const axios = require('axios');

class GrokAnalyzer {
  constructor() {
    this.xaiApiKey = process.env.XAI_API_KEY; // Precisas adicionar isto ao .env
    this.apiUrl = 'https://api.x.ai/v1/chat/completions';
  }

  async analyzeInstagramUrl(instagramUrl, userDescription = '') {
    const startTime = Date.now();
    
    try {
      console.log('\n🤖 Starting Grok AI analysis for:', instagramUrl);
      
      const prompt = `Analyze this Instagram post/reel: ${instagramUrl}

Extract the following information:
1. ACTIVITY: What activity is shown? (e.g., surfing, skiing, food tour, sightseeing)
2. LOCATION: Where is this taking place? Be as specific as possible (city, region, country)
3. DESCRIPTION: Brief description of what's happening in the post
4. HASHTAGS: List any relevant hashtags

${userDescription ? `User context: ${userDescription}` : ''}

Return ONLY valid JSON (no markdown):
{
  "activity": "specific activity name",
  "location": "City/Region, Country",
  "description": "brief description",
  "hashtags": ["hashtag1", "hashtag2"],
  "confidence": 0.85
}`;

      const response = await axios.post(
        this.apiUrl,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a travel content analyzer. You can access and analyze Instagram posts to extract activity and location information.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'grok-beta',
          stream: false,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.xaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const grokResponse = response.data.choices[0].message.content;
      console.log('🤖 Grok raw response:', grokResponse);
      
      // Parse JSON from response
      const jsonText = grokResponse.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(jsonText);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`\n✅ Grok analysis complete in ${(processingTime/1000).toFixed(1)}s`);
      console.log(`📍 Activity: ${analysis.activity}`);
      console.log(`🌍 Location: ${analysis.location}`);
      console.log(`💯 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      
      return {
        activity: analysis.activity,
        location: analysis.location,
        description: analysis.description,
        hashtags: analysis.hashtags || [],
        confidence: analysis.confidence || 0.8,
        processingTime,
        method: 'grok_ai',
        userDescription
      };
      
    } catch (error) {
      console.error('❌ Grok AI analysis failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }
}

module.exports = new GrokAnalyzer();

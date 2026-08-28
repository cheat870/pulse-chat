// AI Chat Controller
exports.chat = async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;
    const lastUserMessage = messages && messages.length > 0
      ? messages[messages.length - 1]?.parts?.[0]?.text || messages[messages.length - 1]?.content || ''
      : '';

    if (!lastUserMessage) {
      return res.status(400).json({ error: 'Message content required' });
    }

    const lower = lastUserMessage.toLowerCase().trim();

    // Smart contextual responses for PulseChat
    let reply = '';
    if (lower.includes('introduce') || lower.includes('who are you') || lower.includes('hello') || lower.includes('hi') || lower.includes('សួស្តី')) {
      reply = `👋 **Hello! I'm PulseBot**, your built-in AI assistant for PulseChat! 🚀\n\nI can help you with:\n- 💬 Translating languages (English, Khmer, etc.)\n- 📝 Summarizing ideas and messages\n- 💡 Answering general questions and coding tips\n- 🎭 Telling jokes and fun facts\n\nHow can I assist you right now?`;
    } else if (lower.includes('translate') || lower.includes('ជំរាបសួរ') || lower.includes('ប្រែ') || lower.includes('khmer')) {
      if (lower.includes('ជំរាបសួរ')) {
        reply = `✨ **Translation:**\n- **Khmer:** ជំរាបសួរ (Choum Reap Sour)\n- **English:** "Hello" or "Greetings" (Formal & respectful Cambodian greeting 🙏)`;
      } else {
        reply = `🌐 **Translation Assistant:**\nI can translate English ⇄ Khmer, Chinese, French, and more. Send me any phrase in quotes and tell me which language you want it translated to!`;
      }
    } else if (lower.includes('fact') || lower.includes('fun fact')) {
      const facts = [
        "Did you know? Sound travels about 4.3 times faster in water than in air!",
        "Did you know? The first computer programmer was Ada Lovelace in 1843!",
        "Did you know? PulseChat supports end-to-end encrypted messaging, screen sharing, and WebRTC group calling!",
        "Did you know? Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that is still edible!"
      ];
      reply = `💡 **Fun Fact:**\n${facts[Math.floor(Math.random() * facts.length)]}`;
    } else if (lower.includes('joke') || lower.includes('funny') || lower.includes('សើច')) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😂",
        "Why did the JavaScript developer wear glasses? Because they didn't C#! 👓😆",
        "There are 10 types of people in the world: those who understand binary, and those who don't! 🤖"
      ];
      reply = `😂 **Here's one for you:**\n${jokes[Math.floor(Math.random() * jokes.length)]}`;
    } else if (lower.includes('help') || lower.includes('feature') || lower.includes('what can pulsechat do')) {
      reply = `✨ **PulseChat Super Features:**\n- 👥 **Group & 1-on-1 Chat** with typing indicators & read receipts\n- 📞 **Voice & Video Calls** with Screen Sharing & Noise Reduction\n- 📸 **24h Stories** (Instagram style)\n- 📰 **Social Feed** with photo/video posts, likes & comments\n- 📊 **Live Polls** in group conversations\n- 🎨 **Custom Themes & Wallpapers** per chat\n- 💾 **Message Bookmarks** & 🔍 **Global Search**`;
    } else {
      reply = `🤖 **PulseBot:**\nI received your message: "*${lastUserMessage}*"\n\nHere is a quick answer: Everything is running smoothly on PulseChat! If you need help with chat features, translating phrases, or writing messages, just ask me anytime! 🚀`;
    }

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI processing error' });
  }
};

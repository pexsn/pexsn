import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 Claude 客户端
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Claude API 端点
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 构建消息历史
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // 调用 Claude API
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    res.json({
      message: assistantMessage,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Claude API 错误:', error);
    res.status(500).json({ 
      error: '处理请求时出错',
      details: error.message 
    });
  }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Claude API 服务运行中' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('Claude API 已集成');
});

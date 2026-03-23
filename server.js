import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 Claude 客户端
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// SMTP 邮件发送配置（用于免费演示表单通知）
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
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
app.post('/api/lead', async (req, res) => {
  try {
    const { email, message, plan = 'Starter' } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'email 和 message 都是必填项' });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'no-reply@pexsn.com',
      to: process.env.LEAD_EMAIL_TO || 'info@pexsn.com',
      subject: `[Pexsn] 免费演示申请 - ${email}`,
      text: `来自: ${email}\n计划: ${plan}\n想自动化: ${message}\n`,
      html: `<p>来自: <strong>${email}</strong></p><p>计划: <strong>${plan}</strong></p><p>想自动化: <strong>${message}</strong></p>`
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: '已发送演示申请，稍后会通过邮件回复。' });
  } catch (error) {
    console.error('Lead 邮件发送失败：', error);
    res.status(500).json({ error: '发送失败，请稍后重试', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Claude API 服务运行中' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('Claude API 已集成');
});

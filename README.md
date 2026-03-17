# Eldarisoft AI

> AI chatbot demo for businesses — try it live at [ai.eldarisoft.fi](https://ai.eldarisoft.fi)

![Welcome screen](welcome.png)

## What it does

A production-ready AI chatbot demo that shows businesses what their own AI assistant could look like. Built for [Eldarisoft](https://www.eldarisoft.fi) as both a sales tool and a portfolio piece.

## Live demo

🔗 **[ai.eldarisoft.fi](https://ai.eldarisoft.fi)**

![Chat in action](chat.png)

## Tech stack

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white)

## Architecture
```
User → ai.eldarisoft.fi (AWS S3 + CloudFront)
     → Cloudflare Worker (rate limiting, hides API key)
     → Anthropic Claude API
```

## Security

- API key stored only in Cloudflare environment variables
- Rate limiting: 100 requests per IP per hour
- Input validation: 500 character limit
- Monthly spending cap: hard limit on Anthropic Console

## About Eldarisoft

Eldarisoft builds custom web applications and AI solutions for businesses in Finland.
→ [www.eldarisoft.fi](https://www.eldarisoft.fi)

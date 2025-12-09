# Silo Storage Dashboard

A high-performance internal dashboard for monitoring AI agent analytics and reviewing conversation logs, integrated with Voiceflow API.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Ensure your `.env.local` file contains the Voiceflow API credentials:
```
PROJECT_ID=68792d2878b4da6819beed13
VERSION_ID=68792d2878b4da6819beed14
API_KEY=VF.DM.6900af41a4313f954735f12b.7aOTRQv8N76ZUXTV
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Analytics Dashboard**: View conversation metrics, message statistics, and user analytics
- **Time Period Filtering**: Filter data by 7, 14, 30, or 90 days
- **Visual Charts**: Interactive charts showing conversations and messages over time
- **Voiceflow Integration**: Real-time data from Voiceflow Analytics API

## Project Structure

```
├── app/
│   ├── api/
│   │   └── analytics/        # API route for Voiceflow analytics
│   ├── analytics/            # Analytics page
│   ├── layout.tsx            # Root layout with sidebar
│   └── globals.css           # Global styles and design tokens
├── components/
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── MetricCard.tsx        # Metric display card
│   ├── TimeFilter.tsx        # Time period selector
│   ├── ConversationsChart.tsx # Conversations chart
│   └── MessagesChart.tsx     # Messages chart
├── lib/
│   └── voiceflow.ts          # Voiceflow API client
└── types/
    └── analytics.ts          # TypeScript interfaces
```

## Design System

- **Primary Color**: `#ec2f2f` (Vibrant Red)
- **Secondary Color**: `#000000` (Black)
- **Background**: `#ffffff` (White)
- **Typography**: Robostic-Futuristic-Font (headings), Metropolis (body)

## API Integration

The dashboard integrates with Voiceflow's Analytics API to fetch:
- Total conversations
- Incoming messages
- Average interactions per conversation
- Unique users
- Time series data for visualizations

## Build

```bash
npm run build
npm start
```






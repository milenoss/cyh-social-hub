# 🎯 Choose Your Hard - v1.0.0

> **Life's going to be hard no matter what. You might as well choose your hard and make it meaningful.**

A modern, social challenge platform that helps people build meaningful habits, connect with like-minded individuals, and track their personal growth journey.

![Choose Your Hard](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)

## 🌟 Features

### ✅ **Core Features (v1.0.0)**
- **🎯 Challenge System** - Create, join, and track personal challenges
- **👥 Social Community** - Connect with others on similar journeys
- **📊 Progress Tracking** - Visual progress monitoring and streak tracking
- **🏆 Achievement System** - Gamified badges and milestones
- **📱 Responsive Design** - Works seamlessly on all devices
- **🔐 Secure Authentication** - Email/password authentication with Supabase
- **📧 Email Verification** - Secure email confirmation process
- **🔑 Password Reset** - Secure password recovery system
- **🎨 Premium UI** - Modern, accessible design with dark/light themes
- **📈 Leaderboards** - Compete and compare progress with others
- **💬 Community Feed** - Real-time activity and social interactions
- **🔍 Advanced Search** - Find challenges by category, difficulty, and more

### 🎨 **Design Highlights**
- **Premium Blue Theme** - Professional, trustworthy color scheme
- **Smooth Animations** - Micro-interactions and transitions
- **Mobile-First** - Optimized for mobile and desktop experiences
- **Accessibility** - WCAG 2.1 compliant design
- **Modern UI Components** - Built with shadcn/ui and Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase Account** (for backend services)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/choose-your-hard.git
cd choose-your-hard
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
The project uses Supabase for backend services. Migration files are included in `/supabase/migrations/`.

To set up the database:
1. Create a new Supabase project
2. Run the migration files in order
3. Update your `.env` file with your project credentials

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:8080` to see the application running.

## 🏗️ Project Structure

```
choose-your-hard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── AchievementSystem.tsx
│   │   ├── ChallengeCard.tsx
│   │   ├── Navigation.tsx
│   │   └── ...
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useChallenges.ts
│   │   ├── useDashboard.ts
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Index.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Explore.tsx
│   │   └── Auth.tsx
│   ├── lib/                # Utilities and types
│   │   ├── supabase-types.ts
│   │   └── utils.ts
│   └── integrations/       # External service integrations
│       └── supabase/
├── supabase/
│   ├── migrations/         # Database migration files
│   └── config.toml
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🛠️ Tech Stack

### **Frontend**
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **React Router** - Client-side routing
- **React Query** - Server state management

### **Backend**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security** - Database-level security
- **Real-time subscriptions** - Live data updates

### **Development Tools**
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **Vite** - Build tool and dev server

## 📊 Database Schema

### Core Tables
- **`profiles`** - User profiles and stats
- **`challenges`** - Challenge definitions
- **`challenge_participants`** - User participation in challenges

### Key Features
- **Row Level Security (RLS)** - Secure data access
- **Real-time subscriptions** - Live updates
- **Automatic timestamps** - Created/updated tracking
- **Foreign key constraints** - Data integrity

## 🎮 Usage Guide

### For Users
1. **Sign Up** - Create your account
2. **Browse Challenges** - Explore available challenges
3. **Join Challenges** - Accept challenges that interest you
4. **Track Progress** - Log daily progress and maintain streaks
5. **Connect** - Follow friends and see their progress
6. **Achieve** - Unlock badges and climb leaderboards

### For Challenge Creators
1. **Create Challenge** - Design your own challenges
2. **Set Parameters** - Define difficulty, duration, and rewards
3. **Share** - Make challenges public for others to join
4. **Monitor** - Track participation and engagement
5. **Iterate** - Update and improve based on feedback

## 🚀 Deployment

### Production Build
```bash
npm run build
# or
yarn build
```

### Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts to deploy

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linting
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📋 Roadmap

See our comprehensive [Enhancement Roadmap](ENHANCEMENT_ROADMAP.md) for planned features and improvements.

### Upcoming Features
- **Phase 4**: Premium features, email verification, dark mode
- **Phase 5**: Friend system, real-time chat, group challenges
- **Phase 6**: Mobile app, AI recommendations, advanced analytics
- **Phase 7**: Enterprise features, API platform, integrations

## 🐛 Known Issues

- Email verification not yet implemented
- Password reset functionality pending
- Mobile app in development

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** - Beautiful component library
- **Supabase** - Excellent backend-as-a-service
- **Tailwind CSS** - Utility-first CSS framework
- **React Community** - Amazing ecosystem and support

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/choose-your-hard/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/choose-your-hard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/choose-your-hard/discussions)

## 🌟 Show Your Support

If you like this project, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 🤝 Contributing code
- 📢 Sharing with others

---

**Made with ❤️ by the Choose Your Hard team**

*Remember: Life's going to be hard no matter what. Choose your hard and make it meaningful.*
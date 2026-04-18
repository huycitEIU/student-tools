# Student Tools

Student Tools is a browser-based collection of utilities for students. It combines planning, studying, finance, conversion, and reference tools in a single Vite app with modular CSS and plain JavaScript modules.

## Features

- Weather lookup and saved locations
- Dictionary search
- Chinese vocabulary manager and search
- Practice flashcards (using Chinese Vocabulary data)
- Random number and text picker
- My Timetable planner
- Study timer with focus and break modes
- Notes manager
- Grade scale reference
- Student planner
- Unit converter
- Course calculator
- Money management
- QR generator
- Firebase Authentication (email/password sign up and sign in)
- User profile stored in Cloud Firestore

## Tech Stack

- Vite
- Vanilla JavaScript modules
- Modular CSS in `src/styles/`
- `qrcode` for QR image generation

## Getting Started

```bash
npm install
npm run dev
```

## Firebase Setup

1. Create a Firebase project in Firebase Console.
2. Enable Authentication:
	- Go to Authentication > Sign-in method.
	- Enable Email/Password provider.
3. Enable Cloud Firestore:
	- Create database in production or test mode.
	- Deploy the included rules once your project is linked.
4. Configure environment values:
	- Copy `.env.example` to `.env`.
	- Replace all `VITE_FIREBASE_*` values with your Firebase web app config.
5. Install dependencies and run:

```bash
npm install
npm run dev
```

If Firebase env variables are missing, the app still runs but auth/profile controls stay disabled.

## Firebase Hosting Deployment

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login and link project:

```bash
firebase login
firebase use --add
```

3. Build and deploy:

```bash
npm run build
firebase deploy
```

Update `.firebaserc` with your real project id before deploying.

Create a production build with:

```bash
npm run build
```

Preview the build with:

```bash
npm run preview
```

## Project Structure

```text
src/
├── main.js               # App shell and navigation
├── tools/                # Tool modules and helpers
├── styles/               # Shared and tool-specific CSS
└── style.css             # Legacy stylesheet kept for reference

docs/                     # Supporting project documentation
README.md                 # Project overview and setup
```

## Tool Groups

- Study & Planning: Study Timer, My Timetable, Student Planner, Notes
- Academics: Course Calculator, Grade Scale, Dictionary, Chinese Vocabulary, Practice
- Utilities: Weather, Unit Converter, Random, QR Generator
- Finance: Money Management

## Adding a Tool

1. Create a tool module in `src/tools/`.
2. Export it from `src/tools/index.js`.
3. Add its icon and description in `src/main.js`.
4. Add a matching stylesheet in `src/styles/tools/` if needed.
5. Import the stylesheet in `src/styles/index.css`.

See the docs in `docs/` for architecture and workflow notes.

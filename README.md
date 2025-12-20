# 🌿 HealthAssist: Welcome!

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

**Health-Assist** is a smart web app that is your personal AI health companion. It takes your symptoms, an optional blood report (PDF), and a few demographic details, then generates a structured health analysis and helpful advice using advanced LLMs (like Gemini or OpenAI models). 
---

## 🎥 Demo
[[CLICK HERE TO TRY HealthAssist!](https://health-assist-rose.vercel.app/)]

[[Or Watch the demo]](https://drive.google.com/file/d/1iDCuAI80BAPXX9SEevZUiGiGj2ut6r4r/view?usp=sharing)


## 🚀 Features

✨ **Smart Health Analysis** — Understand your symptoms through AI-generated insights  
📊 **Blood Report Upload** — Get deeper context-aware feedback  
🧠 **LLM Integration** — Powered by OpenAI or Gemini (LLM)  
🖥️ **Modern Stack** — React + FastAPI for speed and simplicity  
🌑 **Dark & Modern UI** — Smooth animations and elegant dark scrollbars  
☁️ **Cloud Database** — Integrated with postgreSQL to save your session search history

---

## 🧩 Tech Stack

| Component      | Technology                                     |
| -------------- | ---------------------------------------------- |
| **Frontend**   | React (Vite), Tailwind CSS                     |
| **Backend**    | FastAPI (Python)                               |
| **Database**   | PostgreSQL                                     |
| **AI Model**   | Google Gemini API/Compatible with OpenAI API   |
| **Deployment** | Vercel (Frontend), Render (Backend & Database) |

---
## ⚙️ Local Development Setup

To run this project on your local machine, you'll need Git, Python, Node.js, and Docker installed.

### 1. Clone the Repository

```bash
git clone https://github.com/primetree2/HealthAssist.git
cd HealthAssist
```
## ⚙️ Setup Guide 

## 2. Backend Setup (FastAPI & PostgreSQL)
The backend uses a PostgreSQL database. The recommended way to run it locally is with Docker.

Start the Database: This command reads the docker-compose.yml file and starts a PostgreSQL container in the background.

```bash
docker-compose up -d
```
Configure Backend Environment: Navigate to the backend folder, copy the example environment file, and fill in your API key.

```bash
cd backend
cp .env.example .env
```
Now, open backend/.env and add your GOOGLE_API_KEY. The DATABASE_URL is already set up for the local Docker container.

Install Dependencies & Run Server:

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Your backend is now running at http://localhost:8000.

---

### 💻 Frontend Setup
Configure Frontend Environment: In a new terminal, navigate to the frontend directory. Create a development environment file.

```bash
cd frontend
echo 'VITE_API_BASE_URL="http://localhost:8000"' > .env.development
```
Install Dependencies & Run:

```bash
npm install
npm run dev
```
Your frontend development server is now running at http://localhost:5173.

---

## 🧑‍💻 Developer Notes

- Make sure your backend is running before starting the frontend.
- Your `.env` file **should not** be committed to GitHub (add it to `.gitignore`).
- The app uses Axios for communication between React and FastAPI.
- To update UI elements like scrollbars, modify `src/index.css`.

---

## 📚 Project Structure

```
HealthAssist/
│
├── backend/
│   ├── app/
│   │   ├── crud.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── utils.py
│   │
│   ├── __pycache__/        # Cached Python files
│   ├── HealthAssist.db     # SQLite database              
│   └── requirements.txt
│
├── frontend/
│   ├── build/              # Production build output
│   ├── node_modules/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuroraBackground.jsx
│   │   │   ├── AuroraTitle.css
│   │   │   ├── AuroraTitle.jsx
│   │   │   ├── DemographicsForm.jsx
│   │   │   ├── LoadingBar.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── SymptomForm.jsx
│   │   │   └── Typewriter.jsx
│   │   │
│   │   ├── pages/
│   │   │   └── History.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.cjs
│   ├── tailwind.config.cjs
│   └── vite.config.js
│
│── .env 
├── venv/                   # Python virtual environment
├── .gitignore
├── LICENSE
└── README.md

```

---

## 💡 Example Workflow

1. Enter your basic demographic info  
2. Type your symptoms  
3. Optionally upload your blood report (PDF)  
4. Click **Analyze**  
5. Receive a detailed AI-generated diagnosis summary and advice  
6. Review previous analyses anytime in **History**

---

## 👨‍💻 Developed and Maintained By

**Harsh Raj** — [@primetree2](https://github.com/primetree2)  
*Greetings! I am Harsh Raj, a final year CSE student at VIT-AP University and a passionate developer. I like to develop creative and innovative web applications. Healthcare is also one of my interests. I hope you will enjoy this app. Remember that this app is not a substitute for professional medical advice. Use cautiously. Feel free to provide any feedbacks and suggestions. My e-mail ID is myselfharshr@gmail.com.*

---

> “Your health, assisted by intelligence.” 🩺🤖

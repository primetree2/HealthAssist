# 🌿 HealthAssist: Welcome!

**HealthAssist** is a smart web app and your personal AI health companion. It takes your symptoms, an optional blood report (PDF), and a few demographic details, then generates a structured health analysis and helpful advice using advanced LLMs (like Gemini or OpenAI models). 
---

## 🎥 Demo

[[Watch the demo]](https://drive.google.com/file/d/1iDCuAI80BAPXX9SEevZUiGiGj2ut6r4r/view?usp=sharing)


## 🚀 Features

✨ **Smart Health Analysis** — Understand your symptoms through AI-generated insights  
📊 **Blood Report Upload** — Get deeper context-aware feedback  
🧠 **LLM Integration** — Powered by OpenAI or Gemini (LLM) 
🗂️ **History Tracking** — Check your previous searches
🖥️ **Modern Stack** — React + FastAPI + SQLite for speed and simplicity  
🌑 **Dark & Modern UI** — Smooth animations and elegant dark scrollbars  

---

## 🧩 Tech Stack

| Part | Technology |
|------|-------------|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite |
| AI Models | OpenAI / Gemini APIs |
| Deployment | Vercel (frontend) + Render / Railway (backend) |

---

## ⚙️ Setup Guide 

### 🔧 Backend Setup

```bash
# 1. Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Setup environment variables
cp backend/.env.example backend/.env
# Add your API key inside backend/.env:
# OPENAI_API_KEY=your_secret_key

# 4. Start the FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```

---

### 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

🧭 The app will run on `http://localhost:5173` and automatically proxy API requests to `http://localhost:8000` (configured in `vite.config.js`).

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

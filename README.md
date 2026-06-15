# BigQuery Release Notes Dashboard & Twitter Sharing App

A premium web application built with **Python Flask** and **Vanilla HTML5, CSS3, and JavaScript** that parses, displays, and shares Google Cloud BigQuery release updates from the official RSS/Atom feed.

## 🚀 Live Demo & Repository
* **GitHub Repository**: [https://github.com/ewyuen/antigravity-event-talks-app](https://github.com/ewyuen/antigravity-event-talks-app)
* **Local Dev Server**: [http://127.0.0.1:5000/](http://127.0.0.1:5000/) (when running locally)

---

## ✨ Main Features
* 📊 **Granular Releases Grid**: Automatically parses the multi-update Atom feed and splits daily releases into individual cards (Features, Changes, Deprecations) for cleaner readability.
* ⚡ **Smart Caching Layer**: Implements a 10-minute in-memory cache on the Flask backend to avoid redundant calls to Google's servers.
* 🔄 **Manual Force-Refresh**: A refresh button with an active spinner allows users to bypass the cache and fetch the feed live (`?force=true`).
* 🔍 **Real-time Filtering & Search**: Filter updates immediately by type (Features, Changes, Deprecations) and search content text dynamically.
* 🐦 **Interactive Tweet Composer**: Compose and edit tweets within a glassmorphic modal dashboard. Features an automatic character-budget truncation calculator (keeping tweets under the 280-character limit with links and hashtags intact) and hooks into the **Twitter/X Web Intent** interface.
* 🌗 **Theme Switching Support**: Features a sleek, high-end dark theme (Google Cloud inspired gradients and glows) with a built-in light mode toggle.

---

## 🛠️ Tech Stack
* **Backend**: Python 3.13+, Flask 3.0.3, XML ElementTree (standard library)
* **Frontend**: HTML5, Vanilla CSS3 (custom CSS design variables, glassmorphism), Vanilla ES6 JavaScript (State Management, DOM parsing)
* **API Integration**: Twitter Web Intent API, Google Cloud Feed RSS (Atom namespace)

---

## 📁 Directory Structure
```text
bigquery_releasenotes_app/
│
├── app.py                  # Flask backend, XML parser, caching router
├── requirements.txt        # Flask dependency list
├── .gitignore              # Ignores byte caches, IDE configs, virtual environments
├── README.md               # Project overview and instructions
│
├── templates/
│   └── index.html          # Semantic HTML layout and Tweet Modal DOM
│
└── static/
    ├── css/
    │   └── style.css       # Custom design system styles & animations
    └── js/
        └── main.js         # Frontend lifecycle, filtering logic, tweet calculators
```

---

## ⚙️ Installation & Setup

### Prerequisites
* Python 3.10+
* Git

### Step-by-Step Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ewyuen/antigravity-event-talks-app.git
   cd antigravity-event-talks-app
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the application**:
   ```bash
   python app.py
   ```

6. Open your browser and navigate to:
   👉 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🔄 How the Tweeting Logic Works
To prevent drafts from failing to send due to character limits:
1. When you select a card and click **Tweet**, a JS calculator measures the structural parameters:
   `Structural Length = Prefix (Metadata) + Suffix (Docs link & hashtags)`
2. The remaining body allowance is calculated:
   `Allowed Body = 280 - Structural Length`
3. The release description text is safely sliced to fit the `Allowed Body` size and appended with `...` if it overflows.
4. An interactive circular progress ring gauges the character count limit and warns you (turns orange/red) if you add too many characters manually.
5. Clicking **Post on X** uses the Web Intent endpoint (`https://twitter.com/intent/tweet?text=`) to safely open a new tab containing the draft.

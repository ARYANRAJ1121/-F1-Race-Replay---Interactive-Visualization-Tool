# 🏎️ F1 Race Replay - Interactive Visualization Tool

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![FastF1](https://img.shields.io/badge/FastF1-E10600?style=for-the-badge&logo=f1&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**An interactive Formula 1 race visualization and data analysis tool built with Python and modern web technologies.**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [API Documentation](#-api-documentation) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📖 About The Project

F1 Race Replay is a comprehensive data visualization platform that allows you to explore and analyze Formula 1 race data in an interactive and visually engaging way. Using real telemetry data from the FastF1 library, this tool provides insights into race strategies, driver performance, and lap-by-lap analysis.

Whether you're a data analyst, F1 enthusiast, or aspiring motorsport engineer, this tool offers a unique way to understand the intricacies of Formula 1 racing.

### 🎯 Key Highlights

- **Real F1 Data**: Access actual telemetry, lap times, and race data from 2018 onwards
- **Interactive Visualization**: Watch race replays with car positions on track
- **Telemetry Analysis**: View speed, throttle, brake, gear, and DRS data in real-time
- **Modern UI**: Beautiful dark-themed interface inspired by F1's premium aesthetics
- **RESTful API**: Well-documented API for programmatic access to F1 data

---

## ✨ Features

### 🏁 Race Data

- View complete race schedules from 2018-2026
- Access all session types (FP1, FP2, FP3, Qualifying, Sprint, Race)
- Get detailed session results with driver standings

### 📊 Telemetry & Analytics

- **Speed Data**: Real-time speed visualization up to 370+ km/h
- **Throttle & Brake**: Pedal input analysis throughout laps
- **Gear Changes**: Visualize gear shifts across the track (1-8 gears)
- **DRS Detection**: See when DRS is activated
- **RPM Display**: Engine RPM with visual light indicators
- **Sector Times**: Compare performance across track sectors

### 🛣️ Track Visualization

- Canvas-based track rendering using GPS telemetry coordinates
- Real-time car position tracking for race replay
- Support for all 24 F1 circuits worldwide
- Interactive car selection with hover effects
- Team-colored car markers

### 👥 Driver Information

- Complete driver lineup for each season (20 drivers)
- Team colors matching official F1 liveries
- Position-based sorting and display
- Click to select and view telemetry

### 🎮 Playback Controls

- Play/Pause race replay
- Adjustable playback speed (0.25x - 4x)
- Timeline scrubbing
- Lap-by-lap navigation

---

## 🖥️ Demo

### API Documentation (Swagger UI)

Once the server is running, access the interactive API documentation at:

```
http://127.0.0.1:8080/docs
```

### Sample API Responses

**Get Available Seasons:**

```json
{
  "seasons": [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  "total": 9,
  "recommended": [2024, 2025, 2026],
  "note": "Full telemetry available from 2018 onwards"
}
```

**Get Race Schedule:**

```json
{
  "season": 2024,
  "races": [
    {"round": 1, "name": "Bahrain Grand Prix", "country": "Bahrain"},
    {"round": 2, "name": "Saudi Arabian Grand Prix", "country": "Saudi Arabia"},
    ...
  ],
  "total_races": 24
}
```

---

## 🚀 Installation

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/ARYANRAJ1121/-F1-Race-Replay---Interactive-Visualization-Tool.git
cd -F1-Race-Replay---Interactive-Visualization-Tool
```

### Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Start the Backend Server

```bash
cd backend
python -m uvicorn main:app --reload --port 8080
```

### Step 4: Access the Application

- **API Documentation**: <http://127.0.0.1:8080/docs>
- **Health Check**: <http://127.0.0.1:8080/health>

---

## 📡 API Documentation

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome message & API status |
| GET | `/health` | Health check with component status |
| GET | `/api/seasons` | Get available F1 seasons |
| GET | `/api/races/{season}` | Get race schedule for a season |
| GET | `/api/session/{season}/{round}/{type}` | Get session data (FP1, FP2, FP3, Q, S, R) |
| GET | `/api/laps/{season}/{round}/{type}` | Get lap-by-lap data |
| GET | `/api/telemetry/{season}/{round}/{type}/{driver}` | Get driver telemetry |
| GET | `/api/track/{season}/{round}` | Get track coordinates |
| GET | `/api/drivers/{season}` | Get driver lineup |

### Query Parameters

- `driver` - Filter by driver code (e.g., VER, HAM, LEC)
- `fastest_only` - Return only fastest laps
- `lap_number` - Get specific lap telemetry
- `session_type` - Specify session type for track data

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Core programming language |
| **FastAPI** | Modern, high-performance web framework |
| **FastF1** | Official F1 telemetry and timing data library |
| **Uvicorn** | ASGI server for production |
| **Pandas** | Data manipulation and analysis |
| **NumPy** | Numerical computations |

### Frontend

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic markup structure |
| **CSS3** | Modern styling with CSS variables |
| **JavaScript (ES6+)** | Interactive functionality |
| **Canvas API** | Track and car visualization |

### Data Source

- **FastF1 Library**: Connects to official F1 timing data
- **Ergast API**: Historical race data
- **Cached locally**: Faster subsequent requests

---

## 📁 Project Structure

```
F1-Race-Replay/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── services/
│   │   ├── __init__.py         # Package exports
│   │   └── f1_data_service.py  # FastF1 data fetching & processing
│   └── __pycache__/
├── frontend/
│   ├── index.html              # Main HTML structure
│   ├── css/
│   │   └── styles.css          # Dark theme styling
│   └── js/
│       ├── api.js              # API communication layer
│       ├── utils.js            # Utility functions & helpers
│       ├── trackRenderer.js    # Canvas track visualization
│       ├── telemetry.js        # Telemetry display handler
│       └── app.js              # Main application logic
├── cache/
│   └── fastf1/                 # Cached F1 data
├── requirements.txt            # Python dependencies
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```

---

## 🔧 Configuration

### Environment Variables (Optional)

```bash
# API Configuration
API_HOST=127.0.0.1
API_PORT=8080

# Cache Directory
FASTF1_CACHE_DIR=./cache/fastf1
```

### Changing the API Port

If port 8080 is in use, start with a different port:

```bash
python -m uvicorn main:app --reload --port 9000
```

---

## 🗺️ Roadmap

### ✅ Completed Features

- [x] Backend API with FastF1 integration
- [x] Season and race schedule endpoints
- [x] Session data with driver results
- [x] Telemetry data extraction (speed, throttle, brake, gear, DRS, RPM)
- [x] Track coordinates extraction from GPS data
- [x] Frontend HTML structure with responsive layout
- [x] Dark theme CSS styling with glassmorphism effects
- [x] API communication layer with error handling
- [x] Track canvas visualization with team colors
- [x] Race replay with car positions on track
- [x] Real-time telemetry display with animated bars
- [x] Interactive driver selection
- [x] Playback controls (play/pause, speed, timeline)

### 🔮 Future Enhancements

- [ ] Driver comparison mode (side-by-side telemetry)
- [ ] Lap time analysis charts
- [ ] Sector-by-sector breakdown
- [ ] Race strategy timeline
- [ ] Weather data integration
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Aryan Raj**

- GitHub: [@ARYANRAJ1121](https://github.com/ARYANRAJ1121)

---

## 🙏 Acknowledgments

- [FastF1](https://theoehrly.github.io/Fast-F1/) - The amazing F1 data library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- Formula 1® - For the incredible sport and data

---

<div align="center">

**⭐ Star this repository if you find it useful! ⭐**

Made with ❤️ and 🏎️ by Aryan Raj

</div>

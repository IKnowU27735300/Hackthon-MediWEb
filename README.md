# 🏥 MediWeb - Intelligent Clinical Management System

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-v12-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

**MediWeb** is a high-performance, full-stack clinical management platform designed to bridge the gap between doctors, assistants, and patients. Built for a high-intensity hackathon environment, it combines real-time data synchronization with a premium, sleek user interface.

---

## ✨ Key Features

- 🌓 **Dynamic Theme Engine**: Seamlessly switch between a deep professional dark mode and a crisp, bluish-white light theme.
- 📅 **Advanced Appointment Engine**: Real-time booking system with Google Calendar integration and automated patient onboarding.
- 👨‍⚕️ **Role-Based Dashboards**:
  - **Doctor Dashboard**: High-level clinic analytics, patient oversight, and delegation.
  - **Assistant Dashboard**: Task-focused interface for intake form reviews and medical log management.
  - **Supplier Dashboard**: Inventory tracking with intelligent low-stock alerts.
- 💬 **Integrated Clinical Messaging**: Secure real-time chat between staff and automated patient notification system.
- 📦 **Smart Inventory Management**: Automated stock tracking tied directly to clinical procedures.
- 📝 **Digital Intake & Medical Records**: Paperless patient onboarding with secure cloud storage.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS (Custom Design System)
- **Animations**: Framer Motion for premium micro-animations
- **Icons**: Lucide React
- **Authentication & Database**: Firebase (Auth & Firestore)

### Backend
- **API Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL (Development Engine)
- **Automation**: Custom clinical event triggers (SMS/Email simulation)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Firebase Account

### Installation

1. **Clone the Repo**
   ```bash
   git clone https://github.com/your-username/Hackthon-MediWEb.git
   cd Hackthon-MediWEb
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   python main.py
   ```

---

## 🛡️ Security
The project implements granular **Firestore Security Rules** to ensure that medical records are only accessible to authorized clinical staff while keeping the patient booking portal public and accessible.

---

## 🎨 UI Aesthetics
MediWeb prioritizes **Rich Aesthetics**. Using curated HSL color palettes, glassmorphism effects, and smooth transitions, the platform provides a premium "Software-as-a-Service" feel out of the box.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the Medical Community
</p>

# Tech Stack: The Engine Behind MediWeb

This document explains the "engine" of MediWeb in simple terms, focusing on how our technical choices benefit the clinic and its patients.

---

## 1. Frontend: The "Face" (Next.js & React)
We use **Next.js**, a powerful framework by Vercel, to build the user interface.
*   **Why for a non-tech person?** It makes the website feel extremely fast. Instead of loading a whole new page every time you click a button, Next.js only updates the part of the screen that needs to change.
*   **Business Benefit**: High performance leads to less frustration for doctors and a more professional image for the clinic.

---

## 2. Backend: The "Brain" (FastAPI & Python)
Our background processes are handled by **FastAPI**, a modern, high-speed framework for building APIs.
*   **Why for a non-tech person?** It acts as the traffic controller. When a doctor clicks "Order Supplies," FastAPI ensures that request goes to the right supplier securely and quickly.
*   **Business Benefit**: It is highly reliable and can handle thousands of requests simultaneously as the clinic grows.

---

## 3. Database: The "Memory" (Firebase & Firestore)
We use **Google Firebase** for our real-time database and authentication.
*   **Why for a non-tech person?** Traditional databases are like filing cabinets where you have to go look for a file. Firebase is like a live chat – as soon as someone writes something, everyone else sees it instantly.
*   **Business Benefit**: Real-time synchronization. When a supplier accepts an order, the doctor sees the update on their screen *immediately* without refreshing.

---

## 4. Styling: The "Style" (Tailwind CSS)
The beautiful looks are powered by **Tailwind CSS**.
*   **Why for a non-tech person?** It allows us to build unique, custom designs very quickly without using generic "out-of-the-box" templates.
*   **Business Benefit**: It makes the app fully responsive, meaning it looks just as beautiful on a large clinic monitor as it does on a tablet or phone.

---

## 5. Deployment: The "Home" (Docker & Railway/Vercel)
The app is "containerized" using **Docker**.
*   **Why for a non-tech person?** Docker packages the app in a "box" so it runs exactly the same way on any computer in the world.
*   **Business Benefit**: Easy to scale and very low risk of the "it works on my machine but not yours" problem.

---

## 6. Security Summary
*   **Encryption**: All patient data is encrypted during transit.
*   **Authentication**: Secure login system powered by Google's industry-standard security protocols.
*   **Role-Based Access**: A supplier can never see a patient's medical history; a doctor can never see a supplier's private bank details.

# Self-Hosting & Running Locally

Mesh Notes has minimal system requirements. It runs on a low-cost $5/mo VPS, a Raspberry Pi, or your local laptop.

---

## System Requirements

- **Node.js**: v18.0.0 or later
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Less than 100 MB RAM
- **Disk Space**: ~30 MB for application files + your notes storage

---

## Quick Start (Run Locally)

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/mesh-notes.git
cd mesh-notes
npm install
npm --prefix client install
```

Build the production frontend assets:

```bash
npm run build
```

Start the unified server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The first account created is automatically granted administrator privileges.

---

## Custom Port Configuration

Mesh Notes checks for a `port.txt` file in the project root:
- To run on a specific port (for example, `8080`), simply write the number to `port.txt`:
  ```bash
  echo "8080" > port.txt
  npm start
  ```
- If no port is specified or the port is busy, Mesh Notes automatically detects the next available port and saves it.

---

## Backing Up Your Database

All application data lives in a single SQLite database file:

```
mesh-notes/
  └── data/
      ├── mesh-notes.db          # Main SQLite database
      └── uploads/               # User uploaded images & receipts
```

To backup your data, copy the `data/` folder to a secure location, or use the 1-click **Download ZIP Archive** button in the Settings modal.

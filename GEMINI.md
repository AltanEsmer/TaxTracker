# Project Overview

**Tax Tracker** is an Electron-based desktop application with a React frontend, designed for invoice management and VAT tracking ("Fatura Kayıt ve KDV Takip Uygulaması").

## Architecture & Technologies
- **Frontend:** React 18, Ant Design for UI components, Chart.js for data visualization, React Router for navigation.
- **Backend/Desktop:** Electron, Node.js.
- **Database:** Local JSON files (`invoices.json` and `fxrates.json`). The application uses a custom `DatabaseManager` in `database.js` to handle data persistence directly to the user's `AppData` directory.
- **IPC (Inter-Process Communication):** The application relies on `ipcMain.handle` in `main.js` and a `preload.js` script to securely expose database operations to the React frontend.
- **Build Tooling:** Electron Forge and Electron Builder are used for packaging the application.

## Building and Running

### Development
To start the application in development mode (starts both the React development server and the Electron app):
```bash
npm run dev
```

### Production Build
To build the React application and package the Electron application for distribution:
```bash
npm run build
```

*Other available scripts:*
- `npm start`: Simply runs `electron .` (assuming the React app is already built or running).
- `npm run react-start`: Starts only the React frontend on `localhost:3000`.
- `npm run make` or `npm run package`: Uses Electron Forge for packaging.

## Development Conventions
- **Main Process:** Entry point is `main.js`. It manages window creation, system tray interactions, and IPC handlers.
- **Data Management:** All CRUD operations are managed by `database.js`, which reads and writes to JSON files. It also handles data migration from development to production paths.
- **Language:** The application interface and documentation are primarily in Turkish.
- **Autostart:** The application includes a script (`scripts/autostart-setup.js`) to configure Windows autostart behavior, allowing it to start on boot and minimize to the system tray.
- **Styling:** CSS is used alongside Ant Design components.

## Notes: 
- Be concise when explaining something to developer.
- Use sub-agents when needed for parallel development to speed up the process.
- If have any question or uncertainty, ask developer first for verification or brainstroming.
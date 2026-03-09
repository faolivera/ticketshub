  import { createRoot } from "react-dom/client";
  import { HelmetProvider } from "react-helmet-async";
  import App from "./app/App.tsx";
  import { configService } from "./api/services/config.service";
  import { initAnalytics } from "./config/analytics";
  import "./styles/index.css";

  configService
    .getAppEnvironment()
    .then((res) => initAnalytics(res.environment))
    .catch(() => {});

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
  
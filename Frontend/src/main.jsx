import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { VisitProvider } from "./context/VisitContext";
import { CartProvider } from "./context/CartContext";
import store from "./store";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <VisitProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </VisitProvider>
    </Provider>
  </StrictMode>
);

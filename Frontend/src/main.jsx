import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import App from "./App";
import { VisitProvider } from "./context/VisitContext";
import { CartProvider } from "./context/CartContext";
import store from "./store";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <VisitProvider>
        <CartProvider>
          <App />
          <ToastContainer position="top-center" autoClose={2500} hideProgressBar newestOnTop />
        </CartProvider>
      </VisitProvider>
    </Provider>
  </StrictMode>
);

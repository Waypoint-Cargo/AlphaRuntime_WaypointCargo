import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { restoreSession } from "./modules/auth";

// Restore the session once per page load, before the first render: the in-memory access
// token is gone after a reload, so trade the httpOnly refresh cookie for a new one.
// The route guards show a spinner until this settles. Doing it here (not in an effect)
// keeps StrictMode from firing it twice and burning the single-use refresh token.
store.dispatch(restoreSession());

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </Provider>
    </StrictMode>,
);

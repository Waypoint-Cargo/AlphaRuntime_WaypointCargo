import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import Login from "./modules/auth/pages/Login.jsx";
import { restoreSession, selectIsAuthenticated, selectIsInitialized } from "./modules/auth";
import OrderPage from "./modules/store_manager/Orders/OrderPage.jsx";
import CreateOrderPage from "./modules/store_manager/Orders/CreateOrderPage.jsx";

// The sidebar links are plain hash anchors (#create, #orders, ...).
const readRoute = () => window.location.hash.replace("#", "") || "orders";

function useHashRoute() {
    const [route, setRoute] = useState(readRoute);
    useEffect(() => {
        const onChange = () => setRoute(readRoute());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);
    return route;
}

function App() {
    const route = useHashRoute();
    const dispatch = useDispatch();
    const isInitialized = useSelector(selectIsInitialized);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    // useEffect(() => {
    //     dispatch(restoreSession());
    // }, [dispatch]);

    // if (!isInitialized) {
    //     return (
    //         <div style={{
    //             minHeight: "100vh",
    //             display: "grid",
    //             placeItems: "center",
    //             background: "#f3f4f6",
    //             color: "#1f2937",
    //             fontSize: "1rem",
    //             fontWeight: 600,
    //         }}>
    //             Initializing session...
    //         </div>
    //     );
    // }

    if (!isAuthenticated) return <Login />;
    return route === "create" ? <CreateOrderPage /> : <OrderPage />;
}

export default App;

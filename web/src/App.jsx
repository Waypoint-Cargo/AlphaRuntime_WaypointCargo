import "./App.css";
import MainLayout from "./shared/layouts/MainLayout";
import UserProfile from "./modules/profile/pages/UserProfile";

function App() {
    return (
        <MainLayout>
            <UserProfile />
        </MainLayout>
    );
}

export default App;

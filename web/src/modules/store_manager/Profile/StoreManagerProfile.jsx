import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import UserProfile from "@/modules/profile/pages/UserProfile";

// The shared profile screen inside the Store Manager shell (the Dispatcher renders the same
// screen inside its own MainLayout). "profile" matches no sidebar item, so none is highlighted.
export default function StoreManagerProfile() {
  return (
    <div className="app">
      <TopBar />
      <Sidebar active="profile" />
      <main className="workspace">
        <div className="main-col">
          <UserProfile />
        </div>
      </main>
    </div>
  );
}

import NavigationBar from "../components/NavigationBar";
import "./MainLayout.css";

function MainLayout({ children }) {
  return (
    <div className="app">
      <NavigationBar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default MainLayout;


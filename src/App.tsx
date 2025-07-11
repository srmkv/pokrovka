import SideBar from "./components/SideBar";
import MainContent from "./components/MainContent";
import NotificationCenter from "./components/NotificationCenter";
import { LeakSensorsProvider } from "./components/Water/LeakSensorsContext";
const App = () => {
  return (
    <LeakSensorsProvider>
    <div className="flex w-full h-screen">
      {/* Сайдбар с фоном */}
      <aside className="max-w-[430px] min-w-[320px] h-screen bg-[#100E1D]">
        <SideBar />
      </aside>
      {/* MainContent только с вертикальным скроллом и кастомным скроллом */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#181825] custom-scroll">
        <MainContent />
        <NotificationCenter />
    
      </main>
    </div>
    </LeakSensorsProvider>
  );
};

export default App;

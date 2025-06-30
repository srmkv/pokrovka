import SideBar from "./components/SideBar";
import MainContent from "./components/MainContent";

const App = () => {
  return (
    <div className="flex w-full h-screen">
      {/* Сайдбар с фоном */}
      <aside className="max-w-[430px] min-w-[320px] h-screen bg-[#100E1D]">
        <SideBar />
      </aside>
      {/* MainContent только с вертикальным скроллом и кастомным скроллом */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#181825] custom-scroll">
        <MainContent />
      </main>
    </div>
  );
};

export default App;

import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Welcome from './pages/Welcome';
import StudentLayout from './layouts/StudentLayout';
import CounselorLayout, { ObservatoryIndex } from './layouts/CounselorLayout';
import StudentReport from './pages/counselor/StudentReport';
import NightSkyPage from './pages/student/NightSky';
import CheckInPage from './pages/student/CheckIn';
import TelescopePage from './pages/student/Telescope';
import MeteorPage from './pages/student/Meteor';
import LettersPage from './pages/student/Letters';
import ChallengePage from './pages/student/Challenge';
import CodexPage from './pages/student/Codex';
import PlanetMissionsPage from './pages/student/PlanetMissions';
import CouragePage from './pages/student/Courage';
import EmotionPartsPage from './pages/student/practice/EmotionParts';
import BodyScanPage from './pages/student/practice/BodyScan';
import ThinkingTrapsPage from './pages/student/practice/ThinkingTraps';
import VoyageManualPage from './pages/student/practice/VoyageManual';
import VoyageMapPage from './pages/student/VoyageMap';
import DevResetButton from './components/DevResetButton';
import ConfirmHost from './components/ConfirmHost';

/**
 * 개발할 때는 주소창 경로(BrowserRouter)를 쓰고,
 * 공유 링크(Artifact)용 빌드(VITE_ROUTER=memory)에서는 주소를 건드리지 않는 MemoryRouter를 쓴다.
 * 공유 링크 안에서는 주소 경로나 #/경로가 오가지 않기 때문이다.
 */
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="sky" replace />} />
            <Route path="sky" element={<NightSkyPage />} />
            <Route path="checkin" element={<CheckInPage />} />
            <Route path="telescope" element={<TelescopePage />} />
            <Route path="meteor" element={<MeteorPage />} />
            <Route path="map" element={<VoyageMapPage />} />
            <Route path="planet/:planetId" element={<PlanetMissionsPage />} />
            <Route path="courage" element={<CouragePage />} />
            <Route path="practice/emotion-parts" element={<EmotionPartsPage />} />
            <Route path="practice/body-scan" element={<BodyScanPage />} />
            <Route path="practice/thinking-traps" element={<ThinkingTrapsPage />} />
            <Route path="practice/manual" element={<VoyageManualPage />} />
            <Route path="challenge" element={<ChallengePage />} />
            <Route path="codex" element={<CodexPage />} />
            <Route path="letters" element={<LettersPage />} />
          </Route>
          <Route path="/observatory" element={<CounselorLayout />}>
            <Route index element={<ObservatoryIndex />} />
            <Route path=":studentId" element={<StudentReport />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DevResetButton />
        <ConfirmHost />
      </Router>
    </AppProvider>
  );
}

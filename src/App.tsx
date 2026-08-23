/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider, useAppContext } from './store';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';

function MainApp() {
  const { state } = useAppContext();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-200 font-sans">
      {state.currentProject ? <Editor /> : <Dashboard />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

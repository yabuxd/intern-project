import { API_PREFIX } from '@intern/shared';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';

function App() {
  return (
    <AppLayout>
      <HomePage apiPrefix={API_PREFIX} />
    </AppLayout>
  );
}

export default App;

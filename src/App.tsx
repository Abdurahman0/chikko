import { RouterProvider } from 'react-router-dom';
import { appRouter } from './app/routes/app-router';

function App() {
  return <RouterProvider router={appRouter} />;
}

export default App;


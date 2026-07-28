import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        {/* Navbar placeholder */}
        <nav>Gaming Platform</nav>
      </header>

      <main className="flex-1 p-4">
        <Outlet />
      </main>

      <footer className="border-t p-4 text-sm text-gray-500">
        {/* Footer placeholder */}
        &copy; {new Date().getFullYear()} Gaming Platform
      </footer>
    </div>
  );
}
